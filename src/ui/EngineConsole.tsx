import { useState } from "react";
import { simulateMatch } from "../engine/match";
import { createRng } from "../engine/rng";
import type { MatchEvent, MatchTeam } from "../engine/types";

const SAMPLE_HOME: MatchTeam = {
  lines: { attack: 246, midfield: 231, defense: 198 },
  scorers: [
    { id: "holm", name: "V. Holm", attackContribution: 12, hasGoalscorerTrait: true },
    { id: "dahl", name: "K. Dahl", attackContribution: 8 },
    { id: "bak", name: "E. Bak", attackContribution: 3 },
    { id: "lund", name: "V. Lund", attackContribution: 2 },
  ],
};
const SAMPLE_AWAY: MatchTeam = {
  lines: { attack: 215, midfield: 235, defense: 219 },
  scorers: [
    { id: "n9", name: "P. Krogh", attackContribution: 9 },
    { id: "n10", name: "F. Steen", attackContribution: 6 },
  ],
};

interface Row {
  label: string;
  win: string;
  draw: string;
  loss: string;
  goals: string;
  blowout: string;
  ms: string;
}

function runScenario(label: string, ratio: number, n: number): Row {
  const rng = createRng(Date.now() % 2 ** 31);
  const favorite: MatchTeam = { lines: { attack: 200 * ratio, midfield: 200 * ratio, defense: 200 * ratio } };
  const underdog: MatchTeam = { lines: { attack: 200, midfield: 200, defense: 200 } };
  let win = 0, draw = 0, loss = 0, goals = 0, blowout = 0;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const [ga, gb] = simulateMatch(favorite, underdog, rng).score;
    if (ga > gb) win++; else if (ga === gb) draw++; else loss++;
    goals += ga + gb;
    if (Math.abs(ga - gb) >= 4) blowout++;
  }
  const pct = (x: number) => `${((100 * x) / n).toFixed(1)}%`;
  return {
    label,
    win: pct(win),
    draw: pct(draw),
    loss: pct(loss),
    goals: (goals / n).toFixed(2),
    blowout: pct(blowout),
    ms: `${(performance.now() - t0).toFixed(0)} ms`,
  };
}

function eventLine(e: MatchEvent): string {
  const side = e.team === 0 ? "FC Dynasti" : "Northbridge";
  switch (e.type) {
    case "kickoff":
      return "0'  Kampstart";
    case "chance-missed":
      return `${e.minute}'  CHANCE — ${e.scorerName ?? side} … FORBI`;
    case "goal":
      return `${e.minute}'  MÅÅÅL! ${e.scorerName ?? side} (${e.score![0]}-${e.score![1]})`;
    case "final":
      return `90'  Slutfløjt — ${e.score![0]}-${e.score![1]}`;
  }
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1220", color: "#e8eef7", fontFamily: "Segoe UI, system-ui, sans-serif", padding: "28px 34px" },
  h1: { fontSize: 18, marginBottom: 2 },
  sub: { color: "#93a1b8", fontSize: 13, marginBottom: 22 },
  btn: { background: "#a3e635", color: "#0b1220", border: "none", fontWeight: 800, padding: "9px 16px", borderRadius: 8, cursor: "pointer", marginRight: 10, marginBottom: 10 },
  btn2: { background: "rgba(255,255,255,.08)", color: "#e8eef7", border: "1px solid rgba(255,255,255,.15)", fontWeight: 700, padding: "9px 16px", borderRadius: 8, cursor: "pointer", marginRight: 10, marginBottom: 10 },
  table: { borderCollapse: "collapse", marginTop: 14, fontSize: 14 },
  cell: { border: "1px solid rgba(255,255,255,.12)", padding: "7px 14px", textAlign: "right" },
  events: { marginTop: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "14px 18px", fontFamily: "Consolas, monospace", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" },
};

export function EngineConsole() {
  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  const runAll = () => {
    setRows([
      runScenario("Jævnbyrdig (200 vs 200)", 1.0, 10000),
      runScenario("+10% favorit", 1.1, 10000),
      runScenario("+20% favorit", 1.2, 10000),
      runScenario("+50% favorit", 1.5, 10000),
    ]);
  };

  const playOne = () => {
    const result = simulateMatch(SAMPLE_HOME, SAMPLE_AWAY, createRng(Date.now() % 2 ** 31));
    setEvents(result.events.map(eventLine));
  };

  return (
    <div style={S.page}>
      <div style={S.h1}>Dynastiet — engine-konsol</div>
      <div style={S.sub}>
        Trin 1-debugside: beviser wiring engine → UI. Kampmodel: K=0,5 · p_konv=2,0 · p_mid=1,0 · chancer 8-12 · clamp 30-70%.
      </div>

      <button style={S.btn} onClick={runAll}>Kør 4 × 10.000 kampe</button>
      <button style={S.btn2} onClick={playOne}>Afspil én kamp (event-liste)</button>

      {rows.length > 0 && (
        <table style={S.table}>
          <thead>
            <tr>
              {["Scenario", "Sejr", "Uafgjort", "Tab", "Mål/kamp", "Margin ≥4", "Tid"].map((h) => (
                <th key={h} style={{ ...S.cell, textAlign: "left", color: "#93a1b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td style={{ ...S.cell, textAlign: "left" }}>{r.label}</td>
                <td style={S.cell}>{r.win}</td>
                <td style={S.cell}>{r.draw}</td>
                <td style={S.cell}>{r.loss}</td>
                <td style={S.cell}>{r.goals}</td>
                <td style={S.cell}>{r.blowout}</td>
                <td style={S.cell}>{r.ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {events.length > 0 && <div style={S.events}>{events.join("\n")}</div>}
    </div>
  );
}
