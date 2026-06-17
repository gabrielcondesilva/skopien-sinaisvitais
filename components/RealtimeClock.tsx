"use client";
import { useState, useEffect } from "react";

interface Props {
  style?: React.CSSProperties;
  className?: string;
}

export function RealtimeClock({ style, className }: Props) {
  const [datetime, setDatetime] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
      const weekdayCap = weekday.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-");
      const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setDatetime(`${weekdayCap}, ${date}, ${time}`);
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
      {datetime}
    </span>
  );
}
