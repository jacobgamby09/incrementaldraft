import type { RNG } from "./rng";

/* ============ kamp ============ */

export interface TeamLines {
  attack: number;
  midfield: number;
  defense: number;
}

/** Kandidat til målscorer-tildeling: vægtes efter ANG-bidrag i opstillingen,
 *  med ekstra vægt til Målscorer-traiten (jf. DESIGN.md). */
export interface ScorerCandidate {
  id: string;
  name: string;
  attackContribution: number;
  hasGoalscorerTrait?: boolean;
}

export interface MatchTeam {
  lines: TeamLines;
  scorers?: ScorerCandidate[];
}

export type MatchEventType = "kickoff" | "chance-missed" | "goal" | "final";

/** Event-listen er UI'ets afspilnings-kontrakt: motoren afgør kampen på et
 *  millisekund, UI'et afspiller listen som drama i valgfri hastighed. */
export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  /** 0 = hjemme, 1 = ude */
  team?: 0 | 1;
  scorerId?: string;
  scorerName?: string;
  /** Stillingen efter eventet (sat på goal og final) */
  score?: [number, number];
}

export interface MatchResult {
  score: [number, number];
  chances: [number, number];
  /** Hjemmeholdets chanceandel efter midtbaneduellen (clampet) */
  share: number;
  /** P(mål) per chance for hhv. hjemme og ude */
  conversion: [number, number];
  events: MatchEvent[];
}

/* ============ spillere og klubber ============ */

export type Position = "GK" | "DF" | "MF" | "FW";

export type Trait = "playmaker" | "goalscorer" | "captain" | "mentor" | "twoway" | "glass";

export interface Player {
  id: string;
  name: string;
  pos: Position;
  age: number;
  /** Kernestats (floats internt; afrundes kun ved visning) */
  attack: number;
  midfield: number;
  defense: number;
  potential: number;
  trait?: Trait;
}

export interface Club {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  squad: Player[];
  gold: number;
  /** Træningsanlæggets tier (1-7) — bestemmer udviklingsloftet. AI bruger divisions-standard. */
  facilityTier: number;
  /** Spillerens gemte opstilling: slotId -> playerId (kun spillerklubben) */
  lineup?: Record<string, string>;
}

export interface TableRow {
  clubId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/* ============ verden ============ */

export type ClassQuality = "svag" | "normal" | "staerk" | "gylden";

export interface DraftOrderHints {
  promotedInIds: string[];
  relegatedInIds: string[];
}

/** Tilbud i transfervinduet: færdig peak-spiller til guldpris. */
export interface TransferOffer {
  player: Player;
  price: number;
}

/** Igangværende sæson (mellem beginSeason og concludeSeason) — muliggør
 *  transfervinduet midtvejs: anden halvdel simuleres først EFTER vinduet. */
export interface ActiveSeason {
  /** Akkumulerede tabelrækker per division */
  rows: Map<string, TableRow>[];
  /** Feed-runder spillet indtil videre (spillerens division) */
  feed: FeedMatch[][];
  playerStats: { goals: number; wins: number; draws: number };
  playerResults: PlayerMatchResult[];
  /** Akkumuleret XP per spiller-id (udmøntes ved sæsonafslutning) */
  xp: Record<string, number>;
  offers: TransferOffer[];
  /** Guld allerede udbetalt i denne sæson (første halvlegs dryp) */
  paidGold: number;
}

export interface World {
  season: number;
  /** divisions[0] = Division 1 (top) … divisions[4] = Division 5 */
  divisions: Club[][];
  playerClubId: string;
  /** Annonceret årgangs-kvalitet per division (rulles ved sæsonafslutning for NÆSTE sæson) */
  nextClassQuality: ClassQuality[];
  lastTables: TableRow[][] | null;
  draftHints: DraftOrderHints[];
  idCounter: number;
  rng: RNG;
  activeSeason?: ActiveSeason;
}

/* ============ sæson-rapport (høsten) ============ */

export interface DevelopmentOutcome {
  playerId: string;
  name: string;
  pos: Position;
  xp: number;
  wastedXp: number;
  ovrBefore: number;
  ovrAfter: number;
  agingLoss: number;
  retired: boolean;
}

export interface PlayerMatchResult {
  round: number;
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  home: boolean;
}

/** Én kamp i sæson-feedet (spillerens division). Events gemmes kun for
 *  spillerens egne kampe — resten bruges til løbende stilling. */
export interface FeedMatch {
  round: number;
  homeId: string;
  homeName: string;
  awayId: string;
  awayName: string;
  score: [number, number];
  isPlayerMatch: boolean;
  events?: MatchEvent[];
}

export interface SeasonReport {
  season: number;
  tables: TableRow[][];
  playerDivisionIndex: number;
  playerPosition: number;
  playerResults: PlayerMatchResult[];
  /** 14 runder × 4 kampe fra spillerens division — sæson-feedets råstof */
  rounds: FeedMatch[][];
  income: { goals: number; wins: number; draws: number; prize: number; total: number };
  harvest: DevelopmentOutcome[];
  retirements: string[];
  promoted: boolean;
  movements: string[];
}

/* ============ draft ============ */

export interface DraftProspect extends Player {
  /** Mediernes board-placering (1 = bedst) — blind for potentiale */
  boardRank: number;
}

export interface DraftPickLog {
  pick: number;
  clubName: string;
  isPlayer: boolean;
  prospect: DraftProspect;
}

export interface DraftState {
  divisionIndex: number;
  quality: ClassQuality;
  prospects: DraftProspect[];
  taken: DraftPickLog[];
  order: { clubId: string; clubName: string; isPlayer: boolean }[];
  next: number;
}

export interface FinalizeReport {
  sold: { name: string; price: number }[];
  freeAgentsAdded: number;
}
