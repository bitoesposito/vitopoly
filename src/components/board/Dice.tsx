import { useEffect, useRef, useState } from "react";
import type { GameEvent } from "@tangentopoly/game";

// Rotazione del cubo che porta davanti la faccia col valore uscito (vedi .die-* in index.css).
const DIE_FACE: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  5: "rotateX(90deg)",
  6: "rotateX(180deg)",
};

// Dado 3D senza stato: key={spin} rimonta il cubo a ogni tiro e l'animazione CSS
// one-shot riparte; quando finisce, la transition lo accompagna sulla faccia uscita.
// `alt` varia verso e giri del tumble.
function Die3D({ value, spin, alt }: { value: number | null; spin: number; alt?: boolean }) {
  return (
    // key sulla scena e sul cubo: al tiro rimontano insieme, così arco e rotazione partono in fase
    <div key={spin} className="die-scene die-tossing">
      {/* la faccia va in --face (non in transform): così l'hover può comporre il tilt 3D */}
      <div className={`die ${alt ? "die-rolling-alt" : "die-rolling"}`} style={{ "--face": DIE_FACE[value ?? 1] } as React.CSSProperties}>
        {(["front", "back", "top", "bottom", "right", "left"] as const).map((f) => (
          <div key={f} className={`die-face die-${f}`} />
        ))}
      </div>
    </div>
  );
}

// Il vassoio è la scorciatoia per il puntatore: l'azione ha già il suo bottone, quindi
// qui niente tab e niente etichetta — è decorazione operabile, non un controllo.
export function DiceTray({ roll, enabled, onRoll, label }: {
  roll: Extract<GameEvent, { e: "rolled" }> | null;
  enabled: boolean;
  onRoll: () => void;
  label: string;
}) {
  // nuovo evento rolled (per identità) -> nuovo tumble
  const [spin, setSpin] = useState(0);
  const last = useRef<GameEvent | null>(null);
  useEffect(() => {
    if (roll && last.current !== roll) {
      last.current = roll;
      setSpin((n) => n + 1);
    }
  }, [roll]);

  return (
    <button
      type="button"
      disabled={!enabled}
      tabIndex={-1}
      aria-hidden
      onClick={onRoll}
      title={enabled ? label : undefined}
      className={`dice-tray flex items-center justify-center gap-2 sm:gap-3 [--die:3rem] sm:[--die:3.5rem] lg:[--die:4rem] ${enabled ? "" : "opacity-60"}`}
    >
      <Die3D value={roll?.d1 ?? null} spin={spin} />
      <Die3D value={roll?.d2 ?? null} spin={spin} alt />
    </button>
  );
}
