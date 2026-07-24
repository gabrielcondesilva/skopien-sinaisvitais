# Mediana na Janela de Escore, última leitura válida nos Sinais Vitais individuais

O Limite de Alarme e a exibição de Sinais Vitais individuais (gráficos, cards) precisam reagir em tempo real a cada leitura bruta (1/min) — suavizar esses valores com mediana atrasaria a detecção de uma deterioração real, e sinal vital muda de forma gradual, não em picos que aparecem e somem entre uma leitura e outra. Por isso continuam usando a última leitura válida do Slot Temporal, decisão já registrada em `CONTEXT.md`.

O Escore EWS tem o requisito oposto: precisa de estabilidade clínica. Recalculá-lo a cada leitura bruta faria o Status Clínico do paciente oscilar de categoria (e disparar Alertas de Escore) por ruído de uma única leitura, o que não é aceitável clinicamente. Por isso o Escore passa a ser calculado sobre a Janela de Escore — um bucket fixo de 30 minutos agregado pela mediana, desacoplado do seletor de granularidade que a tela de Sinais Vitais esteja exibindo.

Isso não é uma reversão da rejeição anterior de mediana para Sinais Vitais (ver `CONTEXT.md` § Slot Temporal e Example Dialogue) — são dois conceitos com propósitos e requisitos de reatividade diferentes, cada um com a agregação certa para o seu uso.

## Considered Options

- **Mediana em tudo** (Sinais Vitais e Escore): descartada — atrasaria e suavizaria demais o Limite de Alarme e os gráficos individuais, que precisam refletir a leitura real assim que ela chega.
- **Última leitura válida em tudo** (inclusive no Escore): descartada — o Escore oscilaria de categoria a cada leitura ruidosa, gerando Alertas de Escore falsos e uma UX de "flickering" no Status Clínico do paciente.

## Consequences

Passa a existir uma segunda agregação de Sinais Vitais no sistema (Janela de Escore, mediana/30min fixo), separada do Slot Temporal (última leitura válida/15min padrão, ajustável por tela) e do Limite de Alarme (leitura bruta em tempo real, sem agregação nenhuma). Um dev futuro que só conhecer o Slot Temporal pode presumir que o Escore usa a mesma agregação dos gráficos — não usa.
