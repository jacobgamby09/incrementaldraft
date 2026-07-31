/** Spiller-generering: stats fra positions-profil, skaleret til ønsket OVR. */
import { makePersonName } from "../content/names";
import { playerOvr } from "./lineup";
import type { RNG } from "./rng";
import type { Player, Position, Trait } from "./types";

/** Grov stat-profil per position (primær ~1, sekundær, tertiær). */
const PROFILE: Record<Position, { attack: number; midfield: number; defense: number }> = {
  GK: { attack: 0.05, midfield: 0.15, defense: 1 },
  DF: { attack: 0.25, midfield: 0.5, defense: 1 },
  MF: { attack: 0.6, midfield: 1, defense: 0.65 },
  FW: { attack: 1, midfield: 0.5, defense: 0.2 },
};

const TRAITS: Trait[] = ["playmaker", "goalscorer", "captain", "mentor", "twoway", "glass"];

export function makePlayer(
  id: string,
  pos: Position,
  targetOvr: number,
  age: number,
  potential: number,
  rng: RNG,
  traitChance = 0.2,
): Player {
  const profile = PROFILE[pos];
  const jitter = () => 0.9 + rng.next() * 0.2;
  const p: Player = {
    id,
    name: makePersonName(rng),
    pos,
    age,
    attack: Math.max(1, targetOvr * profile.attack * jitter()),
    midfield: Math.max(1, targetOvr * profile.midfield * jitter()),
    defense: Math.max(1, targetOvr * profile.defense * jitter()),
    potential: Math.min(99, Math.max(potential, targetOvr + 1)),
    trait: rng.chance(traitChance) ? TRAITS[rng.int(0, TRAITS.length - 1)] : undefined,
  };
  // Skalér stats så OVR lander præcist på target
  const actual = playerOvr(p);
  if (actual > 0) {
    const factor = targetOvr / actual;
    p.attack = Math.min(99, Math.max(1, p.attack * factor));
    p.midfield = Math.min(99, Math.max(1, p.midfield * factor));
    p.defense = Math.min(99, Math.max(1, p.defense * factor));
  }
  return p;
}
