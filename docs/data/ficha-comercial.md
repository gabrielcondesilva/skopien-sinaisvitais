# Ficha de Dados — SKOPIEN
### O que o hospital precisa disponibilizar para cada módulo

Documento para uso em reuniões comerciais e de pré-venda.  
Linguagem não técnica — direcionado a diretores hospitalares, TI e equipes de projetos.

---

## Como funciona a integração

O SKOPIEN se conecta aos sistemas que o hospital **já utiliza** — não é necessário substituir nenhum sistema existente. Nossa plataforma "lê" as informações que já transitam no hospital (prontuário, monitores, farmácia, centro cirúrgico) e as transforma em painéis em tempo real.

A integração é feita uma única vez durante a implantação, por nossa equipe técnica, em conjunto com a TI do hospital.

---

## Módulo 1 — Monitoramento Clínico em Tempo Real
*Leitos, UTI, Pronto Socorro*

**O que o SKOPIEN exibe:**  
Sinais vitais ao vivo, escore de risco EWS, alertas de deterioração, status de cada leito, câmera do leito.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Sinais vitais (frequência cardíaca, respiratória, pressão, saturação, temperatura) | Monitores multiparamétricos de beira leito |
| Admissões e altas de leito | Prontuário eletrônico (HIS/PEP) |
| Nome, idade, diagnóstico do paciente | Prontuário eletrônico |
| Classificação de risco Manchester | Triagem (módulo do prontuário) |

**Conectividade típica:** Os monitores de marcas como Philips e GE já possuem saída de dados padrão. A maioria dos prontuários brasileiros (MV, Tasy) também possui integração disponível.

---

## Módulo 2 — Alertas de Medicação

**O que o SKOPIEN exibe:**  
Alerta quando um medicamento está atrasado em relação ao horário prescrito.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Horário prescrito de cada medicamento | Sistema de farmácia / prontuário |
| Confirmação de administração pelo enfermeiro | Sistema de farmácia (ex.: Pyxis, Medstation) |

---

## Módulo 3 — Visão Administrativa (Gestores)
*Indicadores de PS, Enfermaria, UTI e Centro Cirúrgico*

**O que o SKOPIEN exibe:**  
KPIs de tempo de porta, LOS, boarding, taxa de ocupação, cancelamentos cirúrgicos, aderência ao mapa.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Horários de chegada, triagem e primeiro atendimento | Prontuário / sistema de triagem |
| Datas e horários de admissão e alta | Prontuário eletrônico |
| Agendamento cirúrgico (procedimento, sala, horário, cirurgião) | Sistema de gestão do centro cirúrgico |
| Motivo de cancelamento de cirurgia | Sistema de centro cirúrgico |
| Leitos disponíveis por especialidade | Prontuário eletrônico |

---

## Módulo 4 — Capacidade × Demanda

**O que o SKOPIEN exibe:**  
Saldo de leitos em tempo real por especialidade versus demanda prevista de internações.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Número de leitos por especialidade e unidade | Prontuário (cadastro fixo — atualização mensal) |
| Ocupação em tempo real | Prontuário eletrônico |
| Altas médicas já assinadas | Prontuário (campo de "previsão de alta") |
| Demanda prevista | Modelo preditivo (desenvolvido junto com o hospital) |

---

## Módulo 5 — Tempo de Permanência por CID

**O que o SKOPIEN exibe:**  
Tempo médio de internação por diagnóstico (CID-10), convênio, faixa etária e departamento.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Histórico de internações (últimos 3–12 meses) | Prontuário eletrônico / BI hospitalar |
| CID-10 principal por episódio | Prontuário eletrônico |
| Convênio do paciente | Prontuário / faturamento |
| Departamento / especialidade responsável | Prontuário eletrônico |

**Observação:** este módulo trabalha com dados históricos (não em tempo real). A carga pode ser feita em lote, diariamente.

---

## Módulo 6 — Gestão de Higienização de Leitos

**O que o SKOPIEN exibe:**  
Tempo de espera e aceite por hora, desempenho por etapa, status dos funcionários de higiene.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Momento em que o leito é liberado para higienização | Prontuário eletrônico (alta do paciente) |
| Aceite e início da higienização pela equipe | App de higienização (se existente) ou tablet no leito |
| Conclusão de cada etapa | App de higienização |
| Status e localização dos funcionários | App de higienização ou rastreamento por crachá |

**Observação:** se o hospital não tiver sistema de higienização, o SKOPIEN pode trabalhar com uma solução simples (tablet por andar) que nossa equipe provê.

---

## Módulo 7 — Agendamento Anestésico

**O que o SKOPIEN exibe:**  
Tabela de procedimentos do dia com status (Marcado, Cancelado, Inconsistente, Suspenso) e setor.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Agenda de procedimentos com anestesia | Sistema de centro cirúrgico / agenda médica |
| Setor de realização (Hemodinâmica, Imagem, etc.) | Sistema de centro cirúrgico |
| Status de cada agendamento | Sistema de centro cirúrgico |

---

## Módulo 8 — Predição de Internações (Admission Prediction)

**O que o SKOPIEN exibe:**  
Probabilidade individual de internação para pacientes no PS, previsão de volume para os próximos 7 dias.

**O que precisamos do hospital:**

| O que é | De onde vem normalmente |
|---|---|
| Histórico de visitas ao PS com desfecho (internado / não internado) | Prontuário eletrônico |
| Sinais vitais na triagem | Monitores / prontuário |
| Diagnóstico de triagem (Manchester) | Prontuário |
| Perfil demográfico (idade, gênero) | Prontuário |

**Observação:** o modelo preditivo é treinado com dados do próprio hospital durante a implantação (mínimo recomendado: 12 meses de histórico). A precisão melhora ao longo do tempo.

---

## Resumo — Esforço de Integração por Módulo

| Módulo | Complexidade | Pré-requisito no hospital |
|---|---|---|
| Sinais vitais em tempo real | Média | Monitores com saída digital (Philips, GE) |
| Ocupação e admissões | Baixa | Qualquer HIS/PEP com API ou HL7 |
| Alertas de medicação | Média | Sistema de farmácia integrado ao prontuário |
| Indicadores administrativos | Baixa | Dados já existem no prontuário |
| Permanência por CID | Baixa | Export histórico do BI hospitalar |
| Higienização | Alta* | App de higienização (provemos se necessário) |
| Predição | Alta | 12+ meses de histórico estruturado |

*Alta apenas se o hospital não tiver nenhum controle digital de higienização.

---

## Cronograma Típico de Implantação

| Fase | Duração | O que acontece |
|---|---|---|
| Diagnóstico de sistemas | 2 semanas | Mapeamos quais sistemas o hospital usa e como se conectar |
| Integração core (sinais + ADT) | 4 semanas | Sinais vitais, admissões, ocupação ao vivo |
| Integração administrativa | 3 semanas | CC, farmácia, indicadores gerenciais |
| Treinamento e go-live | 1 semana | Capacitação das equipes, ajustes finais |
| **Total estimado** | **~10 semanas** | |

---

## Perguntas Frequentes em Reuniões de Venda

**"Precisamos trocar nosso prontuário?"**  
Não. O SKOPIEN se integra ao que o hospital já tem.

**"Nosso HIS é antigo e não tem API. Conseguimos integrar?"**  
Sim. Para sistemas legados trabalhamos com leitura direta de banco de dados ou scraping de tela como último recurso. A maioria dos prontuários brasileiros já tem saída HL7.

**"Os dados ficam na nuvem?"**  
O SKOPIEN pode rodar 100% on-premise (dentro da rede do hospital) ou em nuvem privada. A escolha é do hospital e não muda as funcionalidades.

**"E a LGPD?"**  
Todos os dados clínicos trafegam em rede privada. O SKOPIEN não armazena dados identificáveis em logs. O contrato inclui DPA (Data Processing Agreement) em conformidade com a LGPD.
