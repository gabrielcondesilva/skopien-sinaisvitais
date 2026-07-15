# SKOPIEN

Plataforma web de monitoramento inteligente de pacientes em tempo real para clínicas e hospitais. Exibe sinais vitais, alertas clínicos e dashboards operacionais em uma central de comando.

## Language

### Entidades Clínicas

**Paciente**:
Pessoa internada ou em atendimento no hospital. Possui dados demográficos e histórico clínico persistentes independente de onde esteja internado.
_Evitar_: Usuário, pessoa, cliente

**Leito**:
Recurso físico permanente de uma Unidade. Existe independente de estar ocupado ou não. Quando sem Internação ativa, exibe status "Leito Disponível".
_Evitar_: Cama, vaga

**Internação**:
Registro que conecta um Paciente a um Leito em um intervalo de tempo. É a entidade central do sistema: sinais vitais, escore EWS, alertas e predições pertencem à Internação, não diretamente ao Paciente.
_Evitar_: Admissão, episódio, atendimento

**Unidade**:
Divisão física do hospital. As unidades existentes são: Pronto Socorro (12 leitos), Enfermaria (20 leitos), Centro Cirúrgico (6 salas) e UTI (10 leitos).
_Evitar_: Ala, setor, departamento

**Sala Cirúrgica**:
Recurso físico do Centro Cirúrgico. Equivalente ao Leito nas demais unidades, mas associada a um Fluxo Cirúrgico em vez de sinais vitais contínuos. Identificadas como CC01, CC02, CC03, CC04, CC05, CC06.
_Evitar_: Leito (no contexto do Centro Cirúrgico)

**Bomba de Infusão**:
Equipamento utilizado por alguns pacientes, indicado por insígnia visual no card do Leito (UTI) ou da Sala Cirúrgica (Centro Cirúrgico). Definido como campo booleano por paciente no seed de dados. Não aparece em Pronto Socorro ou Enfermaria.
_Evitar_: Bomba, infusão contínua

**Sinal Vital**:
Medição fisiológica coletada pelo equipamento SKOPIEN em alta frequência (aproximadamente a cada segundo). Pertence a uma Internação. Os cinco sinais monitorados são: Frequência Respiratória (FR), Saturação de O₂ (SpO₂), Pressão Arterial Sistólica (PAS), Frequência Cardíaca (FC) e Temperatura (TEMP). SpO₂ continua sendo medido e exibido nos gráficos, mas não compõe o Escore EWS (ver Escore EWS).
_Evitar_: Medição, dado clínico, parâmetro

**Nível de Consciência (NC)**:
Avaliação categórica da consciência do paciente pela escala AVPU (Alerta, Confuso, Responde à Dor, Inconsciente), usada como o 5º parâmetro do Escore EWS no lugar de SpO₂. Diferente dos Sinais Vitais, não é uma leitura contínua de sensor — é uma avaliação pontual da enfermagem, por isso não passa pelo pipeline de mediana do Slot Temporal: o valor exibido é sempre o estado atual, não uma agregação.
_Evitar_: Glasgow, escala de coma (é AVPU, uma escala distinta e mais simples)

**Escore EWS**:
Pontuação calculada a partir de FR, PAS, FC, TEMP e Nível de Consciência (NC) usando a tabela MEWS institucional. SpO₂ não entra na conta. Escala de 0–15. Pertence à Internação, calculado sobre o Slot Temporal ativo (exceto o componente NC, que usa o estado categórico atual).
_Evitar_: Score, pontuação, índice, NEWS2 (a tabela em uso é MEWS)

**Status Clínico**:
Classificação qualitativa derivada do Escore EWS. Regras: 0–3 → Estável; 4 → Atenção; 5–6 → Risco Elevado; ≥7 → Crítico. Não há regra de exceção por sinal individual — depende só da soma total.
_Evitar_: Estado, condição, situação; Baixo/Moderado/Alto (nomenclatura de 3 níveis descontinuada — a classificação em uso tem 4 níveis, apesar do nome coincidir com o do NEWS2 a tabela de pontuação continua sendo a MEWS)

### Fluxos

**Fluxo Cirúrgico**:
Sequência de etapas de uma cirurgia no Centro Cirúrgico: Admissão → Procedimento → RA → Quarto. Cada etapa registra horário de início e duração.
_Evitar_: Pipeline cirúrgico, jornada cirúrgica

**Slot Temporal**:
Intervalo de tempo usado para agregar Sinais Vitais pela mediana. Padrão: 15 minutos. Cada ponto/barra no gráfico representa a mediana dos valores coletados naquele intervalo. Ex: slot 15 min + janela 3h = 12 pontos no gráfico. O ponto mais recente é o slot em andamento (mediana parcial). O valor exibido no card do Leito é sempre a mediana do slot atual — nunca o valor bruto instantâneo.
_Evitar_: Janela, período, intervalo de agregação

**Heatmap de Sinais Vitais**:
Visualização alternativa à série temporal na aba de Sinais Vitais. Grade com tempo no eixo X (slots) e os 5 parâmetros do Escore EWS no eixo Y (FR, PAS, FC, TEMP, NC — SpO₂ fica de fora por não pontuar). Cada célula é colorida pela pontuação individual daquele parâmetro naquele slot (verde=0, amarelo=1, laranja=2, vermelho=3). Permite identificar visualmente quando e qual parâmetro começou a deteriorar.
_Evitar_: Mapa de calor por hora, matriz de correlação

### Alertas

**Alerta**:
Notificação disparada automaticamente por evento clínico ou operacional. Pertence à Internação. Quatro tipos com comportamentos distintos ao ser respondido:
- **Sinal Vital Crítico**: "Ação tomada" move para histórico, mas a insígnia do Leito só desaparece quando o Sinal Vital normalizar. Pode disparar novamente para o mesmo paciente.
- **Medicação por Alergia / Medicação Atrasada**: "Ação tomada" move para histórico e remove a insígnia do Leito.
- **Previsão de Alta**: dois botões — "Confirmar alta" e "Manter internado". Ambos movem para histórico e removem a insígnia. Pode disparar novamente para o mesmo paciente se o modelo voltar a identificar probabilidade de alta.
_Evitar_: Notificação, aviso, evento

**Predição de Internação**:
Estimativa de probabilidade de internação de um paciente, exibida na aba homônima. Na v1, é um valor roteirizado por paciente no seed de dados. Exibe a probabilidade percentual e os fatores contribuintes com seus valores (Classificação de Manchester, idade, sinais vitais, diagnóstico, como o paciente chegou, etc.).
_Evitar_: Modelo preditivo (na v1 não há modelo real)

**Predição EWS**:
Gráfico na aba "Histórico e Predição EWS" que exibe histórico do Escore EWS (linha sólida) e previsão para as próximas 2 horas (linha tracejada com área sombreada de incerteza). Uma linha vertical "agora" separa histórico de previsão. Quando a previsão cruza o limiar de Alto (≥5), a linha tracejada fica vermelha. Valores de previsão são roteirizados no seed de dados.
_Evitar_: Forecast, projeção

**Classificação de Manchester**:
Escala de triagem com 5 níveis de urgência: Vermelho, Laranja, Amarelo, Verde, Azul. Exibida como um dos fatores contribuintes na aba de Predição de Internação.
_Evitar_: Triagem, prioridade de atendimento

### Perfis de Acesso

**Perfil Assistencial**:
Acesso às Unidades, leitos e página do Paciente. Foco em dados clínicos individuais.

**Perfil Gestor**:
Acesso às Unidades (igual ao Assistencial) mais a Visão Administrativa com dashboards por Unidade e de Alertas.

**Perfil Executivo**:
Acesso somente à Visão Administrativa. Sem acesso às telas assistenciais.

**Perfil Painéis**:
Acesso somente à Central de Comando, que lista os 10 dashboards operacionais.

### Dashboards

**Visão Administrativa**:
Seção com dashboards agregados por Unidade (Pronto Socorro, Enfermaria, UTI, Centro Cirúrgico) e dashboard de Alertas. Acessível pelos perfis Gestor e Executivo. Dashboards distintos dos 10 dashboards da Central de Comando.

**Central de Comando**:
Tela do Perfil Painéis com cards para os 10 dashboards operacionais. Cada card linka para a rota dedicada do dashboard (`/dashboards/*`). Acessível somente pelo Perfil Painéis.

**Controle de Acesso**:
Cada perfil é redirecionado para sua tela inicial ao fazer login. Tentativa de acesso a rota fora do perfil resulta em redirecionamento silencioso para a tela inicial do perfil logado.

---

## Demo

Hospital fictício da v1: **Hospital Demo Skopien**. Usado em todos os dados gerados pelo seed.

### Cenas roteirizadas (eventos com tempo relativo à abertura do app)

**Cena 1 — Deterioração + Alerta de Sinal Vital** (~5 min)
Paciente na UTI: FC sobe e Nível de Consciência piora de Alerta para Confuso. SpO₂ também cai visualmente no gráfico (não pontua, mas reforça a leitura clínica). Escore EWS sobe de Atenção para Risco Elevado. Alerta de Sinal Vital dispara. Insígnia vermelha aparece no card do leito.

**Cena 2 — Medicação Atrasada** (~8 min)
Paciente na Enfermaria: horário de administração passa sem confirmação. Alerta de Medicação Atrasada dispara com nome do medicamento e horário previsto.

**Cena 3 — Previsão de Alta** (~12 min)
Paciente no Pronto Socorro: modelo identifica alta probabilidade de alta. Alerta de Previsão de Alta dispara. Usuário pode clicar "Confirmar alta" ou "Manter internado".

**Cena 4 — Avanço no Fluxo Cirúrgico** (~15 min)
Sala cirúrgica no Centro Cirúrgico: paciente avança da etapa Procedimento → RA. Sistema registra horário de transição, exibe duração da etapa anterior e marca a nova etapa como "Em andamento".

---

## Design

Tema base: dark mode global. Referência visual: Vercel dashboard — fundo quase preto, tipografia limpa, dados em destaque, acentos coloridos para status (vermelho crítico, amarelo atenção, verde estável). Logos disponíveis: `logo_branca.png` (uso em fundo escuro) e `logo_preta.png`. Target de tela: desktop-first (mínimo 1024px). Sem suporte a mobile na v1.

---

## Example Dialogue

> Dev: "Vou colocar o alerta no Paciente."
> Domínio: "Não — o alerta pertence à Internação. Se o mesmo paciente for internado duas vezes, os alertas da primeira internação não devem aparecer na segunda."

> Dev: "O leito está vazio, vou esconder o card."
> Domínio: "Não — exibe o card com status 'Leito Disponível'. O leito existe independente de haver paciente."

> Dev: "Vou calcular o EWS usando o último valor de cada sinal vital."
> Domínio: "Não — use a mediana do Slot Temporal selecionado, não o valor instantâneo."

> Dev: "Vou aplicar mediana no Nível de Consciência também, igual aos outros parâmetros do Escore."
> Domínio: "Não — NC não é medido por sensor, é avaliado pela enfermagem de tempo em tempo. Não faz sentido tirar mediana de uma sequência de 'Alerta'. Use o estado atual."
