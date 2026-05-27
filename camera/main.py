"""
SKOPIEN Camera Proxy — FastAPI + FFmpeg
Reads RTSP_URL from environment, transcodes to HLS, serves segments.

Start:
    uvicorn main:app --host 0.0.0.0 --port 8000

Deploy (Railway / Render / Fly.io):
    Set RTSP_URL env var, deploy this directory with the Dockerfile.
"""

import os
import subprocess
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("camera-proxy")

HLS_DIR = Path("/tmp/skopien-hls")
_ffmpeg: subprocess.Popen | None = None


def _ffmpeg_bin() -> str:
    import shutil
    found = shutil.which("ffmpeg")
    if found:
        return found
    candidates = [
        r"C:\Users\nocla\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
    ]
    for c in candidates:
        if Path(c).exists():
            return c
    return "ffmpeg"


def start_ffmpeg(rtsp_url: str) -> subprocess.Popen:
    HLS_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        _ffmpeg_bin(),
        "-rtsp_transport", "tcp",       # TCP for reliability over NAT
        "-i", rtsp_url,
        "-c:v", "copy",                 # no re-encode — just remux
        "-c:a", "aac",
        "-hls_time", "2",               # 2-second segments
        "-hls_list_size", "5",          # keep 5 segments in playlist
        "-hls_flags", "delete_segments+append_list",
        "-f", "hls",
        str(HLS_DIR / "index.m3u8"),
    ]
    log.info("Starting FFmpeg: %s", " ".join(cmd[:6]) + " ...")
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ffmpeg
    rtsp_url = os.environ.get("RTSP_URL")
    if not rtsp_url:
        log.warning("RTSP_URL not set — stream will not start")
    else:
        _ffmpeg = start_ffmpeg(rtsp_url)
    yield
    if _ffmpeg and _ffmpeg.poll() is None:
        _ffmpeg.terminate()
        _ffmpeg.wait(timeout=5)
    log.info("FFmpeg stopped")


app = FastAPI(title="SKOPIEN Camera Proxy", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    running = _ffmpeg is not None and _ffmpeg.poll() is None
    return {"ok": True, "ffmpeg": "running" if running else "stopped"}


@app.get("/stream/{filename}")
def serve_hls(filename: str):
    # Reject path traversal attempts
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = HLS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Segment not found")

    media_type = "application/vnd.apple.mpegurl" if filename.endswith(".m3u8") else "video/MP2T"
    return FileResponse(path, media_type=media_type)
