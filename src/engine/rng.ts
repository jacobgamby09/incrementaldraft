/** Seedet, deterministisk PRNG (mulberry32). Determinisme er motorens kontrakt:
 *  samme seed => samme kampe, samme sæsoner, samme verden. */
export interface RNG {
  /** Uniform [0, 1) */
  next(): number;
  /** Uniform heltal i [min, max] (begge inkl.) */
  int(min: number, max: number): number;
  /** true med sandsynlighed p */
  chance(p: number): boolean;
  /** Afled en uafhængig del-stream (fx én per kamp) */
  fork(): RNG;
}

export function createRng(seed: number): RNG {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    fork: () => createRng(Math.floor(next() * 4294967296)),
  };
}
