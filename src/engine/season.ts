/** Sæsonmotoren: fixtures, liga-afvikling for alle 5 divisioner, indkomst,
 *  XP/udvikling, aldring, pension, op-/nedrykning (spilleren er immun),
 *  drafts og sæson-finalisering. */
import { advanceAiPicks, CLASS_SIZE, draftOrder, generateClass, rollQuality } from "./draft";
import { ageAndDecline, develop, FACILITY_CEILING, seasonXp, shouldRetire, XP_RULES } from "./development";
import { CLUBS_PER_DIVISION, DIVISIONS, SQUAD_CAP, SQUAD_TARGET } from "./divisions";
import { ECON, salePrice } from "./economy";
import { evaluate, resolveAssignment, scorersFromAssignment } from "./formation";
import { pickXI, playerOvr, scorerCandidates, teamLines } from "./lineup";
import { simulateMatch } from "./match";
import { makePlayer } from "./player-gen";
import type {
  ActiveSeason,
  Club,
  DevelopmentOutcome,
  DraftState,
  FeedMatch,
  FinalizeReport,
  MatchTeam,
  Player,
  Position,
  SeasonReport,
  TableRow,
  TransferOffer,
  World,
} from "./types";
import { nextId, playerClub, playerDivisionIndex } from "./world";

/** Dobbelt round-robin for 8 hold: 7 runder (cirkelmetoden) + spejlet = 14. */
export function makeFixtures(count: number): [number, number][][] {
  const teams = Array.from({ length: count }, (_, i) => i);
  const rounds: [number, number][][] = [];
  const rotating = teams.slice(1);
  for (let r = 0; r < count - 1; r++) {
    const round: [number, number][] = [];
    const lineupTeams = [teams[0], ...rotating];
    for (let i = 0; i < count / 2; i++) {
      const home = lineupTeams[i];
      const away = lineupTeams[count - 1 - i];
      round.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(round);
    rotating.unshift(rotating.pop()!);
  }
  const mirrored = rounds.map((round) => round.map(([h, a]) => [a, h] as [number, number]));
  return [...rounds, ...mirrored];
}

function emptyRow(club: Club): TableRow {
  return {
    clubId: club.id,
    name: club.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function sortTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

export const ROUNDS_PER_HALF = 7;
export const TOTAL_ROUNDS = 14;

interface DivisionLineup {
  club: Club;
  xiIds: Set<string>;
  xpMult: Record<string, number>;
  team: MatchTeam;
}

/** Opstillinger bygges om ved hver halvleg, så transfervinduets køb og
 *  re-opstilling faktisk påvirker anden halvdel. */
function buildLineups(world: World, d: number, playerDivIdx: number): DivisionLineup[] {
  return world.divisions[d].map((club) => {
    if (club.isPlayer) {
      const assignment = resolveAssignment(club);
      const evaluation = evaluate(assignment);
      return {
        club,
        xiIds: new Set([...assignment.values()].map((p) => p.id)),
        xpMult: evaluation.xpMult,
        team: { lines: evaluation.lines, scorers: scorersFromAssignment(assignment) },
      };
    }
    const xi = pickXI(club.squad);
    return {
      club,
      xiIds: new Set(xi.map((p) => p.id)),
      xpMult: {} as Record<string, number>,
      // I spillerens division får AI-klubber navngivne scorere (feedet viser dem)
      team: {
        lines: teamLines(xi),
        scorers: d === playerDivIdx ? scorerCandidates(xi) : undefined,
      },
    };
  });
}

/** Simulér runderne [fromRound, toRound) (0-indekseret) for alle divisioner. */
function simulateRounds(world: World, active: ActiveSeason, fromRound: number, toRound: number): void {
  const playerDivIdx = playerDivisionIndex(world);
  const fixtures = makeFixtures(CLUBS_PER_DIVISION);
  const roundsPlayed = toRound - fromRound;

  for (let d = 0; d < world.divisions.length; d++) {
    const lineups = buildLineups(world, d, playerDivIdx);
    const rows = active.rows[d];

    // XP efter spilletid i DENNE halvleg (jf. DESIGN.md: startere vokser mest)
    for (const { club, xiIds, xpMult } of lineups) {
      for (const p of club.squad) {
        const share = roundsPlayed / XP_RULES.MATCHES;
        const xp = seasonXp(xiIds.has(p.id), p.age, club.facilityTier) * share * (xpMult[p.id] ?? 1);
        active.xp[p.id] = (active.xp[p.id] ?? 0) + xp;
      }
    }

    for (let r = fromRound; r < toRound; r++) {
      const feedRound: FeedMatch[] = [];
      for (const [h, a] of fixtures[r]) {
        const home = lineups[h];
        const away = lineups[a];
        const result = simulateMatch(home.team, away.team, world.rng);
        const [gh, ga] = result.score;
        const isPlayerMatch = home.club.isPlayer || away.club.isPlayer;

        if (d === playerDivIdx) {
          feedRound.push({
            round: r + 1,
            homeId: home.club.id,
            homeName: home.club.name,
            awayId: away.club.id,
            awayName: away.club.name,
            score: [gh, ga],
            isPlayerMatch,
            events: isPlayerMatch ? result.events : undefined,
          });
        }

        const rowH = rows.get(home.club.id)!;
        const rowA = rows.get(away.club.id)!;
        rowH.played++;
        rowA.played++;
        rowH.goalsFor += gh;
        rowH.goalsAgainst += ga;
        rowA.goalsFor += ga;
        rowA.goalsAgainst += gh;
        if (gh > ga) {
          rowH.won++;
          rowA.lost++;
          rowH.points += 3;
        } else if (gh < ga) {
          rowA.won++;
          rowH.lost++;
          rowA.points += 3;
        } else {
          rowH.drawn++;
          rowA.drawn++;
          rowH.points++;
          rowA.points++;
        }

        if (isPlayerMatch && d === playerDivIdx) {
          const isHome = home.club.isPlayer;
          const gf = isHome ? gh : ga;
          const against = isHome ? ga : gh;
          active.playerResults.push({
            round: r + 1,
            opponent: isHome ? away.club.name : home.club.name,
            goalsFor: gf,
            goalsAgainst: against,
            home: isHome,
          });
          active.playerStats.goals += gf;
          if (gf > against) active.playerStats.wins++;
          else if (gf === against) active.playerStats.draws++;
        }
      }
      if (d === playerDivIdx) active.feed.push(feedRound);
    }
  }
}

/** Kampindtægt (mål/sejre/uafgjorte) — præmien lægges til ved sæsonafslutning. */
function matchIncome(stats: { goals: number; wins: number; draws: number }, divisionIndex: number): number {
  const mult = ECON.DIV_MULT[divisionIndex];
  return Math.round(
    stats.goals * ECON.GOAL * mult + stats.wins * ECON.WIN * mult + stats.draws * ECON.DRAW * mult,
  );
}

/** Første halvleg (runde 1-7). Kampindtægten udbetales med det samme, så
 *  transfervinduet har noget at handle med. */
export function beginSeason(world: World): ActiveSeason {
  const playerDivIdx = playerDivisionIndex(world);
  const active: ActiveSeason = {
    rows: world.divisions.map((clubs) => new Map(clubs.map((c) => [c.id, emptyRow(c)]))),
    feed: [],
    playerStats: { goals: 0, wins: 0, draws: 0 },
    playerResults: [],
    xp: {},
    offers: [],
    paidGold: 0,
  };
  simulateRounds(world, active, 0, ROUNDS_PER_HALF);
  active.paidGold = matchIncome(active.playerStats, playerDivIdx);
  playerClub(world).gold += active.paidGold;
  active.offers = generateOffers(world, playerDivIdx);
  world.activeSeason = active;
  return active;
}

/** Anden halvleg (runde 8-14) + sæsonafslutning: indkomst, udvikling,
 *  aldring, pension, op-/nedrykning. */
export function concludeSeason(world: World): SeasonReport {
  const active = world.activeSeason;
  if (!active) throw new Error("Ingen aktiv sæson — kald beginSeason først");
  const playerDivIdx = playerDivisionIndex(world);

  simulateRounds(world, active, ROUNDS_PER_HALF, TOTAL_ROUNDS);

  const tables = active.rows.map((rows) => sortTable([...rows.values()]));
  const feedRounds = [...active.feed].sort((a, b) => a[0].round - b[0].round);

  // --- indkomst (kun spillerklubben har økonomi) ---
  const me = playerClub(world);
  const table = tables[playerDivIdx];
  const position = table.findIndex((r) => r.clubId === me.id) + 1;
  const mult = ECON.DIV_MULT[playerDivIdx];
  const income = {
    goals: Math.round(active.playerStats.goals * ECON.GOAL * mult),
    wins: Math.round(active.playerStats.wins * ECON.WIN * mult),
    draws: Math.round(active.playerStats.draws * ECON.DRAW * mult),
    prize: Math.round(ECON.PRIZES[position - 1] * mult),
    total: 0,
  };
  income.total = income.goals + income.wins + income.draws + income.prize;
  // Første halvlegs kampindtægt er allerede udbetalt (ved beginSeason)
  me.gold += income.total - active.paidGold;

  // --- udvikling: udmønt akkumuleret XP fra begge halvlege ---
  const harvest: DevelopmentOutcome[] = [];
  for (let d = 0; d < world.divisions.length; d++) {
    for (const club of world.divisions[d]) {
      const ceiling = club.isPlayer
        ? FACILITY_CEILING[club.facilityTier - 1]
        : DIVISIONS[d].aiCeiling;
      for (const p of club.squad) {
        const outcome = develop(p, active.xp[p.id] ?? 0, ceiling);
        if (club.isPlayer) harvest.push(outcome);
      }
    }
  }

  // --- aldring og pension ---
  const retirements: string[] = [];
  for (const division of world.divisions) {
    for (const club of division) {
      for (const p of club.squad) {
        const loss = ageAndDecline(p);
        if (club.isPlayer) {
          const entry = harvest.find((h) => h.playerId === p.id);
          if (entry) {
            entry.agingLoss = loss;
            entry.ovrAfter = playerOvr(p);
          }
        }
      }
      const retiring = club.squad.filter(shouldRetire);
      club.squad = club.squad.filter((p) => !shouldRetire(p));
      for (const p of retiring) {
        if (club.isPlayer) retirements.push(p.name);
        const entry = club.isPlayer ? harvest.find((h) => h.playerId === p.id) : undefined;
        if (entry) entry.retired = true;
      }
    }
  }

  // --- op-/nedrykning (spilleren er immun for nedrykning) ---
  const movements: string[] = [];
  world.draftHints = DIVISIONS.map(() => ({ promotedInIds: [], relegatedInIds: [] }));
  let promoted = false;
  for (let d = 0; d < world.divisions.length - 1; d++) {
    const upper = world.divisions[d];
    const lower = world.divisions[d + 1];
    const upperTable = tables[d];
    const lowerTable = tables[d + 1];

    // Nedrykker fra d: sidstepladsen — medmindre det er spilleren (så næstsidst).
    let relegatedRow = upperTable[upperTable.length - 1];
    if (relegatedRow.clubId === world.playerClubId) {
      relegatedRow = upperTable[upperTable.length - 2];
      movements.push(`${PLAYER_IMMUNITY_TEXT}`);
    }
    const champion = lowerTable[0];

    const relegatedClub = upper.find((c) => c.id === relegatedRow.clubId)!;
    const promotedClub = lower.find((c) => c.id === champion.clubId)!;

    world.divisions[d] = [...upper.filter((c) => c.id !== relegatedClub.id), promotedClub];
    world.divisions[d + 1] = [...lower.filter((c) => c.id !== promotedClub.id), relegatedClub];

    world.draftHints[d].promotedInIds.push(promotedClub.id);
    world.draftHints[d + 1].relegatedInIds.push(relegatedClub.id);

    movements.push(`${promotedClub.name} rykker op i ${DIVISIONS[d].name}`);
    movements.push(`${relegatedClub.name} rykker ned i ${DIVISIONS[d + 1].name}`);
    if (promotedClub.isPlayer) promoted = true;
  }

  world.lastTables = tables;
  world.activeSeason = undefined;

  return {
    season: world.season,
    tables,
    playerDivisionIndex: playerDivIdx,
    playerPosition: position,
    playerResults: active.playerResults,
    rounds: feedRounds,
    income,
    harvest: harvest.sort((a, b) => b.ovrAfter - a.ovrAfter),
    retirements,
    promoted,
    movements,
  };
}

/** Hele sæsonen i ét kald (uden interaktivt transfervindue) — bruges af
 *  tests og batch-simuleringer. */
export function runSeason(world: World): SeasonReport {
  beginSeason(world);
  return concludeSeason(world);
}

const PLAYER_IMMUNITY_TEXT = "FC Dynasti undgår nedrykning (næstdårligste rykker ned)";

/* ============ transfervinduet ============ */

export const TRANSFER = {
  OFFER_SLOTS: 3,
  /** Købspræmie oven på markedsværdien */
  BUY_MARKUP: 1.4,
  REROLL_COST: 50,
} as const;

export function offerPrice(player: Player, divisionIndex: number): number {
  return Math.round(salePrice(player, divisionIndex) * TRANSFER.BUY_MARKUP);
}

export function rerollCost(divisionIndex: number): number {
  return Math.round(TRANSFER.REROLL_COST * ECON.DIV_MULT[divisionIndex]);
}

/** Færdige spillere i peak-alderen: kendte stats, ingen udvikling tilbage
 *  (jf. DESIGN.md — vinduet er "magt nu", draften er "fremtiden").
 *
 *  Prisspredning er bevidst: ét billigt tilbud skal være inden for rækkevidde
 *  af halvlegens indtægt, det dyre kræver opsparing. */
const OFFER_TIERS: [number, number][] = [
  [0.0, 0.35], // billigt
  [0.3, 0.7], // mellem
  [0.6, 1.0], // dyrt
];

export function generateOffers(world: World, divisionIndex: number): TransferOffer[] {
  const [lo, hi] = DIVISIONS[divisionIndex].typical;
  const positions: Position[] = ["GK", "DF", "MF", "FW"];
  const offers: TransferOffer[] = [];
  for (let i = 0; i < TRANSFER.OFFER_SLOTS; i++) {
    const [from, to] = OFFER_TIERS[i % OFFER_TIERS.length];
    const pos = positions[world.rng.int(0, positions.length - 1)];
    const ovr = world.rng.int(Math.round(lo + (hi - lo) * from), Math.round(lo + (hi - lo) * to));
    const age = world.rng.int(26, 29);
    const player = makePlayer(nextId(world), pos, ovr, age, ovr + 1, world.rng, 0.3);
    offers.push({ player, price: offerPrice(player, divisionIndex) });
  }
  return offers;
}

export type BuyResult = { ok: true } | { ok: false; reason: string };

export function buyOffer(world: World, offerIndex: number): BuyResult {
  const active = world.activeSeason;
  if (!active) return { ok: false, reason: "Ingen aktiv sæson" };
  const offer = active.offers[offerIndex];
  if (!offer) return { ok: false, reason: "Tilbuddet findes ikke" };
  const me = playerClub(world);
  if (me.gold < offer.price) return { ok: false, reason: "Ikke nok guld" };
  if (me.squad.length >= SQUAD_CAP) return { ok: false, reason: "Truppen er fuld — sælg en spiller først" };
  me.gold -= offer.price;
  me.squad.push(offer.player);
  active.offers.splice(offerIndex, 1);
  return { ok: true };
}

export function rerollOffers(world: World): BuyResult {
  const active = world.activeSeason;
  if (!active) return { ok: false, reason: "Ingen aktiv sæson" };
  const divisionIndex = playerDivisionIndex(world);
  const cost = rerollCost(divisionIndex);
  const me = playerClub(world);
  if (me.gold < cost) return { ok: false, reason: "Ikke nok guld til reroll" };
  me.gold -= cost;
  active.offers = generateOffers(world, divisionIndex);
  return { ok: true };
}

/** Sælg en spiller fra truppen (også muligt i vinduet, for at gøre plads). */
export function sellPlayer(world: World, playerId: string): BuyResult {
  const me = playerClub(world);
  const divisionIndex = playerDivisionIndex(world);
  const player = me.squad.find((p) => p.id === playerId);
  if (!player) return { ok: false, reason: "Spilleren findes ikke" };
  const counts: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of me.squad) counts[p.pos]++;
  if (counts[player.pos] <= MIN_QUOTA[player.pos]) {
    return { ok: false, reason: `Du skal beholde mindst ${MIN_QUOTA[player.pos]} ${player.pos}` };
  }
  me.gold += salePrice(player, divisionIndex);
  me.squad = me.squad.filter((p) => p.id !== playerId);
  if (me.lineup) {
    for (const [slotId, pid] of Object.entries(me.lineup)) {
      if (pid === playerId) delete me.lineup[slotId];
    }
  }
  return { ok: true };
}

export interface StandingEntry {
  clubId: string;
  name: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

/** Løbende stilling efter de første `upToRound` runder af feedet (sorteret).
 *  Alle klubber i divisionen er med fra runde 0, så tabellen aldrig er tom. */
export function standingsAfter(rounds: FeedMatch[][], upToRound: number): StandingEntry[] {
  const byId = new Map<string, StandingEntry>();
  const ensure = (id: string, name: string): StandingEntry => {
    if (!byId.has(id)) byId.set(id, { clubId: id, name, points: 0, goalsFor: 0, goalsAgainst: 0 });
    return byId.get(id)!;
  };
  // Seed med alle klubber fra første runde (hele divisionen spiller hver runde)
  for (const m of rounds[0] ?? []) {
    ensure(m.homeId, m.homeName);
    ensure(m.awayId, m.awayName);
  }
  for (const round of rounds.slice(0, upToRound)) {
    for (const m of round) {
      const home = ensure(m.homeId, m.homeName);
      const away = ensure(m.awayId, m.awayName);
      const [gh, ga] = m.score;
      home.goalsFor += gh;
      home.goalsAgainst += ga;
      away.goalsFor += ga;
      away.goalsAgainst += gh;
      if (gh > ga) home.points += 3;
      else if (gh < ga) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}

/** Start alle drafts: AI-divisioner afvikles øjeblikkeligt; spillerens division
 *  returneres som interaktiv DraftState. */
export function startDrafts(world: World): DraftState {
  const playerDivIdx = playerDivisionIndex(world);
  let playerDraft: DraftState | null = null;

  for (let d = 0; d < world.divisions.length; d++) {
    const clubs = world.divisions[d];
    const quality = world.nextClassQuality[d];
    const prospects = generateClass(d, quality, world.rng, () => nextId(world));
    const lastTable = world.lastTables ? world.lastTables[d] : null;
    const order = draftOrder(clubs, lastTable, world.draftHints[d].promotedInIds, world.draftHints[d].relegatedInIds);
    const draft: DraftState = {
      divisionIndex: d,
      quality,
      prospects,
      taken: [],
      order,
      next: 0,
    };
    if (d === playerDivIdx) {
      advanceAiPicks(draft, clubs, world.rng);
      playerDraft = draft;
    } else {
      // Ren AI-division: afvikl hele draften nu.
      while (draft.next < draft.order.length && draft.prospects.length > 0) {
        advanceAiPicks(draft, clubs, world.rng);
      }
    }
  }

  return playerDraft!;
}

const MIN_QUOTA: Record<Position, number> = { GK: 2, DF: 4, MF: 4, FW: 2 };

/** Efter draften: auto-salg over trup-loft, auto-fyld under kvoter,
 *  rul næste sæsons årgangs-kvaliteter, sæson +1. */
export function finalizeSeason(world: World, ): FinalizeReport {
  const report: FinalizeReport = { sold: [], freeAgentsAdded: 0 };

  for (let d = 0; d < world.divisions.length; d++) {
    for (const club of world.divisions[d]) {
      // Auto-fyld frie agenter op til XI-kvoterne FØRST (salget er kvote-sikkert
      // og kan derfor ikke rive hullerne op igen)
      const [lo] = DIVISIONS[d].typical;
      for (const pos of Object.keys(MIN_QUOTA) as Position[]) {
        while (club.squad.filter((p) => p.pos === pos).length < MIN_QUOTA[pos]) {
          const ovr = Math.max(20, Math.round(lo * 0.95));
          club.squad.push(makePlayer(nextId(world), pos, ovr, 27, ovr + 2, world.rng, 0));
          if (club.isPlayer) {
            report.freeAgentsAdded++;
            club.gold = Math.max(0, club.gold - ECON.FREE_AGENT_COST * ECON.DIV_MULT[d]);
          }
        }
      }

      // Auto-salg ned til mål-trupstørrelsen (kvote-sikkert, billigste først)
      while (club.squad.length > SQUAD_TARGET) {
        const counts: Record<Position, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
        for (const p of club.squad) counts[p.pos]++;
        const sellable = club.squad
          .filter((p) => counts[p.pos] > MIN_QUOTA[p.pos])
          .sort((a, b) => salePrice(a, d) - salePrice(b, d));
        if (sellable.length === 0) break;
        const victim = sellable[0];
        club.squad = club.squad.filter((p) => p.id !== victim.id);
        if (club.isPlayer) {
          const price = salePrice(victim, d);
          club.gold += price;
          report.sold.push({ name: victim.name, price });
        }
      }
    }
  }

  world.nextClassQuality = DIVISIONS.map(() => rollQuality(world.rng));
  world.season += 1;
  return report;
}

export { CLASS_SIZE };
