import type { Bundle } from "@tangentopoly/game";

// Lo stato modificabile di un lato dell'offerta. Il contante resta stringa perché è un
// campo di testo: diventa numero solo quando l'offerta parte davvero.

export interface BundleDraft {
  cash: string;
  props: number[];
  jailCards: number;
}

export const emptyDraft = (): BundleDraft => ({ cash: "0", props: [], jailCards: 0 });

export const toBundle = (d: BundleDraft): Bundle => ({ cash: Number(d.cash) || 0, props: d.props, jailCards: d.jailCards });

export const isEmpty = (b: Bundle) => b.cash === 0 && b.props.length === 0 && b.jailCards === 0;
