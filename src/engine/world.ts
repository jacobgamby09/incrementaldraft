/** Verdens-generering: 5 divisioner × 8 klubber, fuld persistens (DESIGN.md). */
import { CLUB_IDENTITIES } from "../content/names";
import { CLUBS_PER_DIVISION, DIVISIONS } from "./divisions";
import { rollQuality } from "./draft";
import { makePlayer } from "./player-gen";
import { createRng } from "./rng";
import type { Club, Player, Position, World } from "./types";

const SQUAD_SHAPE: [Position, number][] = [
  ["GK", 2],
  ["DF", 5],
  ["MF", 4],
  ["FW", 3],
];

export const PLAYER_CLUB_NAME = "FC Dynasti";
export const PLAYER_CLUB_COLOR = "#a3e635";

function genSquad(world: World, divisionIndex: number, isPlayer: boolean): Player[] {
  const [lo, hi] = DIVISIONS[divisionIndex].typical;
  // Spillerens startklub ligger i den nedre del af båndet — man starter som underdog.
  const top = isPlayer ? lo + (hi - lo) * 0.6 : hi;
  const squad: Player[] = [];
  for (const [pos, count] of SQUAD_SHAPE) {
    for (let i = 0; i < count; i++) {
      const targetOvr = world.rng.int(Math.round(lo), Math.round(top));
      const age = world.rng.int(19, 31);
      const headroom = Math.max(2, Math.round((33 - age) / 1.5));
      const potential = targetOvr + world.rng.int(1, headroom);
      squad.push(makePlayer(nextId(world), pos, targetOvr, age, potential, world.rng));
    }
  }
  return squad;
}

export function nextId(world: World): string {
  world.idCounter += 1;
  return `p${world.idCounter}`;
}

export function createWorld(seed: number): World {
  const world: World = {
    season: 1,
    divisions: [],
    playerClubId: "club-player",
    nextClassQuality: [],
    lastTables: null,
    draftHints: DIVISIONS.map(() => ({ promotedInIds: [], relegatedInIds: [] })),
    idCounter: 0,
    rng: createRng(seed),
  };

  const identities = [...CLUB_IDENTITIES];
  let identityIndex = 0;

  for (let d = 0; d < DIVISIONS.length; d++) {
    const clubs: Club[] = [];
    for (let i = 0; i < CLUBS_PER_DIVISION; i++) {
      const isPlayer = d === 4 && i === 0;
      const identity = isPlayer
        ? { name: PLAYER_CLUB_NAME, color: PLAYER_CLUB_COLOR }
        : identities[identityIndex++];
      const club: Club = {
        id: isPlayer ? world.playerClubId : `club-${d}-${i}`,
        name: identity.name,
        color: identity.color,
        isPlayer,
        squad: [],
        gold: 0,
        facilityTier: 1,
      };
      club.squad = genSquad(world, d, isPlayer);
      clubs.push(club);
    }
    world.divisions.push(clubs);
  }

  world.nextClassQuality = DIVISIONS.map(() => rollQuality(world.rng));
  return world;
}

export function playerClub(world: World): Club {
  for (const division of world.divisions) {
    const club = division.find((c) => c.isPlayer);
    if (club) return club;
  }
  throw new Error("Spillerklubben findes ikke i verden");
}

export function playerDivisionIndex(world: World): number {
  return world.divisions.findIndex((division) => division.some((c) => c.isPlayer));
}
