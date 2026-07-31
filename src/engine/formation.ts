/** Formations-motoren: navngivne slots (4-4-2), slot-vægte, rolle-fit-stjerner,
 *  synergier og hover-preview. Ren TS — UI'et er kun en visning af dette.
 *
 *  VIGTIG PARITETSREGEL: slot-vægtenes søjlesummer skal matche ROLE_WEIGHTS'
 *  aggregater (håndhævet i tests/formation.test.ts), ellers får spillerklubben
 *  systematisk stærkere/svagere linjer end AI-klubberne i kampmodellen. */
import { playerOvr } from "./lineup";
import type { Club, Player, ScorerCandidate, TeamLines } from "./types";

export interface Slot {
  id: string;
  label: string;
  /** Naturlig position for slotten (bruges til auto-opstilling) */
  pos: Player["pos"];
  x: number;
  y: number;
  weights: TeamLines;
  flank?: "left" | "right";
}

export const SLOTS_442: Slot[] = [
  { id: "GK",  label: "GK", pos: "GK", x: 320, y: 686, weights: { attack: 0,   midfield: 0,    defense: 1 } },
  { id: "LB",  label: "LB", pos: "DF", x: 92,  y: 560, weights: { attack: 0.3, midfield: 0.15, defense: 1 }, flank: "left" },
  { id: "CB1", label: "CB", pos: "DF", x: 250, y: 560, weights: { attack: 0,   midfield: 0.15, defense: 1 } },
  { id: "CB2", label: "CB", pos: "DF", x: 400, y: 560, weights: { attack: 0,   midfield: 0.15, defense: 1 } },
  { id: "RB",  label: "RB", pos: "DF", x: 552, y: 560, weights: { attack: 0.3, midfield: 0.15, defense: 1 }, flank: "right" },
  { id: "LM",  label: "LM", pos: "MF", x: 92,  y: 400, weights: { attack: 0.3, midfield: 1,    defense: 0.1 }, flank: "left" },
  { id: "CM1", label: "CM", pos: "MF", x: 250, y: 400, weights: { attack: 0.1, midfield: 1,    defense: 0.3 } },
  { id: "CM2", label: "CM", pos: "MF", x: 400, y: 400, weights: { attack: 0.1, midfield: 1,    defense: 0.3 } },
  { id: "RM",  label: "RM", pos: "MF", x: 552, y: 400, weights: { attack: 0.3, midfield: 1,    defense: 0.1 }, flank: "right" },
  { id: "ST1", label: "ST", pos: "FW", x: 218, y: 210, weights: { attack: 1,   midfield: 0.3,  defense: 0 } },
  { id: "ST2", label: "ST", pos: "FW", x: 422, y: 210, weights: { attack: 1,   midfield: 0.3,  defense: 0 } },
];

const SLOT_BY_ID = new Map(SLOTS_442.map((s) => [s.id, s]));

/** Naboskabsgraf (til Anfører/Mentor og synergi-linjer). */
export const NEIGHBORS: Record<string, string[]> = {
  GK: ["CB1", "CB2"],
  LB: ["CB1", "LM"],
  CB1: ["GK", "LB", "CB2", "CM1"],
  CB2: ["GK", "CB1", "RB", "CM2"],
  RB: ["CB2", "RM"],
  LM: ["LB", "CM1", "ST1"],
  CM1: ["CB1", "LM", "CM2", "ST1"],
  CM2: ["CB2", "CM1", "RM", "ST2"],
  RM: ["RB", "CM2", "ST2"],
  ST1: ["LM", "CM1", "ST2"],
  ST2: ["RM", "CM2", "ST1"],
};

/** slotId -> playerId */
export type Lineup = Record<string, string>;

export type Assignment = Map<string, Player>;

/** Individuel bidrag til holdlinjerne (inkl. Tovejs/Glaskrop-justeringer). */
export function contribution(p: Player, slot: Slot): TeamLines {
  let w = slot.weights;
  if (p.trait === "twoway") {
    // Sekundær-vægte (under 1) tæller dobbelt
    w = {
      attack: w.attack >= 1 ? w.attack : w.attack * 2,
      midfield: w.midfield >= 1 ? w.midfield : w.midfield * 2,
      defense: w.defense >= 1 ? w.defense : w.defense * 2,
    };
  }
  const stats = { attack: p.attack, midfield: p.midfield, defense: p.defense };
  if (p.trait === "glass") {
    // +4 på primær stat (skadesrisikoen kommer senere)
    const primary = (Object.keys(stats) as (keyof TeamLines)[]).reduce((a, b) => (stats[a] >= stats[b] ? a : b));
    stats[primary] += 4;
  }
  return {
    attack: stats.attack * w.attack,
    midfield: stats.midfield * w.midfield,
    defense: stats.defense * w.defense,
  };
}

/** Rolle-fit (1-6 stjerner): profilens pasform i slotten, uafhængig af kvalitet.
 *  = faktisk bidrag / bidraget fra en optimalt formet spiller med samme OVR. */
export function fitStars(p: Player, slot: Slot): number {
  const c = contribution(p, slot);
  const total = c.attack + c.midfield + c.defense;
  const weightSum = slot.weights.attack + slot.weights.midfield + slot.weights.defense;
  const ideal = Math.max(1, playerOvr(p)) * weightSum;
  const ratio = total / ideal;
  if (ratio >= 0.97) return 6;
  if (ratio >= 0.9) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.65) return 3;
  if (ratio >= 0.45) return 2;
  return 1;
}

export interface Synergy {
  id: string;
  label: string;
  slotIds: string[];
  delta: TeamLines;
  positive: boolean;
}

export interface FormationEval {
  lines: TeamLines;
  synergies: Synergy[];
  fit: Record<string, number>;
  /** XP-multiplikator per spiller-id (Mentor) — bruges af sæsonmotoren */
  xpMult: Record<string, number>;
}

const ZERO: TeamLines = { attack: 0, midfield: 0, defense: 0 };

export function evaluate(assignment: Assignment): FormationEval {
  const lines: TeamLines = { attack: 0, midfield: 0, defense: 0 };
  const fit: Record<string, number> = {};
  const synergies: Synergy[] = [];
  const xpMult: Record<string, number> = {};

  for (const [slotId, p] of assignment) {
    const slot = SLOT_BY_ID.get(slotId)!;
    const c = contribution(p, slot);
    lines.attack += c.attack;
    lines.midfield += c.midfield;
    lines.defense += c.defense;
    fit[slotId] = fitStars(p, slot);
  }

  const bySlot = (id: string) => assignment.get(id);
  const players = [...assignment.entries()];
  const hasPlaymaker = players.some(([, p]) => p.trait === "playmaker");
  const fwSlots = players.filter(([id]) => SLOT_BY_ID.get(id)!.pos === "FW");

  for (const [slotId, p] of players) {
    const slot = SLOT_BY_ID.get(slotId)!;

    if (p.trait === "playmaker" && slot.pos === "MF" && fwSlots.length > 0) {
      const delta = { ...ZERO, attack: 2 * fwSlots.length };
      synergies.push({
        id: `playmaker-${slotId}`,
        label: `${p.name} (Playmaker) løfter angrebet`,
        slotIds: [slotId, ...fwSlots.map(([id]) => id)],
        delta,
        positive: true,
      });
      lines.attack += delta.attack;
    }

    if (p.trait === "goalscorer" && slot.pos === "FW") {
      const bonus = hasPlaymaker ? 4 : 1;
      const playmakerSlot = players.find(([, q]) => q.trait === "playmaker");
      synergies.push({
        id: `goalscorer-${slotId}`,
        label: hasPlaymaker
          ? `${p.name} (Målscorer) finder ${playmakerSlot![1].name}`
          : `${p.name} (Målscorer) mangler en Playmaker`,
        slotIds: playmakerSlot ? [slotId, playmakerSlot[0]] : [slotId],
        delta: { ...ZERO, attack: bonus },
        positive: hasPlaymaker,
      });
      lines.attack += bonus;
    }

    if (p.trait === "captain") {
      const young = (NEIGHBORS[slotId] ?? [])
        .map((n) => [n, bySlot(n)] as const)
        .filter((entry): entry is readonly [string, Player] => !!entry[1] && entry[1].age < 23);
      if (young.length > 0) {
        const delta: TeamLines = { attack: 0, midfield: 0, defense: 0 };
        for (const [nSlotId] of young) {
          const w = SLOT_BY_ID.get(nSlotId)!.weights;
          delta.attack += w.attack;
          delta.midfield += w.midfield;
          delta.defense += w.defense;
        }
        synergies.push({
          id: `captain-${slotId}`,
          label: `${p.name} (Anfører) løfter ${young.length} unge naboer`,
          slotIds: [slotId, ...young.map(([id]) => id)],
          delta,
          positive: true,
        });
        lines.attack += delta.attack;
        lines.midfield += delta.midfield;
        lines.defense += delta.defense;
      }
    }

    if (p.trait === "mentor") {
      const proteges = (NEIGHBORS[slotId] ?? [])
        .map((n) => bySlot(n))
        .filter((q): q is Player => !!q && q.age < 21);
      for (const q of proteges) xpMult[q.id] = Math.max(xpMult[q.id] ?? 1, 1.5);
      if (proteges.length > 0) {
        synergies.push({
          id: `mentor-${slotId}`,
          label: `${p.name} (Mentor) udvikler ${proteges.map((q) => q.name).join(", ")} (+50% XP)`,
          slotIds: [slotId],
          delta: { ...ZERO },
          positive: true,
        });
      }
    }
  }

  // Flanke-synergi: kant + back på samme flanke
  for (const flank of ["left", "right"] as const) {
    const pair = SLOTS_442.filter((s) => s.flank === flank);
    const [back, winger] = [pair.find((s) => s.pos === "DF")!, pair.find((s) => s.pos === "MF")!];
    const b = bySlot(back.id);
    const w = bySlot(winger.id);
    if (b && w) {
      synergies.push({
        id: `flank-${flank}`,
        label: `${flank === "left" ? "Venstre" : "Højre"} flanke: ${w.name} + ${b.name}`,
        slotIds: [back.id, winger.id],
        delta: { ...ZERO, attack: 3 },
        positive: true,
      });
      lines.attack += 3;
    }
  }

  // Advarsler: fejlplacerede spillere (fit <= 2) — ingen straf ud over matematikken
  for (const [slotId, p] of players) {
    if (fit[slotId] <= 2) {
      synergies.push({
        id: `misfit-${slotId}`,
        label: `${p.name} er fejlplaceret som ${SLOT_BY_ID.get(slotId)!.label}`,
        slotIds: [slotId],
        delta: { ...ZERO },
        positive: false,
      });
    }
  }

  return { lines, synergies, fit, xpMult };
}

/** Auto-opstilling: bedste spiller per naturlig position, rest efter fit. */
export function autoAssign(squad: Player[]): Lineup {
  const lineup: Lineup = {};
  const used = new Set<string>();
  for (const pos of ["GK", "DF", "MF", "FW"] as const) {
    const slots = SLOTS_442.filter((s) => s.pos === pos);
    const candidates = squad
      .filter((p) => p.pos === pos && !used.has(p.id))
      .sort((a, b) => playerOvr(b) - playerOvr(a));
    for (const slot of slots) {
      const p = candidates.shift();
      if (p) {
        lineup[slot.id] = p.id;
        used.add(p.id);
      }
    }
  }
  // Tomme slots fyldes med bedste tilbageværende efter fit
  for (const slot of SLOTS_442) {
    if (lineup[slot.id]) continue;
    const best = squad
      .filter((p) => !used.has(p.id))
      .sort((a, b) => fitStars(b, slot) - fitStars(a, slot) || playerOvr(b) - playerOvr(a))[0];
    if (best) {
      lineup[slot.id] = best.id;
      used.add(best.id);
    }
  }
  return lineup;
}

/** Sanitér klubbens gemte lineup (solgte/pensionerede fjernes, huller fyldes). */
export function resolveAssignment(club: Club): Assignment {
  const byId = new Map(club.squad.map((p) => [p.id, p]));
  const lineup: Lineup = {};
  const used = new Set<string>();
  for (const slot of SLOTS_442) {
    const pid = club.lineup?.[slot.id];
    if (pid && byId.has(pid) && !used.has(pid)) {
      lineup[slot.id] = pid;
      used.add(pid);
    }
  }
  // Fyld huller med auto-logik på de resterende spillere
  const remaining = club.squad.filter((p) => !used.has(p.id));
  const fallback = autoAssign(remaining);
  const fallbackIds = new Map(
    SLOTS_442.filter((s) => !lineup[s.id] && fallback[s.id]).map((s) => [s.id, fallback[s.id]]),
  );
  for (const [slotId, pid] of fallbackIds) {
    lineup[slotId] = pid;
    used.add(pid);
  }
  club.lineup = lineup;
  const assignment: Assignment = new Map();
  for (const slot of SLOTS_442) {
    const pid = lineup[slot.id];
    if (pid && byId.has(pid)) assignment.set(slot.id, byId.get(pid)!);
  }
  return assignment;
}

export function scorersFromAssignment(assignment: Assignment): ScorerCandidate[] {
  const scorers: ScorerCandidate[] = [];
  for (const [slotId, p] of assignment) {
    const slot = SLOT_BY_ID.get(slotId)!;
    const c = contribution(p, slot);
    if (c.attack > 0) {
      scorers.push({
        id: p.id,
        name: p.name,
        attackContribution: c.attack,
        hasGoalscorerTrait: p.trait === "goalscorer",
      });
    }
  }
  return scorers;
}

/** Hover-preview: hvad sker der, hvis `playerId` placeres i `slotId`?
 *  (Swap-logik: sidder spilleren i en anden slot, bytter de to plads.) */
export function previewPlacement(
  current: Assignment,
  slotId: string,
  player: Player,
): { lines: TeamLines; delta: TeamLines; evalAfter: FormationEval; fit: number } {
  const next: Assignment = new Map(current);
  const occupant = next.get(slotId);
  const playerCurrentSlot = [...next.entries()].find(([, p]) => p.id === player.id)?.[0];
  next.set(slotId, player);
  if (playerCurrentSlot && playerCurrentSlot !== slotId) {
    if (occupant) next.set(playerCurrentSlot, occupant);
    else next.delete(playerCurrentSlot);
  }
  const before = evaluate(current);
  const after = evaluate(next);
  return {
    lines: after.lines,
    delta: {
      attack: after.lines.attack - before.lines.attack,
      midfield: after.lines.midfield - before.lines.midfield,
      defense: after.lines.defense - before.lines.defense,
    },
    evalAfter: after,
    fit: fitStars(player, SLOT_BY_ID.get(slotId)!),
  };
}

export { SLOT_BY_ID };
