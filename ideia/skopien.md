# Projeto SKOPIEN

## 1. Contexto do Projeto

A SKOPIEN é uma empresa que atua no ramo da saúde, com foco na implementação de equipamentos de monitoramento de sinais vitais em clínicas e hospitais, em tempo real.

Queremos desenvolver uma aplicação web que funcionará em uma central de comando: uma sala com televisões voltadas ao monitoramento de indicadores em painéis que serão desenvolvidos pela nossa equipe.

Além dos sinais vitais coletados pelos nossos equipamentos, também precisaremos integrar dados dos sistemas dos hospitais, como informações de pacientes, diagnósticos, admissões, altas, prescrições, entre outros dados assistenciais e administrativos.

Será necessário estruturar um Data Warehouse ou Data Lake com os dados coletados dos sistemas hospitalares e dos nossos monitores.

Os dados de sinais vitais serão coletados praticamente a cada segundo, o que gerará um grande volume de dados. Por isso, precisamos estruturar a aplicação e a arquitetura de dados de forma adequada para lidar com alta frequência de coleta, armazenamento, processamento e visualização em tempo real.

Na primeira versão, o objetivo será apresentar a solução aos clientes. Por esse motivo, utilizaremos dados fictícios, sem necessidade de banco de dados real neste primeiro momento. A aplicação deverá exibir informações coerentes, com comportamento visual de atualização em tempo real conforme o usuário acessa o sistema.

---

## 2. Estrutura Geral do Projeto

O projeto contará com uma página de login, onde os usuários acessarão a plataforma utilizando e-mail e senha.

Na página de login, teremos a logo da SKOPIEN e uma breve descrição do sistema:

> **"Monitoramento inteligente de pacientes em tempo real."**

---

## 3. Perfis de Usuário

O sistema terá quatro perfis principais de acesso:

### 3.1 Assistencial

E-mail de acesso: `assistencial@hospital.com`

### 3.2 Gestor

E-mail de acesso: `gestor@hospital.com`

### 3.3 Executivo

E-mail de acesso: `executivo@hospital.com`

### 3.4 Painéis

E-mail de acesso: `dashboards@hospital.com`

---

## 4. Acessos por Perfil de Usuário

### 4.1 Perfil Assistencial

O usuário assistencial terá acesso somente às informações das unidades hospitalares.

No sistema, teremos uma sidebar com as seguintes unidades:

- Pronto Socorro
- Enfermaria
- Centro Cirúrgico
- UTI

Ao clicar em cada unidade, o usuário terá acesso aos cards dos leitos dos pacientes internados naquela unidade.

Cada card de leito deverá apresentar as seguintes informações:

- Número do leito
- Nome do paciente
- Idade
- Gênero
- Motivo da internação
- Tempo de internação
- Escore atual do paciente
- Status clínico: crítico, risco elevado, atenção ou estável

Ao clicar em um card de leito, o usuário será direcionado para a página do paciente.

---

#### 4.1.1 Página do Paciente

Na página do paciente, serão exibidos os dados principais do paciente, uma câmera para monitoramento contínuo 24 horas e abas com informações clínicas.

As abas serão:

- Sinais Vitais
- Histórico e Predição EWS
- Predição de Internação

---

#### 4.1.2 Aba de Sinais Vitais

Na aba de sinais vitais, teremos cinco cards principais, exibindo os valores dos sinais vitais de acordo com o slot de tempo selecionado pelo usuário.

Também teremos gráficos temporais dos sinais vitais, com a opção de alternar para visualização em heatmap.

O usuário poderá selecionar a janela de tempo desejada para análise dos gráficos, por exemplo:

- Última hora
- Últimas 3 horas
- Período personalizado definido pelo usuário

Também será possível selecionar os slots de análise. Os slots representam a mediana dos valores coletados em determinado intervalo de tempo.

> **Exemplo:** Se o usuário selecionar um slot de 15 minutos, o sistema deverá considerar todos os valores coletados nos últimos 15 minutos e calcular a mediana desse período.

A preferência pela mediana ocorre porque podem existir ruídos ou erros pontuais nas coletas — por exemplo, quando o paciente se movimenta bruscamente. Dessa forma, a mediana ajuda a reduzir o impacto de valores fora do padrão.

---

#### 4.1.3 Histórico e Predição EWS

A aba de Histórico e Predição EWS exibirá a pontuação do paciente ao longo do tempo, também utilizando slots temporais.

O EWS *(Early Warning System)* é um sistema de pontuação baseado em sinais clínicos do paciente. Por exemplo, se o paciente tiver BPM entre 51 e 100, a pontuação pode ser 0. Outros sinais vitais também contribuem para a pontuação final.

Como será a primeira vez que implementaremos esse modelo, será necessário pesquisar e validar corretamente as regras de cálculo do EWS para que a lógica seja aplicada de forma adequada.

Com base nesse histórico, também calcularemos a predição dos sinais vitais do paciente, exibindo gráficos temporais que mostrem:

- O comportamento atual dos sinais vitais
- A previsão para as próximas horas
- Indicação de situações críticas
- Qual sinal vital pode estar entrando em estado crítico

---

#### 4.1.4 Predição de Internação

Na aba de Predição de Internação, utilizaremos um modelo reconhecido no ambiente hospitalar para prever a possibilidade de internação com base em dados históricos e informações clínicas do paciente.

Entre os dados utilizados, poderemos considerar:

- Classificação de Manchester
- Como o paciente chegou ao hospital
- Idade
- Sinais vitais
- Diagnóstico
- Histórico clínico
- Outros dados relevantes do atendimento

---

#### 4.1.5 Alertas

Todas as páginas deverão contar com alertas relacionados aos pacientes e leitos.

Os alertas também deverão aparecer em um ícone de alerta, onde o usuário poderá clicar para visualizar todos os alertas ativos.

Além disso, cada leito com alerta ativo deverá exibir uma insígnia visual no card do leito. Cada tipo de alerta terá uma insígnia diferente.

##### Tipos de Alertas

**Alerta de previsão de alta**

Quando o modelo preditivo de alta identificar que um paciente tem previsão de alta, o sistema deverá disparar um alerta informando que o modelo previu a possibilidade de alta.

O médico poderá clicar para manter ou não manter essa previsão. Essa ação indicará que ele avaliou o caso e tomou uma decisão, seja para preparar o paciente para alta ou para manter o paciente internado.

**Alerta de sinais vitais**

Quando um sinal vital estiver em estado crítico, o sistema deverá exibir um alerta informando:

- Paciente
- Leito
- Sinal vital crítico
- Valor identificado
- Botão de "Ação tomada pela equipe"

Esses serão considerados alertas clínicos.

**Alerta de medicação por alergia**

Quando um paciente tiver uma medicação prescrita e possuir alergia relacionada àquele medicamento, o sistema deverá disparar um alerta.

O alerta deverá apresentar as informações relevantes da prescrição e conter o botão de "Ação tomada pela equipe".

**Alerta de medicação atrasada**

Quando um paciente tiver uma medicação prescrita para determinado horário e não houver baixa ou confirmação da administração, o sistema deverá disparar um alerta.

O alerta deverá informar:

- Paciente
- Leito
- Medicação prescrita
- Horário previsto
- Status de atraso
- Botão de "Ação tomada pela equipe"

---

#### 4.1.6 Particularidades do Centro Cirúrgico

A estrutura geral será aplicada a todos os leitos das unidades. Porém, no Centro Cirúrgico, também teremos o controle do fluxo das cirurgias.

Nos cards dos pacientes do Centro Cirúrgico, além das informações do paciente, será exibido o fluxo cirúrgico para controle do tempo de cada etapa.

O fluxo será:

```
Admissão → Procedimento → RA → Quarto
```

O sistema deverá mostrar em qual etapa a cirurgia se encontra no momento atual.

Ao avançar para o próximo passo do fluxo, o sistema deverá registrar o horário de início da nova etapa e marcar o status como "Em andamento".

Na etapa anterior, deverá ser exibido o horário de início e o tempo total de duração.

> **Exemplo:** `Admissão — 06:45 — 28 min`

Além disso, alguns cards de leito deverão exibir uma insígnia de bomba de infusão, indicando os pacientes que estão utilizando bomba de infusão.

---

## 5. Perfil Gestor

O perfil gestor terá acesso às visões das unidades e também a uma seção adicional no sidebar chamada **Visão Administrativa**.

A Visão Administrativa contará com dashboards das unidades e dos alertas.

---

### 5.1 Dashboard do Pronto Socorro

#### KPI Cards

- Tempo de porta
- LOS do Pronto Socorro
- Taxa de internação
- Boarding time médio

#### Gráficos e Tabelas

- Tempo de porta em gráfico temporal
- Distribuição do LOS por faixa de horário, com barras ou colunas para intervalos como `<2h`, `2-4h`, `4-6h`, entre outros
- Boarding x leitos livres em gráfico temporal
- Desempenho por turno em tabela, com:
  - Quantidade de atendimentos
  - Tempo de porta
  - LOS médio
  - Boarding
  - Status: OK ou crítico

Os turnos serão separados em: **Manhã · Tarde · Noite · Madrugada**

---

### 5.2 Dashboard da Enfermaria

#### KPI Cards

- LOS médio
- Taxa de ocupação
- Readmissão
- Gap médio de alta
- Altas hoje

#### Gráficos

- Readmissão por especialidade: Cardiologia, Nefrologia, Pneumologia, Oncologia, Ortopedia
- Gap de alta médica nos últimos 7 dias, exibindo o tempo médio de gap por barra ou coluna

---

### 5.3 Dashboard da UTI

#### KPI Cards

- LOS da UTI
- Taxa de ocupação
- Delay pós-alta
- Mortalidade ajustada
- Taxa de infecção (IRAS)

#### Gráficos

- Tendência do LOS em gráfico temporal
- SMR / mortalidade ajustada em gráfico temporal

---

### 5.4 Dashboard do Centro Cirúrgico

#### KPI Cards

- Ocupação de sala
- Tempo de sala ociosa
- Turnover entre cirurgias
- Cancelamento cirúrgico
- Aderência ao mapa cirúrgico

#### Gráficos

- Cancelamento por motivo: Paciente, Cirurgião, Anestesia, Material, Infecção, Outros
- Ocupação de salas por turno: Manhã, Tarde, por dia da semana, últimos 7 dias
- Aderência ao mapa cirúrgico nas últimas 4 semanas

---

### 5.5 Dashboard de Alertas

#### KPI Cards

- Total de alertas
- Medicação atrasada
- Alergia
- Previsão de alta
- Sinais vitais
- Alertas respondidos
- Alertas pendentes
- Tempo médio de resposta

#### Gráficos e Tabelas

- Volume de alertas por unidade
- Resposta por profissional, em tabela com:
  - Nome do profissional
  - Quantidade de alertas respondidos
  - Tempo médio de resposta

---

## 6. Perfil Executivo

O perfil executivo terá acesso somente à **Visão Administrativa**.

Esse perfil não terá acesso às telas assistenciais detalhadas dos pacientes, unidades e leitos, a menos que isso seja definido futuramente.

---

## 7. Perfil Painéis

O perfil Painéis terá acesso a uma tela chamada **Central de Comando**, composta por 10 dashboards.

Cada dashboard será representado por um card contendo:

- Nome do dashboard
- Status "Ao vivo"
- Link de acesso ao painel

---

## 8. Dashboards da Central de Comando

### 8.1 Emergency Unit

**Rota:** `/dashboards/emergency-unit`

#### KPI Cards

- Tempo Porta → Triagem
- Tempo Porta → Médico
- LOS (tempo total no Pronto Socorro)
- Espera por leito (boarding time)

#### Gráficos e Tabelas

- Sparklines de pacientes por unidade, em grid com linha de tendência por unidade
- Bed Wait by Accommodation, com barras por tipo de acomodação: CMC, Semi Adulto, UTI Pediátrica, UTI Adulto, Pediatria
- Tabela LOS: pacientes e tempo de permanência no Pronto Socorro
- Tabela Waiting for Bed: pacientes aguardando leito e tempo de espera

---

### 8.2 Gestão de Atraso Cirúrgico

**Rota:** `/dashboards/gestao-cirurgica`

#### Tabelas

Tabela principal com 13 colunas de timestamps do fluxo cirúrgico, incluindo:

- Entrada
- Início da anestesia
- Início da cirurgia
- Fim da cirurgia
- Saída da sala
- Entrada na recuperação
- Saída da recuperação
- Entre outros marcos do fluxo

As células deverão ser coloridas por nível de atraso:

| Cor | Significado |
|---|---|
| 🟢 Verde | Dentro do prazo |
| 🟡 Amarelo | Atenção |
| 🔴 Vermelho | Atrasado |

---

### 8.3 Operating Room

**Rota:** `/dashboards/operating-room`

#### KPI Cards

8 cards organizados em 2 linhas de 4:

- Taxa de ocupação geral das salas
- Número de cirurgias realizadas no dia
- Tempo médio de cirurgia
- Taxa de cancelamento
- Turnover médio entre cirurgias
- Tempo de sala ociosa
- Aderência ao mapa cirúrgico
- Cirurgias agendadas x realizadas

#### Gráficos

- Gauges das 4 salas cirúrgicas em tempo real: **CC01 · CC02 · CC03 · CC04**
- Gráfico de linha com chegadas por hora ao longo do dia
- Gráfico de barras com previsão semanal de cirurgias

---

### 8.4 Capacity × Demand

**Rota:** `/dashboards/capacity-demand`

#### Componentes

- Header com o saldo final do hospital: leitos disponíveis x demanda prevista
- Grid com 12 especialidades

Cada especialidade terá 6 badges internos:

- Total de leitos
- Leitos disponíveis
- Altas previstas
- Altas confirmadas
- Pendentes (pacientes aguardando leito)
- Demanda prevista *(exibida em vermelho — dado do modelo preditivo)*

**Especialidades:** MAT, ONC, PED, CAR, NEU, ORT, CLI, CIR, PNE, NEF + 2 a definir

---

### 8.5 Performance de Alta até 10h

**Rota:** `/dashboards/performance-alta`

#### KPI Cards

- Indicadores de performance geral de altas até 10h
- Percentual geral do hospital

#### Gráficos

- Gráfico principal com percentual de altas até 10h por ala, em barras horizontais ou linha
- 3 gráficos menores na parte inferior
- Gauges SVG circulares customizados para Maternidade e Pediatria

---

### 8.6 Tempo de Permanência CID

**Rota:** `/dashboards/tempo-permanencia-cid`

#### KPI Cards

- LOS médio geral
- Total de internações no período
- LOS médio por convênio
- Outros KPIs relacionados à permanência

#### Gráficos e Componentes

- Gráfico principal CID x LOS médio, com barras horizontais por diagnóstico
- Gráfico de distribuição de pacientes por departamento
- Pirâmide etária segmentada por sexo (Azul: feminino · Roxo: masculino · 6 faixas etárias)
- Gráfico ou tabela de convênios: Bradesco, Unimed, Sul América, Amil, One Health, Particular, SUS
- Sumário estatístico: Média, Mediana, Desvio

---

### 8.7 Agendamento Anestésico

**Rota:** `/dashboards/agendamento-anestesico`

#### Header

> **Volume de pacientes: X**

#### Tabela Principal

Colunas:

- Data/hora
- Nome do procedimento (português e inglês)
- Setor
- Situação
- Tipo de atendimento

#### Filtros

**Status:** Marcado · Cancelado · Inconsistente · Suspenso

**Setor:** Imagem · Hemodinâmica · Intervenção · Endoscopia

As situações deverão ser exibidas com badges coloridos por status.

---

### 8.8 Bed Cleaning

**Rota:** `/dashboards/bed-cleaning`

#### KPI Cards

- Cumprimento de meta de higiene (percentual de leitos higienizados dentro do tempo)

#### Gráficos (grid 2×2)

- **Espera por hora:** gráfico de linha — tempo de espera por solicitação ao longo do dia
- **Aceite por hora:** gráfico de linha — tempo de aceite da tarefa ao longo do dia
- **Desempenho por etapa:** barras com tempo médio em cada etapa (Solicitação, Aceite, Início, Conclusão)
- **Status Higiene:** distribuição atual dos leitos (Aguardando, Em andamento, Concluído)
- **Status Funcionário:** gráfico donut (Ocupado, Disponível, Em refeição, Ausente)

---

### 8.9 Patient Prediction

**Rota:** `/dashboards/patient-prediction`

#### KPI Cards

- Volume de pacientes hoje (dado real)
- Previsão para amanhã
- Altas previstas para hoje
- Erro percentual médio do modelo

#### Gráficos

- Gráfico principal: volume real + forecast (linha real x linha de previsão)
- Gráfico de erro percentual diário do modelo
- Gráfico de agendamento cirúrgico previsto
- 6 mini gráficos de previsão por especialidade (grid 2×3)

---

### 8.10 Admission Prediction

**Rota:** `/dashboards/admission-prediction`

#### KPI Cards

- Forecast de internações para os próximos 7 dias
- Possíveis internações vindas do Pronto Socorro agora
- Total de pacientes em atendimento no PS com alta probabilidade de internação

#### Gráficos e Componentes

- Gráfico de barras: forecast de internações para os próximos 7 dias
- Gráfico de linha dupla: real x predito por hora do dia
- Gráfico de perfil etário dos pacientes com probabilidade de internação
- Grid de predição por especialidade e unidade de destino: Enfermaria, UTI, Centro Cirúrgico
- Lista ou nuvem de diagnósticos mais frequentes entre os candidatos à internação
- Tabela de pacientes com: probabilidade de internação, EWS atual, Classificação de Manchester, unidade prevista

---

## 9. Documentação de Mapeamento de Dados e APIs

Durante o desenvolvimento do projeto, também precisaremos construir uma documentação clara de mapeamento de dados.

Essa documentação deverá indicar quais informações precisaremos solicitar ao hospital e quais APIs serão necessárias para cada parte do sistema.

A documentação deverá ser organizada por:

- Perfil de usuário
- Página ou módulo do sistema
- Unidade hospitalar
- Dashboard
- Indicadores utilizados
- Fonte de dados necessária
- API necessária
- Campos esperados
- Frequência de atualização
- Observações técnicas

Para cada usuário, será necessário documentar quais APIs serão utilizadas.

Para cada dashboard, também será necessário indicar quais APIs, tabelas ou integrações serão necessárias para alimentar os indicadores, gráficos, tabelas e alertas.

Essa documentação deve ser bem estruturada, objetiva e clara para o cliente, permitindo que o hospital entenda exatamente quais dados precisará disponibilizar para que a plataforma funcione corretamente.

---

## 10. Objetivo da Primeira Versão

A primeira versão do projeto será uma versão demonstrativa para apresentação aos clientes.

Nesta etapa, não será necessário implementar banco de dados real ou integração com APIs hospitalares.

O foco será criar uma aplicação visualmente completa, com dados fictícios coerentes, dashboards funcionais e atualização simulada em tempo real.

Essa versão deverá demonstrar:

- A experiência da central de comando
- A navegação por perfis de usuário
- A visão assistencial por unidade, leito e paciente
- Os alertas clínicos e operacionais
- Os dashboards administrativos
- Os dashboards da central de comando
- A lógica visual de monitoramento em tempo real
- A estrutura esperada para evolução futura com dados reais

---

## 11. Pontos Importantes para Evolução do Projeto

Após a primeira versão demonstrativa, o projeto deverá evoluir para uma arquitetura real com:

- Integração com sistemas hospitalares
- Integração com os equipamentos de monitoramento da SKOPIEN
- Estruturação de Data Warehouse ou Data Lake
- Modelo de dados para sinais vitais em alta frequência
- Armazenamento e processamento de dados em tempo real
- APIs para pacientes, leitos, admissões, altas, prescrições, cirurgias e alertas
- Modelos preditivos para EWS, alta, internação e sinais vitais
- Dashboards alimentados por dados reais
- Histórico clínico e operacional dos pacientes
- Auditoria das ações tomadas pelas equipes

---

## 12. Design Visual

As definições de identidade visual da plataforma — como paleta de cores, tipografia, espaçamentos, componentes visuais e guia de estilo — serão tratadas em uma etapa dedicada ao final do desenvolvimento do sistema.

Na primeira versão demonstrativa, o foco será na estrutura funcional, navegação e completude das informações. O refinamento visual será realizado após a validação da arquitetura e dos fluxos da aplicação.
