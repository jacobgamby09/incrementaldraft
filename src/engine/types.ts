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
