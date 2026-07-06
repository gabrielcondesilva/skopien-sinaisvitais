# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

SKOPIEN v1 — plataforma web demonstrativa de monitoramento hospitalar em tempo real. Sem backend real: todos os dados são gerados e simulados client-side em TypeScript. Destina-se a apresentações comerciais para hospitais.

## Domain language

**Read `CONTEXT.md` before touching any domain logic.** It defines the canonical terms (Internação, Leito, Slot Temporal, Escore EWS, etc.) and contains example dialogues that clarify non-obvious boundaries between concepts.

Key invariants:
- Sinais vitais e alertas pertencem à **Internação**, não ao Paciente
- O valor exibido nos cards é sempre a **mediana do Slot Temporal** (padrão 15 min) — nunca o valor bruto
- Leito sem Internação ativa exibe "Leito Disponível" — o card existe mas sem dados clínicos
- No Centro Cirúrgico a entidade é **Sala Cirúrgica**, não Leito

## Architectural decisions

See `docs/adr/` for the three recorded decisions:
- `0001` — câmera RTSP → HLS via proxy Python (por que não WebRTC ou MJPEG)
- `0002` — simulação client-side com eventos roteirizados (por que não backend real na v1)
- `0003` — Recharts + SVG customizado (por que não Nivo ou biblioteca única)

## Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS (dark mode global), Zustand
- **Gráficos**: Recharts para linha/barra/área/donut/sparkline; SVG customizado para gauges circulares e heatmap
- **Camera proxy**: Python/FastAPI + FFmpeg (serviço separado, não no Vercel)
- **Deploy**: Vercel (frontend) + Railway/Render/Fly.io (proxy câmera)

## Commands (após inicializar o projeto Next.js)

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run lint       # ESLint
npm test           # Jest (EWSCalculator e AlertEngine têm testes unitários)
npm test -- --testPathPattern=ews   # rodar apenas testes do EWSCalculator
```

## Core modules

**`SimulationEngine`** — store Zustand central. Seed com 48 pacientes (12 PS, 20 Enfermaria, 6 salas CC, 10 UTI). Loop `setInterval` ~5s gerando novos valores brutos. Janela deslizante para cálculo de mediana por Slot Temporal. Pré-popula 15 min de histórico no carregamento. Expõe `useSimulation()`.

**`EWSCalculator`** — função pura. Recebe FR, PAS, FC, TEMP e Nível de Consciência (NC, escala AVPU) e retorna pontuação individual + total + Status Clínico. Tabela MEWS institucional (`docs/MEWS.docx`), escala 0–15. SpO₂ continua nos Sinais Vitais exibidos mas não entra nesse cálculo. Sem regra de exceção — status depende só da soma total. Limiares: 0–2=Baixo, 3–4=Moderado, ≥5=Alto.

**`AlertEngine`** — store Zustand que observa o SimulationEngine. Gerencia ciclo de vida ativo → respondido → histórico. Cada tipo de alerta tem regra de dismissal distinta (ver CONTEXT.md seção Alertas).

**`AuthModule`** — validação client-side email+senha (senha: `skopien123`). Sessão em localStorage. Route guard com redirecionamento silencioso por perfil.

## Demo scripted scenes

Quatro eventos com timestamps relativos à abertura do app, disparados pelo SimulationEngine:
- **~5 min**: Paciente UTI deteriora (FC sobe, NC piora de Alerta para Confuso, SpO₂ cai visualmente, Status Moderado→Alto, alerta de Sinal Vital)
- **~8 min**: Alerta de Medicação Atrasada na Enfermaria
- **~12 min**: Alerta de Previsão de Alta no Pronto Socorro
- **~15 min**: Sala Cirúrgica avança Procedimento → RA no Centro Cirúrgico

Refresh do app reseta todos os timers.

## Camera proxy

`camera/camera.py` contém o protótipo de conexão RTSP. As credenciais **não devem ser hardcoded** — usar variável de ambiente `RTSP_URL`. O proxy FastAPI/FFmpeg é um serviço separado do frontend. A câmera aparece apenas no primeiro paciente do Pronto Socorro; todos os demais exibem placeholder.

## Issue tracker

Backlog em https://github.com/gabrielxconde/skopien-sinaisvitais/issues. PRD completo na issue #1. Issues #2–#19 são os slices de implementação em ordem de dependência — começar por #2 (Project Setup).
