"use client";

import { useCallback, useRef, useState } from "react";
import { CameraPlayer } from "./CameraPlayer";

interface Props {
  streamUrl: string;
  bedLabel?: string;
  onClose: () => void;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 270;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;

export function FloatingCameraWindow({ streamUrl, bedLabel, onClose }: Props) {
  const [pos, setPos] = useState(() => ({
    x: Math.max(24, window.innerWidth - DEFAULT_WIDTH - 40),
    y: 90,
  }));
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  const dragStart   = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const resizeStart = useRef<{ x: number; y: number; origW: number; origH: number } | null>(null);

  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, origX: pos.x, origY: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      setPos({
        x: Math.min(Math.max(0, dragStart.current.origX + dx), window.innerWidth - 60),
        y: Math.min(Math.max(0, dragStart.current.origY + dy), window.innerHeight - 40),
      });
    }
    function onUp() {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { x: e.clientX, y: e.clientY, origW: size.width, origH: size.height };

    function onMove(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const dx = ev.clientX - resizeStart.current.x;
      const dy = ev.clientY - resizeStart.current.y;
      setSize({
        width:  Math.max(MIN_WIDTH,  resizeStart.current.origW + dx),
        height: Math.max(MIN_HEIGHT, resizeStart.current.origH + dy),
      });
    }
    function onUp() {
      resizeStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  return (
    <div
      className="fixed z-50 flex flex-col rounded-lg overflow-hidden select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        background: "#000",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
      }}
    >
      {/* Barra de título — arraste para mover */}
      <div
        onMouseDown={onDragMouseDown}
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", cursor: "move" }}
      >
        <span className="text-xs font-medium truncate" style={{ color: "var(--muted)" }}>
          Câmera{bedLabel ? ` — ${bedLabel}` : ""}
        </span>
        <button
          onClick={onClose}
          aria-label="Fechar câmera"
          className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-70 shrink-0"
          style={{ color: "var(--muted)" }}
        >
          ✕
        </button>
      </div>

      {/* Vídeo */}
      <div className="relative flex-1 min-h-0">
        <CameraPlayer streamUrl={streamUrl} />
      </div>

      {/* Alça de redimensionamento — arraste a borda/canto */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4"
        style={{ cursor: "se-resize", touchAction: "none" }}
      >
        <svg width={16} height={16} viewBox="0 0 16 16" style={{ opacity: 0.6 }}>
          <path d="M13 3 L3 13 M13 8 L8 13 M13 13 L13 13" stroke="#fff" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  );
}
