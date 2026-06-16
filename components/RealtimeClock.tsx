"use client";
import { useState, useEffect } from "react";

interface Props {
  style?: React.CSSProperties;
  className?: string;
}

export function RealtimeClock({ style, className }: Props) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className={className}
      style={{
        fontSize: 12,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.05em",
        color: "rgba(255,255,255,0.65)",
        ...style,
      }}
    >
      {time}
    </span>
  );
}
