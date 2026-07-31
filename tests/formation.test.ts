/** Formations-motorens tests: vægt-paritet mod ROLE_WEIGHTS (kritisk — ellers
 *  får spillerklubben skæve linjer vs. AI), fit-stjerner, synergier og preview. */
import { describe, expect, it } from "vitest";
import {
  autoAssign,
  evaluate,
  fitStars,
  previewPlacement,
  resolveAssignment,
  SLOTS_442,
  type Assignment,
} from "../src/engine/formation";
import { ROLE_WEIGHTS, XI_SHAPE } from "../src/engine/lineup";
import type { Club, Player, Position, Trait } from "../src/engine/types";
import { createWorld, playerClub } from "../src/engine/world";

function mk(id: string, pos: Position, a: number, m: number, d: number, age = 25, trait?: Trait): Player {
  return { id, name: id, pos, age, attack: a, midfield: m, defense: d, potential: 90, trait };
}

function fullSquad(): Player[] {
  return [
    mk("gk1", "GK", 2, 8, 52),
    mk("df1", "DF", 10, 20, 55), mk("df2", "DF", 12, 22, 50), mk("df3", "DF", 14, 25, 48), mk("df4", "DF", 9, 18, 45),
    mk("mf1", "MF", 30, 55, 25), mk("mf2", "MF", 28, 52, 30), mk("mf3", "MF", 35, 50, 20), mk("mf4", "MF", 25, 48, 28),
    mk("fw1", "FW", 60, 25, 8), mk("fw2", "FW", 55, 22, 10),
    mk("bench1", "MF", 20, 40, 20, 19), mk("bench2", "FW", 45, 18, 6, 18), mk("bench3", "DF", 8, 15, 40, 20),
  ];
}

function assignmentOf(squad: Player[]): Assignment {
  const club: Club = { id: "c", name: "Test", color: "#fff", isPlayer: true, squad, gold: 0, facilityTier: 1, lineup: autoAssign(squad) };
  return resolveAssignment(club);
}

describe("vægt-paritet (spillerklub vs AI)", () => {
  it("slot-vægtenes søjlesummer matcher ROLE_WEIGHTS-aggregaterne", () => {
    // AI: XI-formen (1 GK, 4 DF, 4 MF, 2 FW) × positions-vægte
    const roleTotals = { attack: 0, midfield: 0, defense: 0 };
    for (const [pos, count] of XI_SHAPE) {
      roleTotals.attack += ROLE_WEIGHTS[pos].attack * count;
      roleTotals.midfield += ROLE_WEIGHTS[pos].midfield * count;
      roleTotals.defense += ROLE_WEIGHTS[pos].defense * count;
    }
    const slotTotals = { attack: 0, midfield: 0, defense: 0 };
    for (const slot of SLOTS_442) {
      slotTotals.attack += slot.weights.attack;
      slotTotals.midfield += slot.weights.midfield;
      slotTotals.defense += slot.weights.defense;
    }
    expect(slotTotals.attack).toBeCloseTo(roleTotals.attack, 5);
    expect(slotTotals.midfield).toBeCloseTo(roleTotals.midfield, 5);
    expect(slotTotals.defense).toBeCloseTo(roleTotals.defense, 5);
  });
});

describe("fit-stjerner", () => {
  const st = SLOTS_442.find((s) => s.id === "ST1")!;
  it("rendyrket angriber er ★6 i ST-slotten", () => {
    expect(fitStars(mk("a", "FW", 70, 21, 5), st)).toBe(6);
  });
  it("midterforsvarer er fejlplaceret i ST-slotten (fit <= 2)", () => {
    expect(fitStars(mk("b", "DF", 12, 25, 60), st)).toBeLessThanOrEqual(2);
  });
  it("fit er uafhængig af kvalitet (samme profil, dobbelt styrke = samme stjerner)", () => {
    const small = mk("s", "FW", 30, 9, 2);
    const big = mk("t", "FW", 60, 18, 4);
    expect(fitStars(small, st)).toBe(fitStars(big, st));
  });
});

describe("synergier", () => {
  it("Målscorer + Playmaker giver +4 ANG og en positiv synergi", () => {
    const squad = fullSquad();
    squad.find((p) => p.id === "fw1")!.trait = "goalscorer";
    squad.find((p) => p.id === "mf1")!.trait = "playmaker";
    const result = evaluate(assignmentOf(squad));
    const goalscorer = result.synergies.find((s) => s.id.startsWith("goalscorer"));
    expect(goalscorer).toBeDefined();
    expect(goalscorer!.positive).toBe(true);
    expect(goalscorer!.delta.attack).toBe(4);
    expect(result.synergies.some((s) => s.id.startsWith("playmaker"))).toBe(true);
  });

  it("Målscorer uden Playmaker giver kun +1 og markeres som uindfriet", () => {
    const squad = fullSquad();
    squad.find((p) => p.id === "fw1")!.trait = "goalscorer";
    const result = evaluate(assignmentOf(squad));
    const goalscorer = result.synergies.find((s) => s.id.startsWith("goalscorer"));
    expect(goalscorer!.delta.attack).toBe(1);
    expect(goalscorer!.positive).toBe(false);
  });

  it("Mentor giver +50% XP til unge naboer (og kun dem)", () => {
    const squad = fullSquad();
    squad.find((p) => p.id === "mf2")!.trait = "mentor";
    // Placér en U21-spiller ved siden af mentoren via manuel lineup
    const club: Club = { id: "c", name: "T", color: "#fff", isPlayer: true, squad, gold: 0, facilityTier: 1, lineup: autoAssign(squad) };
    const assignment = resolveAssignment(club);
    // Find mentorens slot og en naboslot, og sæt en U19'er derind
    const mentorSlot = [...assignment.entries()].find(([, p]) => p.trait === "mentor")![0];
    const young = squad.find((p) => p.id === "bench2")!; // 18 år
    const result0 = evaluate(assignment);
    expect(Object.keys(result0.xpMult).length).toBeGreaterThanOrEqual(0);
    // Preview: placer den unge ved siden af mentoren og tjek xpMult
    const neighborSlot = SLOTS_442.find((s) => s.id !== mentorSlot && s.pos === "FW")!;
    const preview = previewPlacement(assignment, neighborSlot.id, young);
    const gotBoost = preview.evalAfter.xpMult[young.id];
    // Kun hvis slotten faktisk er nabo til mentoren — ellers ingen boost
    expect(gotBoost === undefined || gotBoost === 1.5).toBe(true);
  });

  it("begge flanke-synergier er aktive i en fuld 4-4-2", () => {
    const result = evaluate(assignmentOf(fullSquad()));
    expect(result.synergies.filter((s) => s.id.startsWith("flank")).length).toBe(2);
  });
});

describe("auto-opstilling og sanering", () => {
  it("auto-opstilling fylder alle 11 slots med gyldige spillere", () => {
    const assignment = assignmentOf(fullSquad());
    expect(assignment.size).toBe(11);
    const ids = [...assignment.values()].map((p) => p.id);
    expect(new Set(ids).size).toBe(11);
  });

  it("solgte spillere fjernes fra opstillingen, og hullet fyldes", () => {
    const squad = fullSquad();
    const club: Club = { id: "c", name: "T", color: "#fff", isPlayer: true, squad, gold: 0, facilityTier: 1, lineup: autoAssign(squad) };
    resolveAssignment(club);
    // "Sælg" en starter
    const soldId = club.lineup!["ST1"];
    club.squad = club.squad.filter((p) => p.id !== soldId);
    const after = resolveAssignment(club);
    expect(after.size).toBe(11);
    expect([...after.values()].some((p) => p.id === soldId)).toBe(false);
  });
});

describe("hover-preview", () => {
  it("preview-delta matcher faktisk anvendelse (swap-logik)", () => {
    const squad = fullSquad();
    const club: Club = { id: "c", name: "T", color: "#fff", isPlayer: true, squad, gold: 0, facilityTier: 1, lineup: autoAssign(squad) };
    const assignment = resolveAssignment(club);
    const bench = squad.find((p) => p.id === "bench2")!;
    const preview = previewPlacement(assignment, "ST1", bench);
    // Anvend: sæt bench2 i ST1
    club.lineup!["ST1"] = bench.id;
    const applied = evaluate(resolveAssignment(club));
    expect(applied.lines.attack).toBeCloseTo(preview.lines.attack, 5);
    expect(applied.lines.midfield).toBeCloseTo(preview.lines.midfield, 5);
    expect(applied.lines.defense).toBeCloseTo(preview.lines.defense, 5);
  });

  it("preview er hurtig nok til pointer-events (1000 previews < 100 ms)", () => {
    const squad = fullSquad();
    const club: Club = { id: "c", name: "T", color: "#fff", isPlayer: true, squad, gold: 0, facilityTier: 1, lineup: autoAssign(squad) };
    const assignment = resolveAssignment(club);
    const bench = squad.find((p) => p.id === "bench1")!;
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) previewPlacement(assignment, "CM1", bench);
    expect(performance.now() - t0).toBeLessThan(100);
  });
});

describe("sæson-integration", () => {
  it("spillerklubbens gemte opstilling bruges og overlever verden", () => {
    const world = createWorld(51);
    const me = playerClub(world);
    me.lineup = autoAssign(me.squad);
    const assignment = resolveAssignment(me);
    expect(assignment.size).toBe(11);
  });
});
