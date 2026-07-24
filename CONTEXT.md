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
Medição fisiológica coletada pelo equipamento SKOPIEN uma vez por minuto. Pertence a uma Internação. Os cinco sinais monitorados são: Frequência Respiratória (FR), Saturação de O₂ (SpO₂), Pressão Arterial Sistólica (PAS), Frequência Cardíaca (FC) e Temperatura (TEMP). SpO₂ continua sendo medido e exibido nos gráficos, mas não compõe o Escore EWS (ver Escore EWS).
_Evitar_: Medição, dado clínico, parâmetro

**Nível de Consciência (NC)**:
Avaliação categórica da consciência do paciente pela escala AVPU (Alerta, Confuso, Responde à Dor, Inconsciente), usada como o 5º parâmetro do Escore EWS no lugar de SpO₂. Diferente dos Sinais Vitais, não é uma leitura contínua de sensor — é uma avaliação pontual da enfermagem, por isso não passa pelo pipeline de agregação do Slot Temporal: o valor exibido é sempre o estado atual, não uma agregação.
_Evitar_: Glasgow, escala de coma (é AVPU, uma escala distinta e mais simples)

**Escore EWS**:
Pontuação calculada a partir de FR, PAS, FC, TEMP e Nível de Consciência (NC) usando a tabela MEWS institucional. SpO₂ não entra na conta. Escala de 0–15. Pertence à Internação, calculado sobre a Janela de Escore — não sobre o Slot Temporal (exceto o componente NC, que usa o estado categórico atual, como sempre).
_Evitar_: Score, pontuação, índice, NEWS2 (a tabela em uso é MEWS)

**Janela de Escore**:
Intervalo fixo de 30 minutos usado para agregar Sinais Vitais pela mediana, exclusivamente para o cálculo do Escore EWS. Diferente do Slot Temporal em dois pontos: a função de agregação (mediana, não última leitura válida) e a duração (fixa em 30 min, não segue o seletor de granularidade que a tela de Sinais Vitais esteja exibindo). Recalcula só quando o bucket de 30min FECHA — nunca usa o bucket em andamento (que tem poucas leituras e reintroduziria ruído). O Escore fica parado durante os 30min, muda em degrau na virada do bucket. Racional: o Escore precisa de estabilidade clínica — recalcular a cada leitura bruta (ou a cada leitura dentro de um bucket ainda incompleto) faria o paciente oscilar de categoria por ruído de leituras isoladas. Ver ADR-0004.
_Evitar_: Slot Temporal, Slot de Escore, Slot (sem qualificar qual dos dois), janela rolante

**Limite de Alarme**:
Faixa por parâmetro (FR, PAS, FC, TEMP, SpO₂) que, ultrapassada, dispara um Alerta de Sinal Vital Crítico para aquele parâmetro. Avaliado em tempo real sobre a leitura bruta assim que ela chega (1 leitura/min) — não espera nenhuma agregação do Slot Temporal nem da Janela de Escore, e independe de qualquer seletor de granularidade que uma tela específica esteja exibindo. Se a leitura bruta vier vazia ou zerada (falha de equipamento), é ignorada — não dispara nem encerra um Alerta ativo, só aguarda a próxima leitura válida. Conceito totalmente desacoplado do Escore EWS — não é a tabela MEWS, não é a Janela de Escore, nem os limiares visuais de severidade usados para colorir cards/gráficos (`vitalSeverity`), que continuam existindo à parte e não mudam com isto. SpO₂ tem Limite de Alarme mesmo não pontuando no Escore EWS. NC não tem Limite de Alarme — não é lido pelo dispositivo.
_Evitar_: Limiar clínico, faixa de normalidade, limite crítico (confundem com `vitalSeverity` ou com a tabela MEWS)

**Status Clínico**:
Classificação qualitativa derivada do Escore EWS. Regras: 0–3 → Estável; 4 → Atenção; 5–6 → Risco Elevado; ≥7 → Crítico. Não há regra de exceção por sinal individual — depende só da soma total.
_Evitar_: Estado, condição, situação; Baixo/Moderado/Alto (nomenclatura de 3 níveis descontinuada — a classificação em uso tem 4 níveis, apesar do nome coincidir com o do NEWS2 a tabela de pontuação continua sendo a MEWS)

### Fluxos

**Fluxo Cirúrgico**:
Sequência de etapas de uma cirurgia no Centro Cirúrgico: Admissão → Procedimento → RA → Quarto. Cada etapa registra horário de início e duração.
_Evitar_: Pipeline cirúrgico, jornada cirúrgica

**Slot Temporal**:
Intervalo de tempo usado para agregar Sinais Vitais pela última leitura válida, para fins de exibição (gráficos e cards de Sinal Vital). Padrão: 15 minutos, ajustável por seletor de granularidade nas telas que exibem gráficos de Sinais Vitais (equipamento coleta 1 leitura/minuto, logo um slot de 15 min contém até 15 leituras). Cada ponto/barra no gráfico representa a leitura mais recente daquele intervalo — não média nem mediana, conceitos que não fazem sentido clínico para a exibição de um Sinal Vital individual (para o Escore EWS, ver Janela de Escore, que é a exceção deliberada). Se a leitura mais recente do slot vier vazia ou zerada (falha do equipamento), usa-se a leitura válida anterior dentro do mesmo slot. Ex: slot 15 min + janela 3h = 12 pontos no gráfico. O ponto mais recente é o slot em andamento (valor parcial, com as leituras já coletadas até o momento). Não é usado pelo Limite de Alarme (que reage à leitura bruta em tempo real) nem pelo Escore EWS (que usa a Janela de Escore).
_Evitar_: Janela, período, intervalo de agregação, média, mediana

**Heatmap de Sinais Vitais**:
Visualização alternativa à série temporal na aba de Sinais Vitais. Grade com tempo no eixo X (slots) e os 5 parâmetros do Escore EWS no eixo Y (FR, PAS, FC, TEMP, NC — SpO₂ fica de fora por não pontuar). Cada célula é colorida pela pontuação individual daquele parâmetro naquele slot (verde=0, amarelo=1, laranja=2, vermelho=3). Permite identificar visualmente quando e qual parâmetro começou a deteriorar.
_Evitar_: Mapa de calor por hora, matriz de correlação

### Alertas

**Alerta**:
Notificação disparada automaticamente por evento clínico ou operacional. Pertence à Internação. Cinco tipos com comportamentos distintos ao ser respondido:
- **Sinal Vital Crítico**: dispara quando um parâmetro ultrapassa seu Limite de Alarme. Cada parâmetro fora do limite é um Alerta independente — dois parâmetros simultâneos (ex.: FC e PAS) são dois Alertas separados, cada um com título dinâmico por parâmetro (ex.: "FC Crítica") e reconhecido individualmente. Nunca duplica enquanto ativo. Encerra de três formas: "Ação Tomada", "Falso Positivo" (ambos por escolha do profissional) ou normalização automática (o valor volta ao normal sozinho, sem exigir ação de ninguém). O histórico não distingue qual das três encerrou — mostra só o alerta e a data/hora. Regra de novo disparo para o mesmo parâmetro: sem carência após "Falso Positivo" ou normalização automática (dispara na hora se sair do limite de novo); após "Ação Tomada", só dispara de novo se o valor passar por normal antes de piorar de novo (episódio novo, dispara na hora) ou, caso nunca normalize entre o clique e a leitura seguinte, somente depois de completar 60min desde o disparo original (evita duplicar a mesma crise ainda em andamento).
- **Escore**: dispara quando o Status Clínico do paciente piora de categoria (Estável→Atenção, Atenção→Risco Elevado, Risco Elevado→Crítico, ou saltos diretos como Estável→Crítico). Sem ícone — a severidade já é visível pela borda colorida do card e pelo rótulo do Escore, o Alerta só existe pra aparecer na lista de Alertas Ativos. Um só Alerta de Escore ativo por Internação: se uma piora nova disparar enquanto o anterior segue ativo (não reconhecido), o anterior é movido automaticamente para o histórico e o novo assume o lugar. Botão único "Ação Tomada" move para histórico. Auto-clear para o histórico se o Escore melhorar sozinho (volta a uma categoria menos severa) enquanto o alerta está ativo — nunca fica um alerta de paciente que já melhorou. Regra de novo disparo (mesma lógica do Sinal Vital Crítico, ancorada no disparo original): depois de "Ação Tomada", se o Escore piorar de categoria de novo, dispara na hora (episódio novo); se ficar parado na mesma categoria (nem melhora, nem piora), só dispara de novo após completar 60min do disparo original.
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

> Dev: "Vou calcular o EWS usando a mediana dos sinais vitais do Slot Temporal, pra suavizar ruído de leitura."
> Domínio: "Não — mediana não é um conceito clínico. Use sempre a última leitura válida do slot. Se ela vier vazia ou zerada, use a leitura válida anterior dentro do mesmo slot, nunca uma agregação estatística." (decisão revisada após validação com equipe médica do hospital; a versão anterior deste documento recomendava mediana)

> Dev: "Vou aplicar a mesma regra de 'última leitura válida' no Nível de Consciência também, igual aos outros parâmetros do Escore."
> Domínio: "Não — NC não é medido por sensor, é avaliado pela enfermagem de tempo em tempo. Sempre foi o estado atual, e continua sendo — a mudança de regra dos demais sinais vitais não afeta o NC."

> Dev: "O paciente clicou 'Ação Tomada' no alerta de FC, mas o próximo valor ainda veio fora do Limite de Alarme. Vou disparar um novo alerta."
> Domínio: "Não ainda — se o valor nunca passou por normal desde o disparo original, é a mesma crise continuando, não um evento novo. Só dispara de novo depois de completar 60min do disparo original. Agora, se o valor tivesse normalizado em algum momento e piorado de novo depois — mesmo dentro dessa primeira hora — aí sim é um episódio novo e dispara na hora."

> Dev: "Vou fazer o Limite de Alarme esperar o Slot Temporal fechar antes de avaliar, igual o Escore EWS faz com a Janela de Escore."
> Domínio: "Não — o Limite de Alarme avalia a leitura bruta assim que ela chega, sem esperar nenhuma agregação. Sinal vital muda de forma gradual; esperar um Slot Temporal de 15 min pra disparar atrasaria a detecção de uma deterioração real. Isso é decoupled tanto do Slot Temporal (usado só pra exibição) quanto da Janela de Escore (usada só pro Escore)."

> Dev: "Já que o Escore EWS agora usa mediana (Janela de Escore), vou usar mediana pra suavizar o gráfico de FC também."
> Domínio: "Não — mediana é exclusiva da Janela de Escore. Sinal Vital individual (gráfico, card, Limite de Alarme) continua sempre com a última leitura válida do Slot Temporal — precisa reagir em tempo real, sem suavização. São dois conceitos com necessidades diferentes: um exige reatividade imediata, o outro exige estabilidade clínica. Ver ADR-0004."
