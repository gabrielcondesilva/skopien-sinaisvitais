# Recharts + SVG customizado para visualizações

Recharts cobre todos os tipos de gráfico padrão do sistema (linha, barra, área, donut, sparkline) com estética compatível com dark mode estilo Vercel. Gauges circulares (Operating Room) e heatmap (Sinais Vitais) são implementados como componentes SVG customizados — o Recharts não oferece gauge nativo, e o heatmap tem lógica de colorização por status clínico que é mais simples de controlar diretamente em SVG.

## Considered Options

- **Nivo**: tem heatmap nativo, mas a API é mais verbosa e o visual é mais difícil de alinhar com o tema dark estilo Vercel.
- **Chart.js**: mais verboso para React, requer wrappers adicionais.
- **Biblioteca única para tudo**: inviável sem comprometer a customização dos gauges SVG e do heatmap clínico.
