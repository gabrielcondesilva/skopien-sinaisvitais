## Escopo

Dentro:
- Leitos da UTI (10), com internação ativa ou não.
- Sinais vitais brutos (FR, SpO₂, PAS, FC, TEMP) — 1 leitura/minuto por internação.
- Nível de Consciência (AVPU) — avaliação pontual da enfermagem.
- Escore EWS / Status Clínico — calculado a partir do Slot Temporal (última leitura válida, não média/mediana — ver decisão registrada em `CONTEXT.md` § Slot Temporal).
- Alerta de Sinal Vital (ciclo ativo → respondido → histórico).
- Predição EWS (aba "Histórico e Predição EWS") — só a tabela pra guardar os pontos de previsão; o modelo em si (eCART) ainda depende dos dados que pedimos ao hospital.

Fora (por enquanto):
- Pronto Socorro, Enfermaria, Centro Cirúrgico — nenhuma tabela dessas unidades aqui.
- Lesão de Pele e Medicamento (abas do paciente) — hoje são mock estático desconectado da internação (`SkinLesionTab.tsx`, `MedicationTab.tsx`), não dependem de banco ainda.
- Predição de Internação, Classificação de Manchester — só existem na aba exclusiva do Pronto Socorro.
- Bomba de Infusão como evento (anexar/remover no meio da internação) — hoje é só um flag estático por internação, igual ao mock atual.

---

## Tabelas

### `pacientes`

```sql
CREATE TABLE pacientes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_externo_his  TEXT UNIQUE,          -- preenchido quando integrar com o HIS; nulo por enquanto
    nome            TEXT NOT NULL,
    data_nascimento DATE,
    sexo            CHAR(1) CHECK (sexo IN ('M','F')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `leitos`

10 linhas fixas (UTI-01 .. UTI-10) no MVP.

```sql
CREATE TABLE leitos (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo     TEXT NOT NULL UNIQUE,       -- 'UTI-01'..'UTI-10'
    unidade    TEXT NOT NULL DEFAULT 'UTI',
    tipo_uti   TEXT NOT NULL DEFAULT 'ADULTO',
    inoperante BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT leitos_unidade_chk CHECK (unidade IN ('UTI')),  -- ampliar quando outra unidade entrar
    CONSTRAINT leitos_tipo_uti_chk CHECK (tipo_uti IN ('ADULTO','NEONATAL','PEDIATRICA'))
);
```

`unidade` já existe como coluna (não tabela `unidades` à parte) porque hoje só vale `'UTI'` — criar uma tabela de referência pra um único valor seria estrutura sem uso ainda. Quando a Enfermaria/PS/CC entrarem, o CHECK cresce.

### `internacoes`

Vincula paciente a leito num intervalo. **Sinal vital, NC e EWS pertencem a esta entidade, não ao paciente** — é o mesmo motivo pelo qual isso está separado de `pacientes`.

```sql
CREATE TABLE internacoes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id     BIGINT NOT NULL REFERENCES pacientes(id),
    leito_id        BIGINT NOT NULL REFERENCES leitos(id),
    admitido_em     TIMESTAMPTZ NOT NULL,
    alta_em         TIMESTAMPTZ,
    motivo_admissao TEXT,
    bomba_infusao   BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT internacoes_datas_chk CHECK (alta_em IS NULL OR alta_em >= admitido_em)
);

-- no máx. 1 internação ativa por leito — é assim que uma leitura identificada
-- só pelo leito (ver tabela abaixo) acha o dono certo
CREATE UNIQUE INDEX internacoes_leito_ativo_unq ON internacoes (leito_id) WHERE alta_em IS NULL;
CREATE INDEX internacoes_paciente_idx ON internacoes (paciente_id);
```

`leito_id` fica direto em `internacoes` (sem tabela-ponte `ocupacoes_leito` como no schema antigo) porque no MVP um leito não troca de paciente com frequência alta o bastante pra justificar rastrear histórico de ocupação separado — se `leito_id` mudasse de dono no meio de uma internação isso seria um bug de dados, não um caso de uso. Revisitar se isso virar necessidade real.

### `leituras_sinais_vitais`

Uma linha por internação por minuto — a cadência real do equipamento (ver `lib/simulation/vitals.ts`, `READING_INTERVAL_MS = 60_000`).

```sql
CREATE TABLE leituras_sinais_vitais (
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    coletado_em   TIMESTAMPTZ NOT NULL,
    fr            NUMERIC(4,1),
    spo2          NUMERIC(4,1),
    pas           NUMERIC(5,1),
    fc            NUMERIC(4,1),
    temp          NUMERIC(3,1),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (internacao_id, coletado_em)
);
```

Colunas nulas por design: **`NULL` é como se representa "sem leitura válida naquele minuto"** — falha do equipamento, sensor desconectado, etc. Não usar `0` como sentinela de dado ausente (`0` de FC ou TEMP é fisiologicamente impossível, mas ainda assim é ambíguo — `NULL` é explícito). Cada coluna é independente: FC pode faltar num minuto sem que FR falte junto.

Isso alimenta diretamente a regra que já está implementada em `lastValidInSlot()` (`lib/simulation/vitals.ts`): dentro de um Slot Temporal, pega a leitura mais recente; se ela for `NULL`, cai pra anterior válida dentro do mesmo slot; se o slot inteiro vier `NULL` pra aquele parâmetro, é "sem dado" (caso hoje só possível com dado real, não com o simulador).

Sem particionamento por enquanto — 10 leitos × 5 sinais × 1.440 min/dia ≈ 7.200 valores/dia é pequeno. Reavaliar quando as outras unidades entrarem.

### `avaliacoes_consciencia`

NC é avaliação pontual da enfermagem, não leitura de sensor — por isso é uma tabela de eventos separada da de sinais vitais, não uma coluna a mais em `leituras_sinais_vitais`. Não tem noção de "falha" nem de agregação: o valor exibido é sempre o mais recente.

```sql
CREATE TABLE avaliacoes_consciencia (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id BIGINT NOT NULL REFERENCES internacoes(id),
    avaliado_em   TIMESTAMPTZ NOT NULL,
    nivel         TEXT NOT NULL,
    avaliado_por  TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT avaliacoes_nivel_chk CHECK (nivel IN ('ALERTA','CONFUSO','RESPONDE_DOR','INCONSCIENTE'))
);

CREATE INDEX avaliacoes_internacao_idx ON avaliacoes_consciencia (internacao_id, avaliado_em DESC);
```

### `alertas`

Guarda o ciclo de vida inteiro do alerta, não só o clique do botão — são dois momentos distintos, gravados na mesma linha:

- **Disparo (INSERT automático)** — feito pelo sistema, sem intervenção humana, quando um **parâmetro individual** (FR, PAS, FC, TEMP ou SpO₂) cruza seu Limite de Alarme na leitura do Slot Temporal fixo de 15 min (`CONTEXT.md` § Limite de Alarme — conceito desacoplado do Escore EWS, que continua calculado à parte e não influencia o disparo). Cada parâmetro fora do limite gera uma linha independente — dois parâmetros simultâneos (ex.: FC e PAS) são duas linhas, não uma. O alerta já nasce "ativo" e nunca duplica enquanto ativo (equivalente ao `checkVitalAlerts()` que já existe em `store/alerts.ts`, rodando no backend a cada nova leitura em vez de num tick client-side).
- **Resposta (UPDATE humano)** — preenchido quando o profissional aperta "Ação Tomada" ou "Falso Positivo" na UI, ou automaticamente quando o valor normaliza sozinho antes de qualquer clique. Antes disso essas colunas ficam `NULL`.

Só o tipo `sinal-vital` é gerado pelo pipeline da UTI hoje. `medicacao` e `alta` estão no CHECK porque são os mesmos três tipos do domínio (`CONTEXT.md` § Alertas), mas nada aqui ainda os dispara — ficam pra quando FAR/HIS entrarem (ver `docs/data/requisitos-integracao.md`).

```sql
CREATE TABLE alertas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id   BIGINT NOT NULL REFERENCES internacoes(id),
    tipo            TEXT NOT NULL DEFAULT 'sinal-vital',
    parametro       TEXT,              -- 'fr'|'spo2'|'pas'|'fc'|'temp' — só em tipo = 'sinal-vital'
    valor_leitura   NUMERIC(5,1),      -- valor que cruzou o Limite de Alarme — só em tipo = 'sinal-vital'
    mensagem        TEXT NOT NULL,

    -- disparo: automático, gravado pelo sistema no momento em que o alerta nasce
    disparado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- resposta: humano ou automática (normalização) — NULL até o alerta ser encerrado
    reconhecido_em  TIMESTAMPTZ,
    reconhecido_por TEXT,
    resolvido_como  TEXT,              -- 'acao-tomada'|'falso-positivo'|'auto-clear' — uso interno
                                        -- pra regra de carência de re-disparo, não exibido na UI de histórico

    CONSTRAINT alertas_tipo_chk CHECK (tipo IN ('sinal-vital','medicacao','alta')),
    CONSTRAINT alertas_parametro_chk CHECK (parametro IS NULL OR parametro IN ('fr','spo2','pas','fc','temp')),
    CONSTRAINT alertas_resolvido_chk CHECK (resolvido_como IS NULL OR resolvido_como IN ('acao-tomada','falso-positivo','auto-clear'))
);

CREATE INDEX alertas_internacao_idx ON alertas (internacao_id, disparado_em DESC);
CREATE INDEX alertas_ativos_idx ON alertas (internacao_id, parametro) WHERE reconhecido_em IS NULL;
```

Regra de re-disparo pro mesmo `(internacao_id, parametro)` depois de encerrado (ver `CONTEXT.md` § Alertas para o racional completo): sem carência se `resolvido_como` for `'falso-positivo'` ou `'auto-clear'` (dispara na hora se sair do limite de novo); com carência de 60 min contados de `disparado_em` (não de `reconhecido_em`) se for `'acao-tomada'` — carência é descartada assim que aparecer uma leitura dentro do limite antes da próxima piora. Isso é lógica de aplicação (calculada a cada nova leitura em `leituras_sinais_vitais`), não uma constraint de banco.

A insígnia do leito na UI é derivada diretamente da existência de alertas abertos (`reconhecido_em IS NULL`) pra aquela internação — não do Escore EWS.

### `predicoes_ews`

Só a estrutura pra guardar pontos de previsão da aba "Histórico e Predição EWS". Fica vazia até o modelo eCART ter os dados do hospital pra rodar — ver memória de projeto sobre isso.

```sql
CREATE TABLE predicoes_ews (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    internacao_id  BIGINT NOT NULL REFERENCES internacoes(id),
    gerado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    slot           TIMESTAMPTZ NOT NULL,
    score_previsto NUMERIC(4,1) NOT NULL,
    score_minimo   NUMERIC(4,1),
    score_maximo   NUMERIC(4,1),

    CONSTRAINT predicoes_ews_unq UNIQUE (internacao_id, slot)
);

CREATE INDEX predicoes_ews_internacao_idx ON predicoes_ews (internacao_id, slot DESC);
```
    