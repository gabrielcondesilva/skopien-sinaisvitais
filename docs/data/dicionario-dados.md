# Dicionário de Dados — SKOPIEN v1

Referência completa das entidades, campos e invariantes do modelo de dados interno.  
Baseado em `lib/simulation/types.ts` e nos stores Zustand.

---

## Entidades Principais

### Patient

Representa o paciente cadastrado. Imutável após criação.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único (gerado internamente) |
| `name` | `string` | Nome completo |
| `age` | `number` | Idade em anos |
| `gender` | `"M" \| "F"` | Sexo biológico |
| `admissionReason` | `string` | Motivo principal da admissão |
| `admittedAt` | `number` | Timestamp ms da admissão na unidade |

---

### Internacao

Vínculo entre paciente e leito em uma unidade clínica. Contém todo o histórico de sinais vitais.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único |
| `patient` | `Patient` | Dados do paciente |
| `bedId` | `string` | ID do leito vinculado |
| `unit` | `UnitId` | Unidade de internação |
| `hasPump` | `boolean` | Bomba de infusão ativa |
| `baseline` | `VitalsBaseline` | Valores-alvo para simulação por mean reversion |
| `rawHistory` | `RawReading[]` | Leituras brutas das últimas 3 horas (janela deslizante) |
| `currentEws` | `number` | Escore EWS da última leitura (0–14) |
| `currentStatus` | `StatusClinico` | Status derivado do EWS atual |
| `ewsForecast` | `{t, ews}[]` | Previsão de EWS para as próximas 2 horas (24 pontos × 5 min) |
| `admissionProbability` | `number` | Probabilidade de internação hospitalar (0–100) |
| `manchesterClass` | `ManchesterClass` | Classificação de risco Manchester |

**Invariantes:**
- Sinais vitais e alertas pertencem à Internação, não ao Paciente
- `rawHistory` nunca contém leituras com mais de 3 horas de idade
- `currentStatus` é sempre derivado de `currentEws` — nunca definido manualmente

---

### SurgicalInternacao

Estende `Internacao` com fluxo cirúrgico. Usada exclusivamente no Centro Cirúrgico.

| Campo adicional | Tipo | Descrição |
|---|---|---|
| `procedureName` | `string` | Nome do procedimento cirúrgico |
| `surgeonName` | `string` | Nome do cirurgião responsável |
| `surgicalFlow` | `SurgicalStep[]` | 4 etapas: Admissão → Procedimento → RA → Quarto |
| `currentStep` | `number` | Índice da etapa ativa (0–3) |

---

### SurgicalStep

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | `string` | Nome da etapa |
| `startedAt` | `number \| null` | Timestamp ms de início (null = ainda não iniciada) |
| `completedAt` | `number \| null` | Timestamp ms de conclusão (null = ainda em andamento) |

---

### Bed

Representa um leito físico. Existe independentemente de haver internação ativa.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único |
| `label` | `string` | Rótulo de exibição (ex.: `PS-01`, `UTI-03`, `CC01`) |
| `unit` | `UnitId` | Unidade à qual o leito pertence |
| `internacaoId` | `string \| null` | ID da internação ativa, ou `null` se disponível |

**Invariante:** Leito sem internação ativa exibe "Leito Disponível" — o card existe, sem dados clínicos.

---

### RawReading

Leitura bruta de um instante de tempo. Gerada a cada tick (~5 s).

| Campo | Tipo | Descrição |
|---|---|---|
| `t` | `number` | Timestamp ms |
| `fr` | `number` | Frequência respiratória (rpm) |
| `spo2` | `number` | Saturação de oxigênio (%) |
| `pas` | `number` | Pressão arterial sistólica (mmHg) |
| `fc` | `number` | Frequência cardíaca (bpm) |
| `temp` | `number` | Temperatura corporal (°C) |
| `nc` | `"Alerta" \| "Confuso" \| "Responde à Dor" \| "Inconsciente"` | Nível de Consciência (AVPU). Avaliação categórica pontual — não sofre random walk, acompanha o estado atual do baseline/roteiro |

---

### SlotReading

Mediana das `RawReading` em uma janela temporal (padrão 15 min). Valor exibido nos cards. Exceção: `nc` não é medianado (é categórico) — usa o valor mais recente do slot.

| Campo adicional | Tipo | Descrição |
|---|---|---|
| `ewsTotal` | `number` | Escore EWS calculado para o slot |
| `ewsStatus` | `StatusClinico` | Status clínico do slot |

**Invariante:** O valor exibido nos cards é sempre a mediana do Slot Temporal — nunca o valor bruto.

---

### Alert

Evento clínico ativo ou encerrado.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` | Identificador único |
| `type` | `AlertType` | Tipo do alerta |
| `internacaoId` | `string` | Internação relacionada |
| `patientName` | `string` | Nome do paciente |
| `bedLabel` | `string` | Rótulo do leito |
| `unit` | `UnitId` | Unidade |
| `message` | `string` | Mensagem exibida ao profissional |
| `firedAt` | `number` | Timestamp ms de disparo |
| `status` | `AlertStatus` | `active`, `dismissed`, ou `auto-cleared` |
| `dismissedAt` | `number?` | Timestamp ms do reconhecimento |
| `dismissAction` | `string?` | Ação tomada (texto livre) |

---

## Tipos Enumerados

### UnitId
```
"pronto-socorro" | "enfermaria" | "uti" | "centro-cirurgico"
```

### StatusClinico
| Valor | EWS | Descrição |
|---|---|---|
| `"Estável"` | 0–2 | Sem sinais de deterioração |
| `"Atenção"` | 3–4 | Monitoramento reforçado |
| `"Risco Elevado"` | 5–6 | Intervenção recomendada |
| `"Crítico"` | ≥ 7 | Intervenção imediata |

> **Regra de exceção:** qualquer sinal vital com pontuação individual 3 eleva o status mínimo para "Atenção", mesmo que o total seja ≤ 2.

### AlertType
| Valor | Disparo | Encerramento |
|---|---|---|
| `"sinal-vital"` | EWS cruza para Crítico | Auto-cleared quando status normaliza |
| `"medicacao"` | Roteirizado (~8 min) | Reconhecimento manual |
| `"alta"` | Roteirizado (~12 min) | Confirmar Alta ou Manter Internado |
| `"bomba-infusao"` | Roteirizado | Reconhecimento manual |

### ManchesterClass
`"Vermelho" | "Laranja" | "Amarelo" | "Verde" | "Azul"`

### UserProfile
| Perfil | Rota inicial | Acesso |
|---|---|---|
| `assistencial` | `/units/pronto-socorro` | Unidades + Pacientes |
| `gestor` | `/units/pronto-socorro` | Unidades + Pacientes + Admin |
| `executivo` | `/admin` | Somente Admin |
| `paineis` | `/command` | Somente Command + Dashboards |

---

## Seed Data

| Unidade | Total | Ocupados | Disponíveis |
|---|---|---|---|
| Pronto Socorro | 12 | 10 | 2 |
| Enfermaria | 20 | 16 | 4 |
| UTI | 10 | 9 | 1 |
| Centro Cirúrgico | 6 | 4 | 2 |
| **Total** | **48** | **39** | **9** |

Histórico pré-populado: 15 minutos de leituras brutas no carregamento da aplicação.

---

## Ciclo de Atualização

```
SimulationEngine.advance() — a cada 5 segundos
  ├── nextReading() por internação (mean reversion + ruído gaussiano)
  ├── Trim de rawHistory (janela 3h)
  ├── calculateEWS() → currentEws + currentStatus
  └── checkScenes() → SceneAlert[] → AlertEngine.fireAlert()

AlertEngine.checkVitalAlerts() — chamado após cada advance()
  ├── Fire: internação ativa não estava em Crítico, agora está
  └── Auto-clear: internação ativa estava em Crítico, agora não está
```
