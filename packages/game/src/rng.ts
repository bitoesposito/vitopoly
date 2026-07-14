// xorshift32: deterministic, seed lives in GameState so tests + replay are reproducible.
// seeded rng, not injectable dice. Add a test-only dice queue if scripted flow tests need exact rolls.

function xorshift32(x: number): number {
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0; // uint32
}

// advances s.seed, returns int in [0, n)
export function nextInt(s: { seed: number }, n: number): number {
  s.seed = xorshift32(s.seed || 1); // seed 0 is a fixed point — never allow it
  return s.seed % n;
}

export function roll2d6(s: { seed: number }): [number, number] {
  return [1 + nextInt(s, 6), 1 + nextInt(s, 6)];
}
