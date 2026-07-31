/** Navne- og klubdata (dansk-klingende, fiktiv verden). */
import type { RNG } from "../engine/rng";

const FIRST = [
  "Anders", "Bo", "Carl", "Dan", "Emil", "Frederik", "Gustav", "Henrik",
  "Ivan", "Jonas", "Kasper", "Lasse", "Mads", "Niels", "Oskar", "Peter",
  "Rasmus", "Simon", "Tobias", "Ulrik", "Victor", "William", "Aksel",
  "Bertram", "Chris", "David", "Elias", "Felix", "Gorm", "Hjalte",
  "Jeppe", "Kristian", "Lucas", "Magnus", "Noah", "Oliver",
];

const LAST = [
  "Andersen", "Bak", "Brandt", "Bundgaard", "Dahl", "Damgaard", "Eriksen",
  "Friis", "Gram", "Holm", "Holt", "Hummel", "Iversen", "Jensen", "Juhl",
  "Kjær", "Krogh", "Lund", "Lykke", "Madsen", "Mørk", "Nørgaard",
  "Overgaard", "Poulsen", "Ravn", "Rask", "Skov", "Steen", "Straarup",
  "Søndergaard", "Thomsen", "Toft", "Vinter", "Winther", "Østergaard",
  "Aagaard", "Bech", "Dalgas", "Fenger", "Grønbæk",
];

export function makePersonName(rng: RNG): string {
  const first = FIRST[rng.int(0, FIRST.length - 1)];
  const last = LAST[rng.int(0, LAST.length - 1)];
  return `${first.charAt(0)}. ${last}`;
}

/** 39 persistente AI-klubidentiteter (spilleren er nr. 40: FC Dynasti). */
export const CLUB_IDENTITIES: { name: string; color: string }[] = [
  { name: "Northbridge FC", color: "#d94343" },
  { name: "Kystdal IF", color: "#3f78c2" },
  { name: "AC Søholm", color: "#2fa84f" },
  { name: "Vestbro United", color: "#8a48d8" },
  { name: "Bakkeby BK", color: "#d8742a" },
  { name: "FC Granitten", color: "#5b6d84" },
  { name: "Havnefronten", color: "#18a86b" },
  { name: "Sortkilde SK", color: "#33333d" },
  { name: "Lynghede IF", color: "#a86ddb" },
  { name: "FC Møllevang", color: "#c2a13f" },
  { name: "Strandparken", color: "#38bdf8" },
  { name: "Egedal Alliancen", color: "#7fb069" },
  { name: "Jernbanen BK", color: "#b3543a" },
  { name: "FC Nordlys", color: "#22d3ee" },
  { name: "Sydhavn United", color: "#e0529e" },
  { name: "Klippeborg IF", color: "#8d9aa8" },
  { name: "AC Tordenskjold", color: "#f0c34e" },
  { name: "Fjordby FC", color: "#4467c9" },
  { name: "Højmarken SK", color: "#5da84a" },
  { name: "FC Vulkanen", color: "#e0603a" },
  { name: "Askelund IF", color: "#907853" },
  { name: "Tåstrand BK", color: "#4aa8a0" },
  { name: "FC Kongshøj", color: "#9b2c48" },
  { name: "Midtbyen United", color: "#606ad8" },
  { name: "Skovfaldet IF", color: "#3c7a3a" },
  { name: "AC Perronen", color: "#787069" },
  { name: "Blæsenborg FC", color: "#63b3e0" },
  { name: "Kalkbrud SK", color: "#cfc6b8" },
  { name: "FC Ravnsholt", color: "#403a52" },
  { name: "Enghave Forenede", color: "#6dbf74" },
  { name: "Stenbro BK", color: "#a0522d" },
  { name: "FC Fyrtårnet", color: "#e8b93a" },
  { name: "Vinterlund IF", color: "#7ec8e3" },
  { name: "AC Slusen", color: "#348a8c" },
  { name: "Gruberg United", color: "#8f4fb0" },
  { name: "Dalsænken FC", color: "#557d3f" },
  { name: "FC Kompasset", color: "#c94f7c" },
  { name: "Brofæstet IF", color: "#4a6d8c" },
  { name: "Solsiden SK", color: "#f0873a" },
];
