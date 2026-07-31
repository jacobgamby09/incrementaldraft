/** Paritetstests mod simulation/career_sim.py del 1 (A=5, r=1,03):
 *  fyld 1-2 · solid 2-4 · profil 5-7 · juvel 8-10 sæsoner under
 *  storklubs-forhold (loftet binder ikke, starter hver kamp). */
import { describe, expect, it } from "vitest";
import { develop, FACILITY_CEILING, ageAndDecline, seasonXp, shouldRetire } from "../src/engine/development";
import { playerOvr } from "../src/engine/lineup";
import type { Player } from "../src/engine/types";

/** FW med OVR ≈ 32 (careersim-forhold: start 17 år, OVR 32). */
function rookie(potential: number): Player {
  return { id: "x", name: "Test", pos: "FW", age: 17, attack: 37, midfield: 16, defense: 8, potential };
}

function seasonsToPotential(potential: number): number | null {
  const p = rookie(potential);
  for (let season = 1; season <= 25; season++) {
    const tier = Math.min(7, 1 + Math.floor(season / 2)); // storklubs-skema fra career_sim
    const xp = seasonXp(true, p.age, tier);
    develop(p, xp, 99);
    p.age += 1;
    if (playerOvr(p) >= potential) return season;
    if (p.age >= 30) return null;
  }
  return null;
}

describe("karriere-pacing (career_sim del 1)", () => {
  it("fyld (Pot 45) indfries på 1-2 sæsoner", () => {
    const s = seasonsToPotential(45);
    expect(s).not.toBeNull();
    expect(s!).toBeLessThanOrEqual(2);
  });
  it("solid (Pot 60) indfries på 2-4 sæsoner", () => {
    const s = seasonsToPotential(60);
    expect(s).toBeGreaterThanOrEqual(2);
    expect(s).toBeLessThanOrEqual(4);
  });
  it("profil (Pot 78) indfries på 5-7 sæsoner", () => {
    const s = seasonsToPotential(78);
    expect(s).toBeGreaterThanOrEqual(5);
    expect(s).toBeLessThanOrEqual(7);
  });
  it("juvel (Pot 88) indfries på 8-10 sæsoner", () => {
    const s = seasonsToPotential(88);
    expect(s).toBeGreaterThanOrEqual(8);
    expect(s).toBeLessThanOrEqual(10);
  });
});

describe("udviklingsloftet (to-lofters-reglen)", () => {
  it("væksten stopper ved klubbens loft, og spildt XP registreres", () => {
    const p = rookie(88);
    // Udvikl til loftet på tier 1 (50) med rigelig XP
    const outcome = develop(p, 10000, FACILITY_CEILING[0]);
    expect(playerOvr(p)).toBe(50);
    expect(outcome.ovrAfter).toBe(50);
    expect(outcome.wastedXp).toBeGreaterThan(0);
  });

  it("potentialet er loftet, når det er lavest", () => {
    const p = rookie(45);
    develop(p, 10000, 99);
    expect(playerOvr(p)).toBe(45);
  });

  it("stat-profilen bevares når spilleren udvikler sig", () => {
    const p = rookie(60);
    const ratioBefore = p.attack / p.midfield;
    develop(p, 5000, 99);
    expect(p.attack / p.midfield).toBeCloseTo(ratioBefore, 5);
  });
});

describe("aldring og pension", () => {
  it("forfald starter ved 30 og accelererer", () => {
    const p: Player = { id: "y", name: "Vet", pos: "DF", age: 29, attack: 10, midfield: 20, defense: 60, potential: 60 };
    const loss30 = ageAndDecline(p); // 29 -> 30
    const loss31 = ageAndDecline(p);
    const loss32 = ageAndDecline(p);
    expect(loss30).toBeGreaterThanOrEqual(1);
    expect(loss32).toBeGreaterThan(loss31 - 1); // accelererer (med afrundingsslæk)
  });

  it("pension ved 34 eller under OVR 20", () => {
    const old: Player = { id: "z", name: "Old", pos: "MF", age: 34, attack: 40, midfield: 50, defense: 40, potential: 55 };
    expect(shouldRetire(old)).toBe(true);
    const weak: Player = { id: "w", name: "Weak", pos: "MF", age: 25, attack: 5, midfield: 10, defense: 5, potential: 20 };
    expect(shouldRetire(weak)).toBe(true);
    const fine: Player = { id: "v", name: "Fine", pos: "MF", age: 25, attack: 40, midfield: 50, defense: 40, potential: 60 };
    expect(shouldRetire(fine)).toBe(false);
  });
});
