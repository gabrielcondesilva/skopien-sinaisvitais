-- ============================================================================
-- SKOPIEN — Schema do banco de dados
-- Banco alvo: PostgreSQL (instância por cliente)
--
-- Tabelas:
--   unidades               leitos                 pacientes
--   alergias               triagens               internacoes
--   ocupacoes_leito        afericoes_minuto        ews_scores
--   alertas                decisoes_medicas        agendamentos_cirurgicos
--   etapas_fluxo_cirurgico medicamentos            prescricoes
--   administracoes_medicamento  usuarios           log_acessos
--   predicoes_internacao   predicoes_ews           ingestao_watermark
-- ============================================================================


-- ============================================================================
-- BLOCO 1 — REFERÊNCIA: UNIDADES E LEITOS
-- ============================================================================

CREATE TABLE unidades (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        TEXT NOT NULL,
    tipo        TEXT NOT NULL,
    ativa       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unidades_tipo_chk CHECK (tipo IN ('UTI','ENFERMARIA','PS','CC'))
);

CREATE TABLE leitos (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id  BIGINT NOT NULL REFERENCES unidades(id),
    codigo      TEXT NOT NULL,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT leitos_codigo_unq UNIQUE (unidade_id, codigo)
);


-- ============================================================================
-- BLOCO 2 — PACIENTES, ALERGIAS E TRIAGEM (fonte: HIS)
-- ============================================================================

CREATE TABLE pacientes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his  TEXT NOT NULL UNIQUE,
    nome            TEXT NOT NULL,
    data_nascimento DATE,
    sexo            CHAR(1),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alergias (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id     BIGINT NOT NULL REFERENCES pacientes(id),
    substancia      TEXT NOT NULL,
    tipo            TEXT NOT NULL,
    reacao          TEXT,
    gravidade       TEXT NOT NULL DEFAULT 'DESCONHECIDA',
    id_externo_his  TEXT,
    registrado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT alergias_tipo_chk     CHECK (tipo IN ('MEDICAMENTO','ALIMENTO','OUTRO')),
    CONSTRAINT alergias_grav_chk     CHECK (gravidade IN ('LEVE','MODERADA','GRAVE','DESCONHECIDA'))
);

CREATE INDEX alergias_paciente_idx ON alergias (paciente_id);

CREATE TABLE triagens (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id      BIGINT NOT NULL REFERENCES pacientes(id),
    realizado_em     TIMESTAMPTZ NOT NULL,
    manchester       TEXT NOT NULL,
    queixa_principal TEXT,
    triado_por       TEXT,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT triagens_manchester_chk
        CHECK (manchester IN ('VERMELHO','LARANJA','AMARELO','VERDE','AZUL'))
);

CREATE INDEX triagens_paciente_idx ON triagens (paciente_id, realizado_em DESC);


-- ============================================================================
-- BLOCO 3 — INTERNAÇÕES (fonte: HIS)
-- ============================================================================

CREATE TABLE internacoes (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his   TEXT NOT NULL UNIQUE,
    paciente_id      BIGINT NOT NULL REFERENCES pacientes(id),
    admissao_em      TIMESTAMPTZ NOT NULL,
    alta_em          TIMESTAMPTZ,
    diagnostico_cid  TEXT,
    diagnostico_desc TEXT,
    desfecho         TEXT,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT internacoes_desfecho_chk
        CHECK (desfecho IS NULL OR desfecho IN
               ('ALTA_MELHORADO','ALTA_A_PEDIDO','TRANSFERENCIA_EXTERNA','OBITO')),
    CONSTRAINT internacoes_datas_chk
        CHECK (alta_em IS NULL OR alta_em >= admissao_em)
);

CREATE INDEX internacoes_ativas_idx ON internacoes (paciente_id)
    WHERE alta_em IS NULL;


-- ============================================================================
-- BLOCO 4 — OCUPAÇÕES DE LEITO
-- ============================================================================
-- Ponte entre monitores (conhecem o leito) e o HIS (conhece o paciente).
-- "De quem é a aferição das 14:05 do leito 12?" → cruzar com esta tabela.

CREATE TABLE ocupacoes_leito (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leito_id      BIGINT NOT NULL REFERENCES leitos(id),
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    inicio        TIMESTAMPTZ NOT NULL,
    fim           TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ocupacoes_datas_chk CHECK (fim IS NULL OR fim >= inicio)
);

CREATE INDEX ocupacoes_leito_periodo_idx ON ocupacoes_leito (leito_id, inicio, fim);

CREATE UNIQUE INDEX ocupacoes_leito_aberta_unq ON ocupacoes_leito (leito_id)
    WHERE fim IS NULL;


-- ============================================================================
-- BLOCO 5 — SINAIS VITAIS (fonte: Monitores SKOPIEN)
-- ============================================================================
-- Granularidade: 1 minuto. Particionado por mês.
-- Volume estimado: 100 leitos × 7 sinais × 1440 min ≈ 1M linhas/dia.

CREATE TABLE afericoes_minuto (
    leito_id     BIGINT NOT NULL REFERENCES leitos(id),
    sinal        TEXT NOT NULL,
    minuto       TIMESTAMPTZ NOT NULL,
    media        NUMERIC(7,2) NOT NULL,
    minimo       NUMERIC(7,2) NOT NULL,
    maximo       NUMERIC(7,2) NOT NULL,
    qtd_leituras SMALLINT NOT NULL,

    PRIMARY KEY (leito_id, sinal, minuto),

    CONSTRAINT afericoes_sinal_chk
        CHECK (sinal IN ('FC','FR','PAS','PAD','SPO2','TEMP','AVPU'))
) PARTITION BY RANGE (minuto);

CREATE TABLE afericoes_minuto_2026_06 PARTITION OF afericoes_minuto
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE afericoes_minuto_2026_07 PARTITION OF afericoes_minuto
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE INDEX afericoes_leito_tempo_idx ON afericoes_minuto (leito_id, minuto DESC);


-- ============================================================================
-- BLOCO 6 — EWS, ALERTAS E DECISÕES CLÍNICAS
-- ============================================================================

CREATE TABLE ews_scores (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    leito_id      BIGINT NOT NULL REFERENCES leitos(id),
    calculado_em  TIMESTAMPTZ NOT NULL,
    score         SMALLINT NOT NULL,
    componentes   JSONB,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ews_internacao_tempo_idx ON ews_scores (internacao_id, calculado_em DESC);
CREATE INDEX ews_leito_tempo_idx      ON ews_scores (leito_id, calculado_em DESC);

CREATE TABLE alertas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leito_id        BIGINT NOT NULL REFERENCES leitos(id),
    internacao_id   BIGINT REFERENCES internacoes(id),
    tipo            TEXT NOT NULL,
    subtipo         TEXT,
    severidade      TEXT NOT NULL,
    mensagem        TEXT NOT NULL,
    disparado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reconhecido_em  TIMESTAMPTZ,
    reconhecido_por TEXT,

    CONSTRAINT alertas_tipo_chk    CHECK (tipo IN ('CLINICO','OPERACIONAL')),
    CONSTRAINT alertas_sev_chk     CHECK (severidade IN ('BAIXA','MEDIA','ALTA','CRITICA')),
    CONSTRAINT alertas_subtipo_chk CHECK (subtipo IS NULL OR subtipo IN
        ('SINAL_VITAL_CRITICO','MEDICACAO_ALERGIA','MEDICACAO_ATRASADA',
         'PREVISAO_ALTA','MONITOR_SEM_PACIENTE')),
    CONSTRAINT alertas_clinico_internacao_chk
        CHECK (tipo <> 'CLINICO' OR internacao_id IS NOT NULL)
);

CREATE INDEX alertas_abertos_idx ON alertas (leito_id, disparado_em DESC)
    WHERE reconhecido_em IS NULL;

CREATE TABLE decisoes_medicas (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    decidido_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    decisao       TEXT NOT NULL,
    contexto      JSONB,
    usuario       TEXT,

    CONSTRAINT decisoes_chk CHECK (decisao IN ('PREPARAR_ALTA','MANTER_INTERNADO'))
);


-- ============================================================================
-- BLOCO 7 — CENTRO CIRÚRGICO: AGENDAMENTOS E FLUXO CIRÚRGICO (fonte: HIS)
-- ============================================================================

CREATE TABLE agendamentos_cirurgicos (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his      TEXT NOT NULL UNIQUE,
    internacao_id       BIGINT NOT NULL REFERENCES internacoes(id),
    leito_id            BIGINT NOT NULL REFERENCES leitos(id),
    procedimento_desc   TEXT NOT NULL,
    cirurgiao_principal TEXT,
    previsto_inicio     TIMESTAMPTZ NOT NULL,
    previsto_duracao    INTERVAL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agendamentos_sala_idx      ON agendamentos_cirurgicos (leito_id, previsto_inicio DESC);
CREATE INDEX agendamentos_internacao_idx ON agendamentos_cirurgicos (internacao_id);

CREATE TABLE etapas_fluxo_cirurgico (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agendamento_id BIGINT NOT NULL REFERENCES agendamentos_cirurgicos(id),
    etapa          TEXT NOT NULL,
    inicio         TIMESTAMPTZ NOT NULL,
    fim            TIMESTAMPTZ,
    duracao_real   INTERVAL GENERATED ALWAYS AS (fim - inicio) STORED,
    observacoes    TEXT,
    registrado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT etapas_nome_chk  CHECK (etapa IN ('ADMISSAO','PROCEDIMENTO','RA','QUARTO')),
    CONSTRAINT etapas_datas_chk CHECK (fim IS NULL OR fim >= inicio)
);

CREATE INDEX etapas_ativas_idx ON etapas_fluxo_cirurgico (agendamento_id, etapa)
    WHERE fim IS NULL;

CREATE UNIQUE INDEX etapas_aberta_unq ON etapas_fluxo_cirurgico (agendamento_id)
    WHERE fim IS NULL;


-- ============================================================================
-- BLOCO 8 — MEDICAMENTOS E ADMINISTRAÇÕES (fonte: HIS)
-- ============================================================================

CREATE TABLE medicamentos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his  TEXT NOT NULL UNIQUE,
    nome_generico   TEXT NOT NULL,
    nome_comercial  TEXT,
    principio_ativo TEXT,
    via             TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT medicamentos_via_chk
        CHECK (via IS NULL OR via IN ('VO','IV','SC','IM','INH','TOPICO','OUTRO'))
);

CREATE TABLE prescricoes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his TEXT NOT NULL UNIQUE,
    internacao_id  BIGINT NOT NULL REFERENCES internacoes(id),
    medicamento_id BIGINT NOT NULL REFERENCES medicamentos(id),
    dose           TEXT NOT NULL,
    frequencia     TEXT NOT NULL,
    via            TEXT NOT NULL,
    prescrito_em   TIMESTAMPTZ NOT NULL,
    valida_ate     TIMESTAMPTZ,
    prescrito_por  TEXT,
    ativa          BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT prescricoes_via_chk CHECK (via IN ('VO','IV','SC','IM','INH','TOPICO','OUTRO'))
);

CREATE INDEX prescricoes_internacao_idx ON prescricoes (internacao_id) WHERE ativa = TRUE;

CREATE TABLE administracoes_medicamento (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prescricao_id    BIGINT NOT NULL REFERENCES prescricoes(id),
    previsto_em      TIMESTAMPTZ NOT NULL,
    administrado_em  TIMESTAMPTZ,
    administrado_por TEXT,
    observacao       TEXT,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX adm_pendentes_idx  ON administracoes_medicamento (previsto_em)
    WHERE administrado_em IS NULL;
CREATE INDEX adm_prescricao_idx ON administracoes_medicamento (prescricao_id, previsto_em DESC);


-- ============================================================================
-- BLOCO 9 — USUÁRIOS E PERFIS DE ACESSO
-- ============================================================================

CREATE TABLE usuarios (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    nome          TEXT NOT NULL,
    perfil        TEXT NOT NULL,
    ativo         BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT usuarios_perfil_chk
        CHECK (perfil IN ('ASSISTENCIAL','GESTOR','EXECUTIVO','PAINEIS'))
);

CREATE TABLE log_acessos (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuarios(id),
    acessado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_origem   INET,
    user_agent  TEXT
);

CREATE INDEX log_acessos_usuario_idx ON log_acessos (usuario_id, acessado_em DESC);


-- ============================================================================
-- BLOCO 10 — PREDIÇÕES (geradas pela plataforma)
-- ============================================================================

CREATE TABLE predicoes_internacao (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    calculado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    probabilidade NUMERIC(5,4) NOT NULL,
    fatores       JSONB NOT NULL,
    versao_modelo TEXT NOT NULL DEFAULT 'v1-roteirizado',

    CONSTRAINT predicoes_prob_chk CHECK (probabilidade BETWEEN 0 AND 1)
);

CREATE INDEX predicoes_internacao_tempo_idx ON predicoes_internacao (internacao_id, calculado_em DESC);

CREATE TABLE predicoes_ews (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id  BIGINT NOT NULL REFERENCES internacoes(id),
    gerado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    slot           TIMESTAMPTZ NOT NULL,
    score_previsto NUMERIC(4,1) NOT NULL,
    score_minimo   NUMERIC(4,1) NOT NULL,
    score_maximo   NUMERIC(4,1) NOT NULL
);

CREATE INDEX predicoes_ews_internacao_slot_idx ON predicoes_ews (internacao_id, slot DESC);


-- ============================================================================
-- BLOCO 11 — CONTROLE DE INGESTÃO (watermark por fonte)
-- ============================================================================

CREATE TABLE ingestao_watermark (
    fonte              TEXT PRIMARY KEY,
    processado_ate     TIMESTAMPTZ NOT NULL,
    ultima_execucao_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    detalhes           JSONB
);

INSERT INTO ingestao_watermark (fonte, processado_ate) VALUES
    ('MONITORES',     now()),
    ('HIS_ADT',       now()),
    ('HIS_CADASTRO',  now()),
    ('HIS_CIRURGICO', now()),
    ('HIS_FARMACIA',  now());


-- ============================================================================
-- DIAGRAMA DE DEPENDÊNCIAS ENTRE FONTES DE DADOS
-- ============================================================================
--
--  ┌──────────────────────────────┐    ┌────────────────────────────────────┐
--  │   FONTE 1: HIS do Hospital   │    │   FONTE 2: Monitores SKOPIEN       │
--  │  (sync periódico via API)    │    │  (stream contínuo via agente)      │
--  └──────────────┬───────────────┘    └──────────────┬─────────────────────┘
--                 │                                    │
--   pacientes     │                                    │  afericoes_minuto
--   internacoes   │                                    │  (particionado por mês)
--   alergias      │                                    │
--   triagens      │         CRUZAMENTO                 │
--   ocupacoes     │         PRINCIPAL                  │
--   medicamentos  │◄───────────────────────────────────┤
--   prescricoes   │         ocupacoes_leito             │
--   adm_medicam.  │         (ponte HIS ↔ Monitor)      │
--   agend_cirurg. │                                    │
--   etapas_fluxo  │                                    │
--                 │                                    │
--  └──────────────┴──────────────┬─────────────────────┘
--                                │
--                      ┌─────────▼──────────┐
--                      │  PLATAFORMA SKOPIEN │
--                      │  (processa + exibe) │
--                      ├────────────────────┤
--                      │  ews_scores        │
--                      │  alertas           │
--                      │  decisoes_medicas  │
--                      │  predicoes_intern. │
--                      │  predicoes_ews     │
--                      │  usuarios          │
--                      └────────────────────┘
-- ============================================================================
