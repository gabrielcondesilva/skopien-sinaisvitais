# Requisitos de Integração — SKOPIEN v1

Mapeamento de cada módulo para as fontes de dados reais necessárias em uma implantação hospitalar.  
A versão demo usa simulação client-side; este documento descreve o que substituiria essa simulação.

---

## Fontes de Dados Esperadas

| Sigla | Sistema | Exemplos de mercado |
|---|---|---|
| **HIS** | Hospital Information System / PEP | MV, Tasy, Soul MV, Philips Tasy |
| **MON** | Monitores de beira leito (telemetria) | Philips IntelliVue, GE Carescape |
| **FAR** | Sistema de farmácia | Medstation (Omnicell), Pyxis |
| **CC** | Centro cirúrgico / agendamento cirúrgico | Optimus, Cirurgia Inteligente |
| **HIG** | Sistema de gestão de higienização | Próprio ou módulo do HIS |
| **BIS** | Business Intelligence / Data Warehouse | Power BI embedded, Tableau |

---

## Por Módulo

### 1. Monitoramento Clínico (Leitos, UTI, CC)

**Fonte:** MON + HIS

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Sinais vitais: FR, SpO₂, PAS, FC, Temperatura | Tempo real (30–60 s) | HL7 v2 ORU ou FHIR Observation |
| Nível de Consciência (AVPU) | Por avaliação de enfermagem (pontual, não contínuo) | FHIR Observation (código AVPU) |
| Admissão/alta de leito | Evento | HL7 ADT A01/A03 |
| Dados demográficos do paciente | Admissão | HL7 ADT A01 |
| Diagnóstico principal (CID-10) | Admissão / atualização | FHIR Condition |
| Classificação de risco Manchester | Triagem | FHIR Observation / campo HIS |
| Prescriçao de bomba de infusão | Prescrição | HL7 RAS ou API HIS |

**Latência aceitável:** ≤ 60 s para alertas EWS; ≤ 5 min para KPIs de ocupação.

---

### 2. AlertEngine — Medicação

**Fonte:** FAR

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Prescrição de medicamento com horário | Evento | HL7 OMP ou FHIR MedicationRequest |
| Confirmação de administração | Evento | HL7 RAS ou FHIR MedicationAdministration |
| Atraso calculado (previsto × real) | Derivado | Calculado no backend SKOPIEN |

---

### 3. Visão Administrativa — Pronto Socorro

**Fonte:** HIS

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Timestamp de chegada do paciente (porta) | Admissão | HL7 ADT A04 |
| Timestamp de triagem | Evento | FHIR Encounter |
| Timestamp de primeiro atendimento médico | Evento | FHIR Encounter |
| Alta do PS ou transferência para internação | Evento | HL7 ADT A03/A02 |
| Status de boarding (aguardando leito) | Derivado | Calculado no backend |

---

### 4. Visão Administrativa — Centro Cirúrgico

**Fonte:** CC + HIS

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Agendamento cirúrgico (procedimento, cirurgião, sala, horário) | D-1 | FHIR Appointment |
| Entrada e saída da sala cirúrgica | Evento | FHIR Encounter |
| Início e fim de anestesia | Evento | HL7 ORU ou campo específico CC |
| Entrada e saída da SRPA (RA) | Evento | FHIR Encounter |
| Cancelamento e motivo | Evento | FHIR Appointment (status=cancelled + reasonCode) |

---

### 5. Visão Administrativa — Alertas

**Fonte:** Gerado internamente pelo SKOPIEN a partir dos demais módulos.  
Não requer integração adicional além das listadas acima.

---

### 6. Dashboards Painéis — Capacity × Demand

**Fonte:** HIS + BIS

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Leitos totais por especialidade | Diário | API HIS ou view SQL |
| Leitos disponíveis em tempo real | Tempo real | HL7 ADT ou API HIS |
| Altas previstas (alta médica assinada) | Evento | FHIR Encounter (status=planned-discharge) |
| Altas confirmadas | Evento | HL7 ADT A03 |
| Demanda prevista (forecasting) | Diário | Modelo preditivo externo ou BIS |

---

### 7. Dashboards Painéis — Permanência CID

**Fonte:** HIS + BIS (histórico)

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Internações dos últimos 30–90 dias | Batch diário | FHIR Bundle ou export CSV/SQL |
| CID-10 principal por internação | Por episódio | FHIR Condition |
| Datas de admissão e alta | Por episódio | FHIR Encounter |
| Convênio / modalidade de pagamento | Por episódio | FHIR Coverage |
| Especialidade e departamento | Por episódio | FHIR Encounter.serviceType |

---

### 8. Dashboard Bed Cleaning

**Fonte:** HIG + HIS

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Solicitação de higienização (leito liberado) | Evento | Webhook HIS ou API HIG |
| Aceite da equipe de higiene | Evento | API HIG |
| Início e fim de cada etapa de higienização | Evento | API HIG |
| Status do funcionário (ocupado, disponível…) | Tempo real | API HIG |

---

### 9. Dashboards Preditivos (Patient Prediction, Admission Prediction)

**Fonte:** BIS / modelo de ML externo + HIS em tempo real

| Campo necessário | Frequência | Formato sugerido |
|---|---|---|
| Score de probabilidade de internação por paciente PS | Tempo real (por visita) | API REST do modelo |
| Score de deterioração clínica (EWS projetado) | Por tick de sinais vitais | Calculado internamente |
| Histórico de internações para treinamento do modelo | Batch mensal | Export estruturado (CSV/Parquet) |
| Previsão de volume por especialidade (próximos 7 dias) | Diário | API BIS |

---

## Requisitos Não-Funcionais de Integração

| Requisito | Especificação |
|---|---|
| **Protocolo** | HL7 v2.x (TCP/MLLP) ou FHIR R4 (REST/JSON) |
| **Autenticação** | OAuth 2.0 (client credentials) ou mTLS para feeds de telemetria |
| **Latência sinais vitais** | P95 ≤ 3 s do monitor ao SKOPIEN |
| **Disponibilidade feed** | 99,5% — o SKOPIEN degrada graciosamente (último valor conhecido) |
| **Retenção de histórico** | Sinais vitais brutos: 72 h em memória; 1 ano em storage frio |
| **Conformidade** | LGPD: dados trafegam em rede privada hospitalar; sem PII em logs |

---

## Diagrama de Fluxo Simplificado

```
Monitores beira leito
        │ HL7 ORU (30s)
        ▼
 Integration Layer          ◄── HIS (ADT, RAS, OMP)
 (HL7/FHIR adapter)         ◄── CC scheduler
        │ WebSocket / SSE
        ▼
 SKOPIEN Backend             ── Alertas, EWS, Forecasts
        │ REST/JSON
        ▼
 SKOPIEN Frontend (Next.js)
```

Na v1 demo, toda a Integration Layer é substituída pelo `SimulationEngine` client-side.
