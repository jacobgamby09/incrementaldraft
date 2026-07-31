/** Kampmodellen — porteret 1:1 fra simulation/match_sim.py (kalibreret der).
 *
 *  Tre dueller:
 *    1. Midtbaneduellen fordeler chance-puljen (clampet andel)
 *    2. Angreb mod forsvar afgør hver chance
 *    3. Terningen ruller per chance (binomial-udfald = ærlig varians)
 *
 *  Kalibrerede targets (håndhævet i tests/match-parity.test.ts):
 *    jævnbyrdig ≈ 37/26/37, +20% favorit ≈ 54% sejr, ~2,5 mål/kamp,
 *    stat-paritet mellem ANG/MID/FOR.
 */
import type { RNG } from "./rng";
import type { MatchEvent, MatchResult, MatchTeam, ScorerCandidate } from "./types";

export const MATCH = {
  K: 0.5,
  P_KONV: 2.0,
  P_MID: 1.0,
  CLAMP_LO: 0.3,
  CLAMP_HI: 0.7,
  CHANCES_MIN: 8,
  CHANCES_MAX: 12,
  /** Ekstra målscorer-vægt til Målscorer-traiten */
  GOALSCORER_WEIGHT: 1.75,
} as const;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

function pickScorer(rng: RNG, scorers: ScorerCandidate[] | undefined): ScorerCandidate | undefined {
  if (!scorers || scorers.length === 0) return undefined;
  const weights = scorers.map(
    (s) => Math.max(s.attackContribution, 1) * (s.hasGoalscorerTrait ? MATCH.GOALSCORER_WEIGHT : 1),
  );
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < scorers.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return scorers[i];
  }
  return scorers[scorers.length - 1];
}

export function simulateMatch(home: MatchTeam, away: MatchTeam, rng: RNG): MatchResult {
  const sHome = Math.pow(home.lines.midfield, MATCH.P_MID);
  const sAway = Math.pow(away.lines.midfield, MATCH.P_MID);
  const share = clamp(sHome / (sHome + sAway), MATCH.CLAMP_LO, MATCH.CLAMP_HI);

  const q = (attack: number, defense: number): number =>
    (MATCH.K * Math.pow(attack, MATCH.P_KONV)) /
    (Math.pow(attack, MATCH.P_KONV) + Math.pow(defense, MATCH.P_KONV));
  const qHome = q(home.lines.attack, away.lines.defense);
  const qAway = q(away.lines.attack, home.lines.defense);

  const n = rng.int(MATCH.CHANCES_MIN, MATCH.CHANCES_MAX);
  const minutes = Array.from({ length: n }, () => rng.int(1, 90)).sort((a, b) => a - b);

  const score: [number, number] = [0, 0];
  const chances: [number, number] = [0, 0];
  const events: MatchEvent[] = [{ minute: 0, type: "kickoff" }];

  for (const minute of minutes) {
    const team: 0 | 1 = rng.chance(share) ? 0 : 1;
    chances[team]++;
    const converted = rng.chance(team === 0 ? qHome : qAway);
    if (converted) {
      score[team]++;
      const scorer = pickScorer(rng, (team === 0 ? home : away).scorers);
      events.push({
        minute,
        type: "goal",
        team,
        scorerId: scorer?.id,
        scorerName: scorer?.name,
        score: [score[0], score[1]],
      });
    } else {
      const scorer = pickScorer(rng, (team === 0 ? home : away).scorers);
      events.push({
        minute,
        type: "chance-missed",
        team,
        scorerId: scorer?.id,
        scorerName: scorer?.name,
      });
    }
  }

  events.push({ minute: 90, type: "final", score: [score[0], score[1]] });

  return { score, chances, share, conversion: [qHome, qAway], events };
}
