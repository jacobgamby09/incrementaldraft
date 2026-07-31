/** Sæsonmotor-tests: verdens-struktur, determinisme, 20-sæsoners levetid,
 *  oprykning/nedrykning (spiller-immunitet), draft og økonomi. */
import { describe, expect, it } from "vitest";
import { advanceAiPicks, generateClass, playerPick, CLASS_SIZE } from "../src/engine/draft";
import { DIVISIONS } from "../src/engine/divisions";
import { pickXI, playerOvr } from "../src/engine/lineup";
import { createRng } from "../src/engine/rng";
import { finalizeSeason, makeFixtures, runSeason, standingsAfter, startDrafts } from "../src/engine/season";
import type { DraftState, World } from "../src/engine/types";
import { createWorld, playerClub, playerDivisionIndex } from "../src/engine/world";

/** Afvikl spillerens draft automatisk (AI-logik for spillerens picks). */
function autoDraft(world: World, draft: DraftState): void {
  const clubs = world.divisions[playerDivisionIndex(world)];
  while (draft.next < draft.order.length && draft.prospects.length > 0) {
    if (draft.order[draft.next].isPlayer) {
      const best = [...draft.prospects].sort((a, b) => b.potential - a.potential)[0];
      playerPick(draft, playerClub(world), best.id);
    }
    advanceAiPicks(draft, clubs, world.rng);
  }
}

function playFullSeason(world: World): ReturnType<typeof runSeason> {
  const report = runSeason(world);
  const draft = startDrafts(world);
  autoDraft(world, draft);
  finalizeSeason(world);
  return report;
}

describe("verdens-strukturen", () => {
  const world = createWorld(7);

  it("5 divisioner × 8 klubber, alle med gyldig XI", () => {
    expect(world.divisions.length).toBe(5);
    for (const division of world.divisions) {
      expect(division.length).toBe(8);
      for (const club of division) {
        expect(club.squad.length).toBe(14);
        expect(pickXI(club.squad).length).toBe(11);
      }
    }
  });

  it("spillerklubben ligger i Division 5", () => {
    expect(playerDivisionIndex(world)).toBe(4);
    expect(playerClub(world).name).toBe("FC Dynasti");
  });

  it("trupper matcher divisions-båndene (± slæk)", () => {
    for (let d = 0; d < 5; d++) {
      const [lo, hi] = DIVISIONS[d].typical;
      for (const club of world.divisions[d]) {
        for (const p of club.squad) {
          const ovr = playerOvr(p);
          expect(ovr).toBeGreaterThanOrEqual(lo - 8);
          expect(ovr).toBeLessThanOrEqual(hi + 8);
        }
      }
    }
  });
});

describe("fixtures", () => {
  it("dobbelt round-robin for 8 hold = 14 runder à 4 kampe, alle møder alle ude og hjemme", () => {
    const fixtures = makeFixtures(8);
    expect(fixtures.length).toBe(14);
    const seen = new Set<string>();
    for (const round of fixtures) {
      expect(round.length).toBe(4);
      const inRound = new Set<number>();
      for (const [h, a] of round) {
        expect(inRound.has(h)).toBe(false);
        expect(inRound.has(a)).toBe(false);
        inRound.add(h);
        inRound.add(a);
        const key = `${h}-${a}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(56); // 8×7 ordnede par
  });
});

describe("sæson-afvikling", () => {
  it("deterministisk: samme seed giver samme tabeller", () => {
    const w1 = createWorld(11);
    const w2 = createWorld(11);
    const r1 = runSeason(w1);
    const r2 = runSeason(w2);
    expect(JSON.stringify(r1.tables)).toBe(JSON.stringify(r2.tables));
  });

  it("tabellen stemmer: 14 kampe per klub, pointsum konsistent", () => {
    const world = createWorld(13);
    const report = runSeason(world);
    for (const table of report.tables) {
      for (const row of table) {
        expect(row.played).toBe(14);
        expect(row.points).toBe(row.won * 3 + row.drawn);
      }
      const totalGoalsFor = table.reduce((s, r) => s + r.goalsFor, 0);
      const totalGoalsAgainst = table.reduce((s, r) => s + r.goalsAgainst, 0);
      expect(totalGoalsFor).toBe(totalGoalsAgainst);
    }
  });

  it("indkomsten lander i et fornuftigt division 5-bånd", () => {
    // Startklubben er bevidst underdog, så enkeltsæsoner svinger — test snittet
    let total = 0;
    for (const seed of [17, 18, 19, 20, 21]) {
      const report = runSeason(createWorld(seed));
      expect(report.income.total).toBeGreaterThan(150);
      expect(report.income.total).toBeLessThan(2500);
      total += report.income.total;
    }
    const average = total / 5;
    expect(average).toBeGreaterThan(350);
    expect(average).toBeLessThan(1500);
  });
});

describe("sæson-feedet", () => {
  it("14 runder à 4 kampe; spillerens kamp har navngivne events, der matcher scoren", () => {
    const world = createWorld(61);
    const report = runSeason(world);
    expect(report.rounds.length).toBe(14);
    for (const round of report.rounds) {
      expect(round.length).toBe(4);
      const playerMatches = round.filter((m) => m.isPlayerMatch);
      expect(playerMatches.length).toBe(1);
      const m = playerMatches[0];
      expect(m.events).toBeDefined();
      const goals = m.events!.filter((e) => e.type === "goal");
      expect(goals.length).toBe(m.score[0] + m.score[1]);
      for (const g of goals) expect(g.scorerName).toBeTruthy();
    }
  });

  it("standingsAfter(14) matcher sluttabellen", () => {
    const world = createWorld(67);
    const report = runSeason(world);
    const standings = standingsAfter(report.rounds, 14);
    const finalTable = report.tables[report.playerDivisionIndex];
    expect(standings.length).toBe(8);
    for (const row of finalTable) {
      const entry = standings.find((s) => s.clubId === row.clubId)!;
      expect(entry.points).toBe(row.points);
      expect(entry.goalsFor).toBe(row.goalsFor);
    }
  });

  it("standingsAfter er progressiv: point stiger monotont for alle klubber", () => {
    const world = createWorld(71);
    const report = runSeason(world);
    const prev = new Map<string, number>();
    for (let r = 1; r <= 14; r++) {
      for (const entry of standingsAfter(report.rounds, r)) {
        expect(entry.points).toBeGreaterThanOrEqual(prev.get(entry.clubId) ?? 0);
        prev.set(entry.clubId, entry.points);
      }
    }
  });
});

describe("20 sæsoners levetid", () => {
  it("verden overlever, trupper er gyldige, ingen spiller over pensionsalderen", () => {
    const world = createWorld(23);
    for (let s = 0; s < 20; s++) playFullSeason(world);
    expect(world.season).toBe(21);
    for (const division of world.divisions) {
      expect(division.length).toBe(8);
      for (const club of division) {
        expect(pickXI(club.squad).length).toBe(11);
        expect(club.squad.length).toBeLessThanOrEqual(16);
        for (const p of club.squad) expect(p.age).toBeLessThan(34);
      }
    }
    // Spillerklubben findes stadig præcis én gang
    const playerClubs = world.divisions.flat().filter((c) => c.isPlayer);
    expect(playerClubs.length).toBe(1);
  });
});

describe("op-/nedrykning", () => {
  it("suverænt hold rykker op og får topvalg i den nye divisions draft", () => {
    const world = createWorld(31);
    // Gør spillerklubben suveræn i Division 5
    const me = playerClub(world);
    for (const p of me.squad) {
      p.attack = 70;
      p.midfield = 70;
      p.defense = 70;
      p.potential = 75;
      p.age = Math.min(p.age, 27);
    }
    const report = runSeason(world);
    expect(report.promoted).toBe(true);
    expect(playerDivisionIndex(world)).toBe(3);
    const draft = startDrafts(world);
    // Nyoprykket klub vælger først
    expect(draft.order[0].isPlayer).toBe(true);
  });

  it("spilleren kan aldrig rykke ned — den næstdårligste AI ryger i stedet", () => {
    const world = createWorld(37);
    // Flyt spillerklubben op i Division 4 og gør den elendig
    const me = playerClub(world);
    world.divisions[4] = world.divisions[4].filter((c) => !c.isPlayer);
    const swapped = world.divisions[3].pop()!;
    world.divisions[3].push(me);
    world.divisions[4].push(swapped);
    for (const p of me.squad) {
      p.attack = 15;
      p.midfield = 15;
      p.defense = 15;
      p.potential = 40;
    }
    runSeason(world);
    expect(playerDivisionIndex(world)).toBe(3); // stadig i Division 4
  });
});

describe("draften", () => {
  it("årgangen har 24 spillere med positions-garanti og bånd-korrekte værdier", () => {
    const rng = createRng(41);
    let counter = 0;
    const prospects = generateClass(4, "normal", rng, () => `t${counter++}`);
    expect(prospects.length).toBe(CLASS_SIZE);
    const count = (pos: string) => prospects.filter((p) => p.pos === pos).length;
    expect(count("GK")).toBeGreaterThanOrEqual(2);
    expect(count("DF")).toBeGreaterThanOrEqual(7);
    expect(count("MF")).toBeGreaterThanOrEqual(7);
    expect(count("FW")).toBeGreaterThanOrEqual(5);
    for (const p of prospects) {
      expect(p.age).toBeGreaterThanOrEqual(16);
      expect(p.age).toBeLessThanOrEqual(19);
      expect(playerOvr(p)).toBeGreaterThanOrEqual(DIVISIONS[4].draft[0] - 3);
      expect(playerOvr(p)).toBeLessThanOrEqual(DIVISIONS[4].draft[1] + 3);
      expect(p.potential).toBeGreaterThan(playerOvr(p));
      expect(p.boardRank).toBeGreaterThanOrEqual(1);
      expect(p.boardRank).toBeLessThanOrEqual(CLASS_SIZE);
    }
  });

  it("gyldne årgange har markant flere høj-potentiale-spillere end svage", () => {
    const rng = createRng(43);
    let counter = 0;
    const id = () => `g${counter++}`;
    let goldenGems = 0;
    let weakGems = 0;
    for (let i = 0; i < 30; i++) {
      goldenGems += generateClass(4, "gylden", rng, id).filter((p) => p.potential >= 70).length;
      weakGems += generateClass(4, "svag", rng, id).filter((p) => p.potential >= 70).length;
    }
    expect(goldenGems).toBeGreaterThan(weakGems * 2.5);
  });

  it("interaktiv draft: AI vælger frem til spillerens tur, spillerens valg lander i truppen", () => {
    const world = createWorld(47);
    runSeason(world);
    const draft = startDrafts(world);
    expect(draft.order.filter((o) => o.isPlayer).length).toBe(3);
    expect(draft.order[draft.next].isPlayer).toBe(true); // AI er kørt frem til os
    const me = playerClub(world);
    const before = me.squad.length;
    const choice = draft.prospects[0];
    playerPick(draft, me, choice.id);
    expect(me.squad.length).toBe(before + 1);
    expect(me.squad.some((p) => p.id === choice.id)).toBe(true);
  });
});
