/** Divisions-skalaen fra DESIGN.md (index 0 = Division 1, 4 = Division 5). */
export interface DivisionSpec {
  name: string;
  /** Typisk spiller-OVR i divisionen */
  typical: [number, number];
  /** Årgangs-OVR ved draft */
  draft: [number, number];
  /** AI-klubbers standard-udviklingsloft */
  aiCeiling: number;
}

export const DIVISIONS: DivisionSpec[] = [
  { name: "Division 1", typical: [82, 99], draft: [74, 90], aiCeiling: 92 },
  { name: "Division 2", typical: [70, 86], draft: [62, 78], aiCeiling: 82 },
  { name: "Division 3", typical: [58, 74], draft: [50, 66], aiCeiling: 74 },
  { name: "Division 4", typical: [45, 62], draft: [38, 54], aiCeiling: 66 },
  { name: "Division 5", typical: [30, 50], draft: [25, 40], aiCeiling: 58 },
];

export const CLUBS_PER_DIVISION = 8;
export const SQUAD_CAP = 16;
