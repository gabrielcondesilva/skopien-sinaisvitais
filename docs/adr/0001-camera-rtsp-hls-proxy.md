# Stream de câmera via proxy Python/FFmpeg (RTSP → HLS)

Browsers não suportam RTSP nativamente. Para exibir o stream da câmera real (maca no escritório SKOPIEN) na página do paciente, optamos por um servidor Python leve (FastAPI) que usa FFmpeg para transcodificar RTSP → HLS e servir os segmentos `.m3u8` para o frontend Next.js consumir via `<video>` com HLS.js.

## Considered Options

- **WebRTC**: menor latência, mas exige servidor de sinalização (STUN/TURN) — complexidade desproporcional para uma demo com câmera fixa.
- **MJPEG direto**: simples, mas consome banda excessiva e não é suportado de forma consistente em todos os browsers.
- **HLS via FFmpeg proxy**: latência de 2-6 segundos (aceitável para demo), suporte universal em browsers com HLS.js, e reutiliza o ambiente Python já existente no projeto.

## Consequences

O frontend Next.js é hospedado no Vercel. O proxy Python (FastAPI + FFmpeg) precisa de um serviço separado (Railway, Render ou Fly.io) pois o Vercel não suporta servidores Python. O IP RTSP da câmera (`139.82.24.175`) é público, então o proxy pode acessá-la de qualquer host cloud. A câmera aparece apenas no primeiro paciente do Pronto Socorro — os demais pacientes exibem placeholder.
