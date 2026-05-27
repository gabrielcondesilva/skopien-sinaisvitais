# Simulação de dados em tempo real client-side (sem backend)

Na v1 demonstrativa, todos os dados fictícios são gerados e gerenciados inteiramente no browser via TypeScript. Um módulo de seed inicializa os pacientes e suas séries temporais de sinais vitais ao carregar o app. Um `setInterval` avança o estado a cada poucos segundos, recalcula o Escore EWS e dispara alertas automaticamente quando limiares são cruzados.

Eventos clínicos críticos (deterioração de paciente, disparo de alerta, mudança de status) são roteirizados com timestamps relativos ao momento de abertura do app — não aleatórios — para garantir que a demo mostre os fluxos mais impactantes de forma reproduzível.

## Considered Options

- **API Python com banco de dados real**: descartada para v1 — complexidade desnecessária para uma demo de vendas.
- **Dados estáticos (sem atualização)**: descartada — o diferencial visual da plataforma é o comportamento em tempo real.

## Consequences

Os dados não persistem entre sessões (refresh reseta a simulação). Isso é aceitável para v1. Na v2, o módulo de simulação é substituído por WebSockets conectados ao backend Python real.
