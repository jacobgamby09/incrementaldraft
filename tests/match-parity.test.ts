/** Paritetstests: håndhæver kalibreringen fra simulation/match_sim.py.
 *  Fejler en af disse, har nogen (også fremtidige os) ændret kampmodellens
 *  balance — det skal være en bevidst, genkalibreret beslutning. */
import { describe, expect, it } from "vitest";
import { simulateMatch } from "../src/engine/match";
import { createRng } from "../src/engine/rng";
import type { MatchTeam } from "../src/engine/types";

const team = (attack = 200, midfield = 200, defense = 200): MatchTeam => ({
  lines: { attack, midfield, defense },
});

interface Aggregate {
  win: number;
  draw: number;
  loss: number;
  goalsPerMatch: number;
  blowout: number;
}

function runMany(a: MatchTeam, b: MatchTeam, n: number, seed: number): Aggregate {
  const rng = createRng(seed);
  let win = 0;
  let draw = 0;
  let loss = 0;
  let goals = 0;
  let blowout = 0;
  for (let i = 0; i < n; i++) {
    const [ga, gb] = simulateMatch(a, b, rng).score;
    if (ga > gb) win++;
    else if (ga === gb) draw++;
    else loss++;
    goals += ga + gb;
    if (Math.abs(ga - gb) >= 4) blowout++;
  }
  return {
    win: (100 * win) / n,
    draw: (100 * draw) / n,
    loss: (100 * loss) / n,
    goalsPerMatch: goals / n,
    blowout: (100 * blowout) / n,
  };
}

describe("kalibrering (Python-harnessets tal)", () => {
  it("jævnbyrdig kamp: ~37/26/37, ~2,5 mål/kamp", () => {
    const r = runMany(team(), team(), 20000, 42);
    expect(r.win).toBeGreaterThan(35);
    expect(r.win).toBeLessThan(39);
    expect(r.loss).toBeGreaterThan(35);
    expect(r.loss).toBeLessThan(39);
    expect(r.draw).toBeGreaterThan(24);
    expect(r.draw).toBeLessThan(28);
    expect(r.goalsPerMatch).toBeGreaterThan(2.35);
    expect(r.goalsPerMatch).toBeLessThan(2.65);
  });

  it("+20% favorit vinder ~54%", () => {
    const r = runMany(team(240, 240, 240), team(), 20000, 43);
    expect(r.win).toBeGreaterThan(52);
    expect(r.win).toBeLessThan(56);
  });

  it("+50% favorit vinder ~73% med ~10% blowouts", () => {
    const r = runMany(team(300, 300, 300), team(), 20000, 44);
    expect(r.win).toBeGreaterThan(71);
    expect(r.win).toBeLessThan(75);
    expect(r.blowout).toBeGreaterThan(7);
    expect(r.blowout).toBeLessThan(13);
  });
});

describe("stat-paritet (ingen stat må dominere draften)", () => {
  it("+20 point i hhv. ANG/MID/FOR flytter sejrsraten ens", () => {
    const n = 50000;
    const baseline = runMany(team(), team(), n, 100).win;
    const deltas = [
      runMany(team(220, 200, 200), team(), n, 101).win - baseline,
      runMany(team(200, 220, 200), team(), n, 102).win - baseline,
      runMany(team(200, 200, 220), team(), n, 103).win - baseline,
    ];
    for (const d of deltas) {
      expect(d).toBeGreaterThan(1.2);
      expect(d).toBeLessThan(3.8);
    }
    expect(Math.max(...deltas) - Math.min(...deltas)).toBeLessThan(1.5);
  });
});

describe("determinisme og tempo", () => {
  it("samme seed giver identisk event-liste", () => {
    const a = simulateMatch(team(230, 210, 190), team(200, 220, 210), createRng(7));
    const b = simulateMatch(team(230, 210, 190), team(200, 220, 210), createRng(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("forskellige seeds giver (næsten altid) forskellige kampe", () => {
    const a = simulateMatch(team(), team(), createRng(1));
    const b = simulateMatch(team(), team(), createRng(2));
    expect(JSON.stringify(a.events)).not.toBe(JSON.stringify(b.events));
  });

  it("10.000 kampe på under 1 sekund", () => {
    const rng = createRng(9);
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) simulateMatch(team(), team(240, 240, 240), rng);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe("event-listen (UI'ets afspilnings-kontrakt)", () => {
  it("starter med kickoff, slutter med final, og mål matcher slutresultatet", () => {
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) {
      const r = simulateMatch(team(260, 220, 180), team(), rng);
      expect(r.events[0].type).toBe("kickoff");
      const final = r.events[r.events.length - 1];
      expect(final.type).toBe("final");
      expect(final.score).toEqual(r.score);
      const goals: [number, number] = [0, 0];
      for (const e of r.events) if (e.type === "goal") goals[e.team!]++;
      expect(goals).toEqual(r.score);
      const minutes = r.events.map((e) => e.minute);
      expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
    }
  });

  it("målscorere vægtes efter ANG-bidrag og Målscorer-trait", () => {
    const striker = { id: "s1", name: "Holm", attackContribution: 12, hasGoalscorerTrait: true };
    const mid = { id: "s2", name: "Bak", attackContribution: 3 };
    const homeTeam: MatchTeam = { lines: team(300, 240, 200).lines, scorers: [striker, mid] };
    const rng = createRng(12);
    const counts = { s1: 0, s2: 0 };
    for (let i = 0; i < 3000; i++) {
      for (const e of simulateMatch(homeTeam, team(), rng).events) {
        if (e.type === "goal" && e.team === 0) counts[e.scorerId as "s1" | "s2"]++;
      }
    }
    // vægt 12*1.75=21 mod 3 => ~87,5% af målene til Holm
    const holmShare = counts.s1 / (counts.s1 + counts.s2);
    expect(holmShare).toBeGreaterThan(0.82);
    expect(holmShare).toBeLessThan(0.93);
  });
});
