import { BAIL, BOARD, GO_SALARY } from "@tangentopoly/game";
import { GROUP_COLOR, GROUP_LABEL } from "@/lib/palette";
import { useT } from "@/lib/i18n";

// L'unica spiegazione del gioco: le differenze dal Monopoly non si scoprono giocando.
export function Rules() {
  const t = useT();
  // le serie in ordine di prezzo
  const series = Object.keys(GROUP_LABEL).map((g) => {
    const tiles = BOARD.filter((x) => x.group === g);
    return { g, da: tiles[0]?.price ?? 0, a: tiles.at(-1)?.price ?? 0, n: tiles.length };
  });

  return (
    <div className="space-y-4 text-xs leading-relaxed">
      <section className="space-y-1">
        <h3 className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("rules.turn")}</h3>
        <p>{t("rules.turnBody", { salary: GO_SALARY, bail: BAIL })}</p>
      </section>

      <section className="space-y-1">
        <h3 className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("rules.series")}</h3>
        <p>{t("rules.seriesBody")}</p>
        <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {series.map(({ g, da, a, n }) => (
            <li key={g} className="flex items-center gap-1.5">
              <span className="h-3 w-1 shrink-0" style={{ background: GROUP_COLOR[g] }} />
              <span className="min-w-0 truncate">{GROUP_LABEL[g]}</span>
              <span className="ml-auto shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                {n}·€{da}–{a}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-1">
        <h3 className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("rules.state")}</h3>
        <p>{t("rules.stateBody")}</p>
      </section>

      <section className="space-y-1">
        <h3 className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("rules.special")}</h3>
        <dl className="space-y-1">
          {(["tangente", "blitz", "favori", "latitanza", "maniPulite", "prigione"] as const).map((k) => (
            <div key={k} className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium">{t(`rules.${k}`)}</dt>
              <dd className="min-w-0 text-muted-foreground">{t(`rules.${k}Desc`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-1">
        <h3 className="font-condensed text-micro tracking-widest text-muted-foreground uppercase">{t("rules.clock")}</h3>
        <p>{t("rules.clockBody")}</p>
      </section>
    </div>
  );
}
