/** Opstilling og holdlinjer. Trin 2: bedste XI i 4-4-2, ingen synergier endnu
 *  (synergi-laget kommer med formations-skærmen i trin 3). */
import type { Player, Position, ScorerCandidate, TeamLines } from "./types";

/** Slot-vægte per position (jf. DESIGN.md: back = FOR×1,0 + lidt ANG osv.) */
export const ROLE_WEIGHTS: Record<Position, TeamLines> = {
  GK: { attack: 0, midfield: 0, defense: 1 },
  DF: { attack: 0.15, midfield: 0.15, defense: 1 },
  MF: { attack: 0.2, midfield: 1, defense: 0.2 },
  FW: { attack: 1, midfield: 0.3, defense: 0 },
};

export const XI_SHAPE: [Position, number][] = [
  ["GK", 1],
  ["DF", 4],
  ["MF", 4],
  ["FW", 2],
];

/** OVR = vægtet gennemsnit af de tre stats i spillerens rolle (0-99). */
export function playerOvr(p: Player): number {
  const w = ROLE_WEIGHTS[p.pos];
  const total = w.attack + w.midfield + w.defense;
  return Math.round((p.attack * w.attack + p.midfield * w.midfield + p.defense * w.defense) / total);
}

/** Bedste XI: top-N per position efter OVR. */
export function pickXI(squad: Player[]): Player[] {
  const xi: Player[] = [];
  for (const [pos, count] of XI_SHAPE) {
    const candidates = squad.filter((p) => p.pos === pos).sort((a, b) => playerOvr(b) - playerOvr(a));
    xi.push(...candidates.slice(0, count));
  }
  return xi;
}

/** Holdlinjer = sum af spillernes stats × slot-vægte. */
export function teamLines(xi: Player[]): TeamLines {
  const lines: TeamLines = { attack: 0, midfield: 0, defense: 0 };
  for (const p of xi) {
    const w = ROLE_WEIGHTS[p.pos];
    lines.attack += p.attack * w.attack;
    lines.midfield += p.midfield * w.midfield;
    lines.defense += p.defense * w.defense;
  }
  return lines;
}

export function scorerCandidates(xi: Player[]): ScorerCandidate[] {
  return xi
    .map((p) => ({
      id: p.id,
      name: p.name,
      attackContribution: p.attack * ROLE_WEIGHTS[p.pos].attack,
      hasGoalscorerTrait: p.trait === "goalscorer",
    }))
    .filter((s) => s.attackContribution > 0);
}
