/** Draften: årgangs-generering, mediernes board, rækkefølge og AI-logik.
 *  (Scouting-tågen er et UI-lag og kommer i trin 4 — motoren kender alt.) */
import { DIVISIONS } from "./divisions";
import { playerOvr } from "./lineup";
import { makePlayer } from "./player-gen";
import type { RNG } from "./rng";
import type {
  ClassQuality,
  Club,
  DraftProspect,
  DraftState,
  Player,
  Position,
  TableRow,
} from "./types";

export const CLASS_SIZE = 24;
export const ROUNDS = 3;

/** Positions-garanti: min. 2 GK / 7 DF / 7 MF / 5 FW + 3 frie. */
const QUOTAS: [Position, number][] = [
  ["GK", 2],
  ["DF", 7],
  ["MF", 7],
  ["FW", 5],
];

/** Potentiale-bånd (division 5-baseline; forskydes per division). */
const POT_BANDS: [number, number][] = [
  [40, 55], // fyld
  [55, 70], // solid
  [70, 85], // profil
  [85, 95], // juvel
];

const QUALITY_WEIGHTS: Record<ClassQuality, [number, number, number, number]> = {
  svag: [0.65, 0.28, 0.06, 0.01],
  normal: [0.5, 0.3, 0.15, 0.05],
  staerk: [0.35, 0.35, 0.22, 0.08],
  gylden: [0.25, 0.3, 0.3, 0.15],
};

export function rollQuality(rng: RNG): ClassQuality {
  const r = rng.next();
  if (r < 0.1) return "svag";
  if (r < 0.7) return "normal";
  if (r < 0.92) return "staerk";
  return "gylden";
}

export function generateClass(
  divisionIndex: number,
  quality: ClassQuality,
  rng: RNG,
  makeId: () => string,
): DraftProspect[] {
  const spec = DIVISIONS[divisionIndex];
  const potShift = spec.draft[0] - 25; // div 5 = 0
  const weights = QUALITY_WEIGHTS[quality];

  const positions: Position[] = [];
  for (const [pos, count] of QUOTAS) for (let i = 0; i < count; i++) positions.push(pos);
  const free: Position[] = ["DF", "MF", "FW"];
  while (positions.length < CLASS_SIZE) positions.push(free[rng.int(0, free.length - 1)]);

  const prospects = positions.map((pos) => {
    const targetOvr = rng.int(spec.draft[0], spec.draft[1]);
    const roll = rng.next();
    let band = 0;
    let acc = 0;
    for (let i = 0; i < 4; i++) {
      acc += weights[i];
      if (roll < acc) {
        band = i;
        break;
      }
    }
    const [lo, hi] = POT_BANDS[band];
    const potential = Math.min(99, rng.int(lo + potShift, hi + potShift));
    const player = makePlayer(makeId(), pos, targetOvr, rng.int(16, 19), Math.max(potential, targetOvr + 3), rng, 0.25);
    return { ...player, boardRank: 0 };
  });

  // Mediernes board: nuværende OVR + støj — blindt for potentiale og traits.
  const noisy = prospects
    .map((p) => ({ p, score: playerOvr(p) + rng.next() * 8 - 4 }))
    .sort((a, b) => b.score - a.score);
  noisy.forEach((entry, i) => (entry.p.boardRank = i + 1));

  return prospects;
}

/** Straight draft-rækkefølge (samme hver runde): nyoprykket klub først,
 *  derefter omvendt tabel, nednedrykket (fra oven) sidst. */
export function draftOrder(
  clubs: Club[],
  lastTable: TableRow[] | null,
  promotedInIds: string[],
  relegatedInIds: string[],
): { clubId: string; clubName: string; isPlayer: boolean }[] {
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const promoted = clubs.filter((c) => promotedInIds.includes(c.id));
  const relegated = clubs.filter((c) => relegatedInIds.includes(c.id));
  const incumbents = clubs.filter((c) => !promotedInIds.includes(c.id) && !relegatedInIds.includes(c.id));

  let incumbentOrder = incumbents;
  if (lastTable) {
    const rank = new Map(lastTable.map((row, i) => [row.clubId, i]));
    incumbentOrder = [...incumbents].sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
  }

  const roundOrder = [...promoted, ...incumbentOrder, ...relegated];
  const order: { clubId: string; clubName: string; isPlayer: boolean }[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (const club of roundOrder) {
      const c = byId.get(club.id)!;
      order.push({ clubId: c.id, clubName: c.name, isPlayer: c.isPlayer });
    }
  }
  return order;
}

const SQUAD_QUOTA: Record<Position, number> = { GK: 2, DF: 5, MF: 5, FW: 3 };

/** AI-valg: mediernes board + positionsbehov + støj. Kender IKKE potentiale. */
export function aiChoose(prospects: DraftProspect[], club: Club, rng: RNG): DraftProspect {
  const counts: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of club.squad) counts[p.pos]++;
  let best: DraftProspect = prospects[0];
  let bestScore = -Infinity;
  for (const p of prospects) {
    const deficit = Math.max(0, SQUAD_QUOTA[p.pos] - counts[p.pos]);
    const score = 25 - p.boardRank + deficit * 4 + rng.next() * 4 - 2;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/** Afvikl AI-picks indtil det er spillerens tur (eller draften er slut). */
export function advanceAiPicks(draft: DraftState, clubs: Club[], rng: RNG): void {
  const byId = new Map(clubs.map((c) => [c.id, c]));
  while (draft.next < draft.order.length && !draft.order[draft.next].isPlayer && draft.prospects.length > 0) {
    const slot = draft.order[draft.next];
    const club = byId.get(slot.clubId)!;
    const choice = aiChoose(draft.prospects, club, rng);
    assignPick(draft, club, choice);
  }
}

export function playerPick(draft: DraftState, playerClub: Club, prospectId: string): void {
  const choice = draft.prospects.find((p) => p.id === prospectId);
  if (!choice) throw new Error(`Ukendt prospect: ${prospectId}`);
  assignPick(draft, playerClub, choice);
}

function assignPick(draft: DraftState, club: Club, choice: DraftProspect): void {
  draft.prospects = draft.prospects.filter((p) => p.id !== choice.id);
  const { boardRank: _boardRank, ...player } = choice;
  club.squad.push(player as Player);
  draft.taken.push({
    pick: draft.next + 1,
    clubName: club.name,
    isPlayer: club.isPlayer,
    prospect: choice,
  });
  draft.next += 1;
}
