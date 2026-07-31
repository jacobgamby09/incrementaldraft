/** XP, udviklingsloft, aldring og pension.
 *  Kalibreret i simulation/career_sim.py: pris per OVR-point = 5 × 1,03^OVR.
 *  Udvikling opererer på OVR og skalerer de tre stats proportionalt
 *  (profilen bevares) — 1:1 med karriere-harnessets model. */
import { playerOvr, ROLE_WEIGHTS } from "./lineup";
import type { DevelopmentOutcome, Player } from "./types";

export const XP_RULES = {
  STARTER: 10,
  BENCH: 3,
  MATCHES: 14,
  YOUNG_AGE: 23,
  YOUNG_MULT: 1.5,
  FACILITY_BONUS: 0.1,
  COST_A: 5,
  COST_R: 1.03,
} as const;

/** Udviklingsloft per Træningsanlæg-tier (1-7). */
export const FACILITY_CEILING = [50, 58, 66, 74, 82, 90, 99] as const;

export const RETIREMENT_AGE = 34;
export const MIN_OVR = 20;

export function pointCost(ovr: number): number {
  return XP_RULES.COST_A * Math.pow(XP_RULES.COST_R, ovr);
}

export function seasonXp(isStarter: boolean, age: number, facilityTier: number): number {
  const base = XP_RULES.MATCHES * (isStarter ? XP_RULES.STARTER : XP_RULES.BENCH);
  const young = age < XP_RULES.YOUNG_AGE ? XP_RULES.YOUNG_MULT : 1;
  const facility = 1 + XP_RULES.FACILITY_BONUS * (facilityTier - 1);
  return base * young * facility;
}

function exactOvr(p: Player): number {
  const w = ROLE_WEIGHTS[p.pos];
  const total = w.attack + w.midfield + w.defense;
  return (p.attack * w.attack + p.midfield * w.midfield + p.defense * w.defense) / total;
}

/** Skalér stats mod en mål-OVR. Profilen bevares, indtil en stat rammer 99 —
 *  derefter fordeles væksten på de øvrige (iterativt), så mål-OVR altid nås. */
function rescaleToOvr(p: Player, targetOvr: number): void {
  for (let i = 0; i < 10; i++) {
    const current = exactOvr(p);
    if (Math.abs(current - targetOvr) < 0.02) break;
    const factor = targetOvr / current;
    p.attack = Math.min(99, Math.max(1, p.attack * factor));
    p.midfield = Math.min(99, Math.max(1, p.midfield * factor));
    p.defense = Math.min(99, Math.max(1, p.defense * factor));
  }
}

/** Brug XP: køb OVR-point til prisen stiger over rådighed, potentiale eller loft.
 *  Returnerer høst-data. `wastedXp` sættes kun når loftet/potentialet stopper væksten. */
export function develop(p: Player, xp: number, ceiling: number): DevelopmentOutcome {
  const before = playerOvr(p);
  const cap = Math.min(p.potential, ceiling);
  let ovr = before;
  let remaining = xp;
  while (ovr < cap && remaining >= pointCost(ovr)) {
    remaining -= pointCost(ovr);
    ovr += 1;
  }
  if (ovr > before) rescaleToOvr(p, ovr);
  const capped = ovr >= cap;
  return {
    playerId: p.id,
    name: p.name,
    pos: p.pos,
    xp: Math.round(xp),
    wastedXp: capped ? Math.round(remaining) : 0,
    ovrBefore: before,
    ovrAfter: playerOvr(p),
    agingLoss: 0,
    retired: false,
  };
}

/** Alder +1; fra 30 mistes (alder-29) OVR-point per sæson (proportional skalering). */
export function ageAndDecline(p: Player): number {
  p.age += 1;
  if (p.age < 30) return 0;
  const loss = p.age - 29;
  const before = playerOvr(p);
  const target = Math.max(1, before - loss);
  rescaleToOvr(p, target);
  return before - playerOvr(p);
}

export function shouldRetire(p: Player): boolean {
  return p.age >= RETIREMENT_AGE || playerOvr(p) < MIN_OVR;
}
