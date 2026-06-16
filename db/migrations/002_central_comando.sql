-- ============================================================================
-- SKOPIEN — Tabelas da Central de Comando
-- Migration: 002_central_comando.sql
-- Banco alvo: PostgreSQL (instância por cliente)
-- Depende de: 001_schema_completo.sql
--
-- Painéis e suas tabelas:
--
--   Painéis cobertos pelo 001 (sem novas tabelas):
--     Centro Cirúrgico          → agendamentos_cirurgicos, etapas_fluxo_cirurgico
--     Gestão de Atraso Cirúrgico → etapas_fluxo_cirurgico
--     Tempo de Permanência CID   → internacoes
--     Predição de Deterioração   → ews_scores, predicoes_ews
--     Predição de Internações    → predicoes_internacao
--
--   Painéis com tabelas novas (este arquivo):
--     Higienização de Leitos     → higienizacoes_leito
--     Agendamento Anestésico     → anestesistas, escalas_anestesia
--     Capacidade × Demanda       → projecoes_demanda
--     Performance de Alta até 10h → processos_alta
--     Unidade de Emergência      → boardings_ps
--     Cuidados com a Pele        → avaliacoes_braden, lpp_registros,
--                                   mudancas_decubito, curativos  (fonte: Skinone)
-- ============================================================================


-- ============================================================================
-- HIGIENIZAÇÃO DE LEITOS
-- ============================================================================
-- Rastreia o ciclo de limpeza entre uma saída e a liberação do leito para
-- novo paciente. O painel mostra tempo médio de higienização e leitos
-- aguardando liberação em tempo real.

CREATE TABLE higienizacoes_leito (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    leito_id            BIGINT NOT NULL REFERENCES leitos(id),
    internacao_saida_id BIGINT REFERENCES internacoes(id),
    status              TEXT NOT NULL DEFAULT 'AGUARDANDO',
    solicitado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    iniciado_em         TIMESTAMPTZ,
    concluido_em        TIMESTAMPTZ,
    liberado_em         TIMESTAMPTZ,
    responsavel         TEXT,

    CONSTRAINT higienizacoes_status_chk
        CHECK (status IN ('AGUARDANDO','EM_HIGIENIZACAO','CONCLUIDO','LIBERADO'))
);

CREATE INDEX higienizacoes_leito_idx ON higienizacoes_leito (leito_id, solicitado_em DESC);
CREATE INDEX higienizacoes_abertas_idx ON higienizacoes_leito (status)
    WHERE status IN ('AGUARDANDO','EM_HIGIENIZACAO');


-- ============================================================================
-- AGENDAMENTO ANESTÉSICO
-- ============================================================================
-- Cadastro de anestesistas e sua alocação por procedimento cirúrgico.
-- O painel mostra disponibilidade e alocação em tempo real.

CREATE TABLE anestesistas (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome         TEXT NOT NULL,
    crm          TEXT NOT NULL UNIQUE,
    especialidade TEXT,
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE escalas_anestesia (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anestesista_id BIGINT NOT NULL REFERENCES anestesistas(id),
    agendamento_id BIGINT NOT NULL REFERENCES agendamentos_cirurgicos(id),
    tipo_anestesia TEXT NOT NULL,
    confirmado     BOOLEAN NOT NULL DEFAULT FALSE,
    confirmado_em  TIMESTAMPTZ,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT escalas_tipo_chk
        CHECK (tipo_anestesia IN ('GERAL','REGIONAL','SEDACAO','LOCAL')),
    CONSTRAINT escalas_agendamento_unq UNIQUE (agendamento_id)
);

CREATE INDEX escalas_anestesista_idx ON escalas_anestesia (anestesista_id);


-- ============================================================================
-- CAPACIDADE × DEMANDA
-- ============================================================================
-- Projeções de admissões e altas esperadas por unidade em janelas de tempo.
-- Geradas pelo modelo preditivo; o painel exibe ocupação projetada vs real.

CREATE TABLE projecoes_demanda (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id          BIGINT NOT NULL REFERENCES unidades(id),
    gerado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    periodo_inicio      TIMESTAMPTZ NOT NULL,
    periodo_fim         TIMESTAMPTZ NOT NULL,
    admissoes_previstas SMALLINT NOT NULL,
    altas_previstas     SMALLINT NOT NULL,
    ocupacao_prevista   NUMERIC(5,2) NOT NULL,
    versao_modelo       TEXT NOT NULL DEFAULT 'v1-roteirizado'
);

CREATE INDEX projecoes_unidade_periodo_idx ON projecoes_demanda (unidade_id, periodo_inicio DESC);


-- ============================================================================
-- PERFORMANCE DE ALTA ATÉ 10H
-- ============================================================================
-- Rastreia cada etapa do processo de alta: ordem médica, notificação,
-- documentação e saída física. O painel mede adesão à meta de alta até 10h.

CREATE TABLE processos_alta (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id    BIGINT NOT NULL UNIQUE REFERENCES internacoes(id),
    ordem_medica_em  TIMESTAMPTZ,
    notificacao_em   TIMESTAMPTZ,
    documentacao_em  TIMESTAMPTZ,
    efetivada_em     TIMESTAMPTZ,
    meta_10h         BOOLEAN,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX processos_alta_efetivada_idx ON processos_alta (efetivada_em DESC)
    WHERE efetivada_em IS NOT NULL;


-- ============================================================================
-- UNIDADE DE EMERGÊNCIA
-- ============================================================================
-- Boarding: período em que um paciente já com decisão de internação aguarda
-- leito disponível. O painel monitora fluxo de porta, LOS e tempo de boarding.

CREATE TABLE boardings_ps (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id   BIGINT NOT NULL REFERENCES internacoes(id),
    inicio_boarding TIMESTAMPTZ NOT NULL,
    fim_boarding    TIMESTAMPTZ,
    motivo_espera   TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX boardings_abertos_idx ON boardings_ps (inicio_boarding DESC)
    WHERE fim_boarding IS NULL;


-- ============================================================================
-- CUIDADOS COM A PELE (fonte: Skinone)
-- ============================================================================
-- Tabelas sincronizadas do sistema Skinone. O painel exibe LPP, Braden,
-- mudanças de decúbito e curativos em tempo real.

CREATE TABLE avaliacoes_braden (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id  BIGINT NOT NULL REFERENCES internacoes(id),
    avaliado_em    TIMESTAMPTZ NOT NULL,
    score_total    SMALLINT NOT NULL,
    sensorial      SMALLINT NOT NULL,
    umidade        SMALLINT NOT NULL,
    atividade      SMALLINT NOT NULL,
    mobilidade     SMALLINT NOT NULL,
    nutricao       SMALLINT NOT NULL,
    friccao_cisalh SMALLINT NOT NULL,
    risco          TEXT NOT NULL,
    avaliado_por   TEXT,

    CONSTRAINT braden_risco_chk
        CHECK (risco IN ('LEVE','MODERADO','ALTO','MUITO_ALTO'))
);

CREATE INDEX braden_internacao_idx ON avaliacoes_braden (internacao_id, avaliado_em DESC);

CREATE TABLE lpp_registros (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id  BIGINT NOT NULL REFERENCES internacoes(id),
    registrado_em  TIMESTAMPTZ NOT NULL,
    estadio        TEXT NOT NULL,
    localizacao    TEXT NOT NULL,
    area_cm2       NUMERIC(6,2),
    exsudato       TEXT,
    tecido         TEXT,
    registrado_por TEXT,

    CONSTRAINT lpp_estadio_chk
        CHECK (estadio IN ('I','II','III','IV','NAP','DTID'))
);

CREATE INDEX lpp_internacao_idx ON lpp_registros (internacao_id, registrado_em DESC);

CREATE TABLE mudancas_decubito (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    realizado_em  TIMESTAMPTZ NOT NULL,
    posicao       TEXT NOT NULL,
    realizado_por TEXT,

    CONSTRAINT decubito_posicao_chk
        CHECK (posicao IN ('SUPINO','LATERAL_D','LATERAL_E','PRONA','FOWLER'))
);

CREATE INDEX decubito_internacao_idx ON mudancas_decubito (internacao_id, realizado_em DESC);

CREATE TABLE curativos (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    lpp_id        BIGINT REFERENCES lpp_registros(id),
    realizado_em  TIMESTAMPTZ NOT NULL,
    tipo_curativo TEXT,
    cobertura     TEXT,
    realizado_por TEXT
);

CREATE INDEX curativos_internacao_idx ON curativos (internacao_id, realizado_em DESC);


-- ============================================================================
-- CONTROLE DE INGESTÃO — fontes novas deste arquivo
-- ============================================================================

INSERT INTO ingestao_watermark (fonte, processado_ate) VALUES
    ('SKINONE',          now()),  -- Cuidados com a Pele (Skinone)
    ('HIS_HIGIENIZACAO', now()),  -- Higienização de Leitos
    ('HIS_ANESTESIA',    now())   -- Agendamento Anestésico
ON CONFLICT (fonte) DO NOTHING;
