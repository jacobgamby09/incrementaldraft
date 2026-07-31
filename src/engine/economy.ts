/** Guld-økonomien (division 5-baseline; alt skalerer per division). */
import { playerOvr } from "./lineup";
import type { Player } from "./types";

export const ECON = {
  GOAL: 10,
  WIN: 50,
  DRAW: 15,
  /** Placeringspræmie, plads 1-8 */
  PRIZES: [500, 400, 300, 250, 200, 150, 100, 50],
  /** Økonomi-multiplier per division (index 0 = Division 1) */
  DIV_MULT: [40, 16, 6, 2.5, 1],
  FREE_AGENT_COST: 150,
} as const;

export function ageFactor(age: number): number {
  if (age <= 23) return 0.9;
  if (age <= 28) return 1.0;
  if (age <= 30) return 0.7;
  return 0.4;
}

/** Salgspris = OVR × alderskurve + potentiale-præmie for unge (loftramte juveler
 *  er klubbens dyreste vare), skaleret med division. */
export function salePrice(p: Player, divisionIndex: number): number {
  const ovr = playerOvr(p);
  const potentialPremium = p.age <= 23 ? (p.potential - ovr) * 6 : 0;
  return Math.round((ovr * 8 * ageFactor(p.age) + Math.max(0, potentialPremium)) * ECON.DIV_MULT[divisionIndex]);
}
