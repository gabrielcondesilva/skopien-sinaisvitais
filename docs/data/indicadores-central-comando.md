# Indicadores da Central de Comando

Documentação de negócio dos painéis da Central de Comando: o que cada cartão de KPI, gráfico e filtro exibe, quais dados são necessários para gerar cada número e como ele é calculado.

Cada seção corresponde a uma página da Central de Comando e deve ser lida junto com o screenshot correspondente.

---

## 1. Unidade de Emergência

Página: Pronto Socorro / Porta de Entrada.

### 1.1 Cartões de KPI

**Porta → Triagem**
- O que mostra: tempo médio entre a chegada do paciente na unidade e o momento em que ele é triado, e quantos pacientes estão na fila aguardando triagem.
- Dados necessários: hora de chegada do paciente e hora em que a triagem foi realizada, por paciente.
- Cálculo: *tempo médio* = média de (hora da triagem − hora de chegada) de todos os pacientes triados no período. *Pacientes na fila* = contagem de pacientes com hora de chegada registrada que ainda não foram triados.

**Porta → Médico**
- O que mostra: tempo médio entre a chegada do paciente e o atendimento médico, e quantos pacientes aguardam esse atendimento.
- Dados necessários: hora de chegada e hora do atendimento médico, por paciente.
- Cálculo: *tempo médio* = média de (hora do atendimento médico − hora de chegada). *Pacientes na fila* = contagem de pacientes já triados que ainda não tiveram atendimento médico.

**Permanência Média**
- O que mostra: tempo médio que os pacientes em atendimento estão passando na unidade, do momento da admissão até agora.
- Dados necessários: hora de admissão de cada paciente atualmente em atendimento.
- Cálculo: média de (agora − hora de admissão) para os pacientes atualmente em atendimento na unidade.

**Espera por Leito / Leito Virtual**
- O que mostra: tempo médio de espera por internação dos pacientes já autorizados a internar, e quantos pacientes estão nessa situação ("leito virtual" = paciente já autorizado a internar que aguarda porque não há leito disponível na unidade de destino).
- Dados necessários: pacientes com internação autorizada e o momento em que a autorização ocorreu.
- Cálculo: *Espera por Leito* = média do tempo decorrido (agora − hora da autorização de internação) entre esses pacientes. *Leito Virtual* = quantidade de pacientes nessa situação.

### 1.2 Cartões de contagem

**Pacientes no Dia**
- O que mostra: total de pacientes admitidos na unidade no dia.
- Dados necessários: data de admissão de cada paciente.
- Cálculo: contagem de pacientes únicos com data de admissão dentro do dia.

**Aguardando Exame**
- O que mostra: quantos pacientes deram entrada no PS e estão aguardando resultado de exame.
- Dados necessários: data de admissão do paciente. **Validar: como descobrir o status/etapa do atendimento do paciente** (é preciso saber que o paciente está especificamente na etapa "aguardando exame", não só que foi admitido).
- Cálculo: contagem de pacientes na etapa "Aguardando Exame".

**Aguardando Retorno Médico**
- O que mostra: quantos pacientes aguardam uma resposta do médico.
- Dados necessários: data de admissão do paciente. **Validar: como descobrir o status/etapa do atendimento do paciente** (é preciso saber que o paciente está especificamente na etapa "aguardando retorno médico", não só que foi admitido).
- Cálculo: contagem de pacientes na etapa "Aguardando Retorno Médico".

### 1.3 Cartões de ocupação por unidade

**Pronto Socorro / Enfermaria / UTI / Centro Cirúrgico**
- O que mostra: percentual de ocupação de cada unidade.
- Dados necessários: cadastro de leitos de cada unidade e, para cada leito, se há uma internação ativa vinculada a ele.
- Cálculo: (leitos com internação ativa ÷ total de leitos cadastrados na unidade) × 100.

### 1.4 Gráficos

Não há gráficos nesta página. Todo o conteúdo é apresentado como cartões numéricos e tabelas.

### 1.5 Filtros

**Período** (Hoje / Ontem / Últimos 7 dias / Últimos 30 dias)
- O que filtra: restringe todos os números da página ao intervalo selecionado.

### 1.6 Tabelas

**Tempo de Permanência (PS)**
- O que mostra: pacientes atualmente internados no Pronto Socorro, ordenados do que está há mais tempo para o que está há menos tempo.
- Dados necessários: leitos do PS com internação ativa vinculada, paciente, motivo da admissão, hora de admissão, e sinais vitais/nível de consciência mais recentes de cada paciente.
- Colunas: Leito, Paciente, Motivo da admissão, Tempo decorrido (agora − hora de admissão), Status clínico (Estável/Atenção/Risco Elevado/Crítico, calculado a partir dos sinais vitais e nível de consciência).
- Destaque de cor no tempo: acima de 4h em vermelho, entre 2h e 4h em amarelo.

**Aguardando Internação**
- O que mostra: pacientes do PS com probabilidade relevante de precisar de internação, ordenados por tempo de espera (do mais antigo para o mais recente).
- Dados necessários: leitos do PS com internação ativa vinculada, paciente, hora de admissão, e status/etapa do atendimento de cada paciente. **Validar: como descobrir o status/etapa do atendimento do paciente.**
- Colunas: Leito, Paciente, Status de espera, Tempo de espera.

### 1.7 Dados Necessários para a Página

Lista consolidada dos dados brutos que precisam existir para a página funcionar de ponta a ponta:

- Cadastro de leitos por unidade (Pronto Socorro, Enfermaria, UTI, Centro Cirúrgico)
- Vínculo de cada leito com a internação
- Paciente vinculado a cada internação
- Motivo da admissão
- Hora de chegada do paciente
- Hora da triagem
- Hora do atendimento médico
- Hora de admissão
- Hora da autorização de internação (quando o paciente é autorizado a internar e passa a aguardar leito)
- Status/etapa do atendimento do paciente (ex.: aguardando exame, aguardando retorno médico) — **Validar: como descobrir o status/etapa do atendimento do paciente**

---

## Próximos painéis

Este documento será estendido, um painel por vez, seguindo o mesmo modelo: Cartões de KPI → Cartões de contagem/ocupação (quando existirem) → Gráficos → Filtros → Tabelas.
