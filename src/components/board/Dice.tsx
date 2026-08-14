import type { Roll } from "@/lib/selectors";
import { avvisa } from "@/lib/avvisi";

// Rotazione del cubo che porta davanti la faccia col valore uscito (vedi .die-* in index.css).
const DIE_FACE: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  5: "rotateX(90deg)",
  6: "rotateX(180deg)",
};

// Dado 3D senza stato: `key={spin}` rimonta il cubo a ogni tiro e l'animazione one-shot
// riparte, chiudendo sulla faccia uscita. `alt` varia verso e giri del tumble.
function Die3D({ value, spin, alt, onLand }: { value: number | null; spin: number; alt?: boolean; onLand?: () => void }) {
  return (
    // key sulla scena e sul cubo: al tiro rimontano insieme, così arco e rotazione partono in fase
    <div
      key={spin}
      className="die-scene die-tossing"
      // il dado tocca il tavolo quando finisce l'arco: lo dice il DOM, non un timer da
      // tenere allineato a --roll. La guardia scarta l'animationend del cubo, che risale.
      onAnimationEnd={(e) => e.target === e.currentTarget && onLand?.()}
    >
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
export function DiceTray({
  roll,
  enabled,
  onRoll,
  label,
  mine,
}: {
  roll: Roll | null;
  enabled: boolean;
  onRoll: () => void;
  label: string;
  /** il tiro è tuo: vibrano solo i tuoi dadi, o il telefono ronza a ogni turno di chiunque */
  mine?: boolean;
}) {
  const spin = roll?.spin ?? 0; // il key del cubo: cambia solo a tiro nuovo, non a ogni stato

  return (
    <button
      type="button"
      disabled={!enabled}
      tabIndex={-1}
      aria-hidden
      onClick={onRoll}
      title={enabled ? label : undefined}
      className={`dice-tray flex items-center justify-center gap-2 [--die:3rem] sm:gap-3 sm:[--die:3.5rem] lg:[--die:4rem] ${enabled ? "" : "opacity-60"}`}
    >
      <Die3D value={roll?.d1 ?? null} spin={spin} onLand={() => spin > 0 && mine && avvisa("dadi")} />
      <Die3D value={roll?.d2 ?? null} spin={spin} alt />
    </button>
  );
}
