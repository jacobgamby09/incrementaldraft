/** Sæsonmotoren: fixtures, liga-afvikling for alle 5 divisioner, indkomst,
 *  XP/udvikling, aldring, pension, op-/nedrykning (spilleren er immun),
 *  drafts og sæson-finalisering. */
import { advanceAiPicks, CLASS_SIZE, draftOrder, generateClass, rollQuality } from "./draft";
import { ageAndDecline, develop, FACILITY_CEILING, seasonXp, shouldRetire } from "./development";
import { CLUBS_PER_DIVISION, DIVISIONS, SQUAD_CAP } from "./divisions";
import { ECON, salePrice } from "./economy";
import { evaluate, resolveAssignment, scorersFromAssignment } from "./formation";
import { pickXI, playerOvr, scorerCandidates, teamLines } from "./lineup";
import { simulateMatch } from "./match";
import { makePlayer } from "./player-gen";
import type {
  Club,
  DevelopmentOutcome,
  DraftState,
  FinalizeReport,
  PlayerMatchResult,
  Position,
  SeasonReport,
  TableRow,
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

export function runSeason(world: World): SeasonReport {
  const tables: TableRow[][] = [];
  const playerDivIdx = playerDivisionIndex(world);
  const playerResults: PlayerMatchResult[] = [];
  let playerGoals = 0;
  let playerWins = 0;
  let playerDraws = 0;

  for (let d = 0; d < world.divisions.length; d++) {
    const clubs = world.divisions[d];
    const rows = new Map(clubs.map((c) => [c.id, emptyRow(c)]));
    const lineups = clubs.map((club) => {
      if (club.isPlayer) {
        // Spillerklubben: gemt opstilling + synergier (formations-motoren)
        const assignment = resolveAssignment(club);
        const evaluation = evaluate(assignment);
        return {
          club,
          xi: [...assignment.values()],
          xpMult: evaluation.xpMult,
          team: { lines: evaluation.lines, scorers: scorersFromAssignment(assignment) },
        };
      }
      const xi = pickXI(club.squad);
      return {
        club,
        xi,
        xpMult: {} as Record<string, number>,
        team: { lines: teamLines(xi), scorers: undefined as ReturnType<typeof scorerCandidates> | undefined },
      };
    });

    const fixtures = makeFixtures(CLUBS_PER_DIVISION);
    fixtures.forEach((round, roundIndex) => {
      for (const [h, a] of round) {
        const home = lineups[h];
        const away = lineups[a];
        const result = simulateMatch(home.team, away.team, world.rng);
        const [gh, ga] = result.score;

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

        if (d === playerDivIdx && (home.club.isPlayer || away.club.isPlayer)) {
          const isHome = home.club.isPlayer;
          const gf = isHome ? gh : ga;
          const against = isHome ? ga : gh;
          playerResults.push({
            round: roundIndex + 1,
            opponent: isHome ? away.club.name : home.club.name,
            goalsFor: gf,
            goalsAgainst: against,
            home: isHome,
          });
          playerGoals += gf;
          if (gf > against) playerWins++;
          else if (gf === against) playerDraws++;
        }
      }
    });

    tables.push(sortTable([...rows.values()]));
  }

  // --- indkomst (kun spillerklubben har økonomi i trin 2) ---
  const me = playerClub(world);
  const table = tables[playerDivIdx];
  const position = table.findIndex((r) => r.clubId === me.id) + 1;
  const mult = ECON.DIV_MULT[playerDivIdx];
  const income = {
    goals: Math.round(playerGoals * ECON.GOAL * mult),
    wins: Math.round(playerWins * ECON.WIN * mult),
    draws: Math.round(playerDraws * ECON.DRAW * mult),
    prize: Math.round(ECON.PRIZES[position - 1] * mult),
    total: 0,
  };
  income.total = income.goals + income.wins + income.draws + income.prize;
  me.gold += income.total;

  // --- XP og udvikling (alle klubber, samme motor) ---
  const harvest: DevelopmentOutcome[] = [];
  for (let d = 0; d < world.divisions.length; d++) {
    for (const club of world.divisions[d]) {
      let xiIds: Set<string>;
      let xpMult: Record<string, number> = {};
      if (club.isPlayer) {
        const assignment = resolveAssignment(club);
        xiIds = new Set([...assignment.values()].map((p) => p.id));
        xpMult = evaluate(assignment).xpMult; // Mentor: +50% XP til unge naboer
      } else {
        xiIds = new Set(pickXI(club.squad).map((p) => p.id));
      }
      const ceiling = club.isPlayer
        ? FACILITY_CEILING[club.facilityTier - 1]
        : DIVISIONS[d].aiCeiling;
      for (const p of club.squad) {
        const xp = seasonXp(xiIds.has(p.id), p.age, club.facilityTier) * (xpMult[p.id] ?? 1);
        const outcome = develop(p, xp, ceiling);
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

  return {
    season: world.season,
    tables,
    playerDivisionIndex: playerDivIdx,
    playerPosition: position,
    playerResults,
    income,
    harvest: harvest.sort((a, b) => b.ovrAfter - a.ovrAfter),
    retirements,
    promoted,
    movements,
  };
}

const PLAYER_IMMUNITY_TEXT = "FC Dynasti undgår nedrykning (næstdårligste rykker ned)";

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

      // Auto-salg ned til trup-loftet (kvote-sikkert, billigste først)
      while (club.squad.length > SQUAD_CAP) {
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
