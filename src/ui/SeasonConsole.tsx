import { DIVISIONS } from "../engine/divisions";
import { playerOvr } from "../engine/lineup";
import type { DraftProspect, Player, TableRow } from "../engine/types";
import { playerClub, playerDivisionIndex } from "../engine/world";
import { useGame } from "./store";

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1220", color: "#e8eef7", fontFamily: "Segoe UI, system-ui, sans-serif", padding: "22px 28px 60px" },
  header: { display: "flex", gap: 18, alignItems: "baseline", marginBottom: 16, flexWrap: "wrap" },
  h1: { fontSize: 18, fontWeight: 800 },
  meta: { color: "#93a1b8", fontSize: 13 },
  gold: { color: "#fbbf24", fontWeight: 800 },
  row: { display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" },
  panel: { background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: "14px 18px", marginBottom: 18 },
  title: { fontSize: 11, fontWeight: 800, letterSpacing: 1.6, textTransform: "uppercase", color: "#93a1b8", marginBottom: 10 },
  table: { borderCollapse: "collapse", fontSize: 13 },
  cell: { border: "1px solid rgba(255,255,255,.10)", padding: "4px 10px", textAlign: "right", whiteSpace: "nowrap" },
  cellL: { border: "1px solid rgba(255,255,255,.10)", padding: "4px 10px", textAlign: "left", whiteSpace: "nowrap" },
  btn: { background: "#a3e635", color: "#0b1220", border: "none", fontWeight: 800, padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14 },
  btn2: { background: "rgba(255,255,255,.08)", color: "#e8eef7", border: "1px solid rgba(255,255,255,.15)", fontWeight: 700, padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12 },
  good: { color: "#a3e635", fontWeight: 700 },
  bad: { color: "#f87171", fontWeight: 700 },
  dim: { color: "#93a1b8" },
};

const TRAIT_LABEL: Record<string, string> = {
  playmaker: "✨ Playmaker",
  goalscorer: "⚽ Målscorer",
  captain: "Ⓒ Anfører",
  mentor: "🎓 Mentor",
  twoway: "↔ Tovejs",
  glass: "💥 Glaskrop",
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

function SquadTable({ squad }: { squad: Player[] }) {
  const sorted = [...squad].sort((a, b) => playerOvr(b) - playerOvr(a));
  return (
    <table style={S.table}>
      <thead>
        <tr>
          {["Navn", "Pos", "Alder", "OVR", "Pot", "Trait"].map((h) => (
            <th key={h} style={{ ...S.cellL, color: "#93a1b8" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => (
          <tr key={p.id}>
            <td style={S.cellL}>{p.name}</td>
            <td style={S.cellL}>{p.pos}</td>
            <td style={S.cell}>{p.age}</td>
            <td style={{ ...S.cell, fontWeight: 800 }}>{playerOvr(p)}</td>
            <td style={{ ...S.cell, color: "#93a1b8" }}>{Math.round(p.potential)}</td>
            <td style={S.cellL}>{p.trait ? TRAIT_LABEL[p.trait] : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeagueTable({ rows, playerClubId }: { rows: TableRow[]; playerClubId: string }) {
  return (
    <table style={S.table}>
      <thead>
        <tr>
          {["#", "Klub", "K", "V", "U", "T", "Mål", "Point"].map((h) => (
            <th key={h} style={{ ...S.cellL, color: "#93a1b8" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.clubId} style={r.clubId === playerClubId ? { background: "rgba(163,230,53,.10)" } : undefined}>
            <td style={S.cell}>{i + 1}</td>
            <td style={S.cellL}>{r.name}</td>
            <td style={S.cell}>{r.played}</td>
            <td style={S.cell}>{r.won}</td>
            <td style={S.cell}>{r.drawn}</td>
            <td style={S.cell}>{r.lost}</td>
            <td style={S.cell}>{r.goalsFor}-{r.goalsAgainst}</td>
            <td style={{ ...S.cell, fontWeight: 800 }}>{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DraftBoard() {
  const draft = useGame((s) => s.draft);
  const phase = useGame((s) => s.phase);
  const pick = useGame((s) => s.pick);
  const finishSeason = useGame((s) => s.finishSeason);
  if (!draft) return null;

  const myTurn = phase === "draft" && draft.order[draft.next]?.isPlayer;
  const picksUntilMe = draft.order.slice(draft.next).findIndex((o) => o.isPlayer);
  const prospects = [...draft.prospects].sort((a, b) => a.boardRank - b.boardRank);
  const myPicks = draft.taken.filter((t) => t.isPlayer);

  return (
    <div>
      <div style={S.panel}>
        <div style={S.title}>
          Draft — {DIVISIONS[draft.divisionIndex].name} · Årgang: {draft.quality.toUpperCase()} · Pick {Math.min(draft.next + 1, draft.order.length)} af {draft.order.length}
        </div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          {phase === "draft-done" ? (
            <span style={S.good}>Draften er slut. Dine picks: {myPicks.map((t) => t.prospect.name).join(", ") || "ingen"}</span>
          ) : myTurn ? (
            <span style={S.good}>DIN TUR — vælg en spiller nedenfor</span>
          ) : (
            <span style={S.dim}>{picksUntilMe} picks til din tur…</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#93a1b8", maxHeight: 80, overflowY: "auto" }}>
          {draft.taken.slice(-8).map((t) => (
            <div key={t.pick}>
              #{t.pick} {t.clubName} vælger <b style={t.isPlayer ? S.good : undefined}>{t.prospect.name}</b> ({t.prospect.pos}, OVR {playerOvr(t.prospect)})
            </div>
          ))}
        </div>
      </div>

      {phase === "draft-done" ? (
        <button style={S.btn} onClick={finishSeason}>Afslut sæson (auto-salg/opfyldning) ▶</button>
      ) : (
        <div style={S.panel}>
          <div style={S.title}>Boardet ({prospects.length} tilbage) — sorteret efter mediernes rang (blind for potentiale)</div>
          <table style={S.table}>
            <thead>
              <tr>
                {["Rang", "Navn", "Pos", "Alder", "OVR", "Pot", "Trait", ""].map((h) => (
                  <th key={h} style={{ ...S.cellL, color: "#93a1b8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prospects.map((p: DraftProspect) => (
                <tr key={p.id}>
                  <td style={S.cell}>#{p.boardRank}</td>
                  <td style={S.cellL}>{p.name}</td>
                  <td style={S.cellL}>{p.pos}</td>
                  <td style={S.cell}>{p.age}</td>
                  <td style={{ ...S.cell, fontWeight: 800 }}>{playerOvr(p)}</td>
                  <td style={{ ...S.cell, color: "#fbbf24" }}>{Math.round(p.potential)}</td>
                  <td style={S.cellL}>{p.trait ? TRAIT_LABEL[p.trait] : ""}</td>
                  <td style={S.cellL}>
                    {myTurn && (
                      <button style={S.btn2} onClick={() => pick(p.id)}>Vælg</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ ...S.dim, fontSize: 11, marginTop: 8 }}>
            (Pot-kolonnen er synlig i trin 2 — scouting-tågen er et trin 4-lag.)
          </div>
        </div>
      )}
    </div>
  );
}

function HarvestView() {
  const report = useGame((s) => s.report);
  const goToDraft = useGame((s) => s.goToDraft);
  if (!report) return null;
  return (
    <div>
      <div style={S.row}>
        <div style={S.panel}>
          <div style={S.title}>Sæson {report.season} — resultat: nr. {report.playerPosition} {report.promoted ? "🎉 OPRYKNING!" : ""}</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            Mål: <b style={S.gold}>+{fmt(report.income.goals)}</b> · Sejre: <b style={S.gold}>+{fmt(report.income.wins)}</b> ·
            Uafgjorte: <b style={S.gold}>+{fmt(report.income.draws)}</b> · Præmie: <b style={S.gold}>+{fmt(report.income.prize)}</b>
            <br />I alt: <b style={S.gold}>+{fmt(report.income.total)} guld</b>
          </div>
          {report.movements.length > 0 && (
            <div style={{ ...S.dim, fontSize: 12, marginTop: 8 }}>
              {report.movements.map((m, i) => (<div key={i}>{m}</div>))}
            </div>
          )}
        </div>
        <div style={S.panel}>
          <div style={S.title}>Kampe</div>
          <div style={{ fontSize: 12, color: "#93a1b8", columns: 2, columnGap: 24 }}>
            {report.playerResults.map((r) => (
              <div key={r.round}>
                R{r.round} {r.home ? "vs" : "@"} {r.opponent}:{" "}
                <b style={r.goalsFor > r.goalsAgainst ? S.good : r.goalsFor < r.goalsAgainst ? S.bad : { color: "#e8eef7" }}>
                  {r.goalsFor}-{r.goalsAgainst}
                </b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={S.panel}>
        <div style={S.title}>Høsten — udvikling (XP efter spilletid)</div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Navn", "Pos", "XP", "OVR", "Aldring", "Status"].map((h) => (
                <th key={h} style={{ ...S.cellL, color: "#93a1b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.harvest.map((h) => (
              <tr key={h.playerId}>
                <td style={S.cellL}>{h.name}</td>
                <td style={S.cellL}>{h.pos}</td>
                <td style={S.cell}>+{h.xp}</td>
                <td style={S.cell}>
                  {h.ovrBefore === h.ovrAfter ? (
                    <span style={S.dim}>{h.ovrAfter}</span>
                  ) : h.ovrAfter > h.ovrBefore ? (
                    <span style={S.good}>{h.ovrBefore} → {h.ovrAfter}</span>
                  ) : (
                    <span style={S.bad}>{h.ovrBefore} → {h.ovrAfter}</span>
                  )}
                </td>
                <td style={{ ...S.cell, ...(h.agingLoss > 0 ? S.bad : S.dim) }}>{h.agingLoss > 0 ? `−${h.agingLoss}` : ""}</td>
                <td style={S.cellL}>
                  {h.retired ? <span style={S.bad}>Pensioneret</span> : h.wastedXp > 0 ? <span style={S.bad}>LOFT NÅET — {h.wastedXp} XP spildt</span> : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button style={S.btn} onClick={goToDraft}>Gå til draft ▶</button>
    </div>
  );
}

export function SeasonConsole() {
  useGame((s) => s.version);
  const world = useGame((s) => s.world);
  const phase = useGame((s) => s.phase);
  const finalize = useGame((s) => s.finalize);
  const playSeason = useGame((s) => s.playSeason);
  const newWorld = useGame((s) => s.newWorld);

  const me = playerClub(world);
  const divIdx = playerDivisionIndex(world);
  const table = world.lastTables ? world.lastTables[divIdx] : null;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.h1}>{me.name}</span>
        <span style={S.meta}>{DIVISIONS[divIdx].name} · Sæson {world.season} · Trup: {me.squad.length}</span>
        <span style={S.gold}>{fmt(me.gold)} guld</span>
        <span style={S.meta}>Loft: {[50, 58, 66, 74, 82, 90, 99][me.facilityTier - 1]} (tier {me.facilityTier})</span>
        <span style={S.meta}>Næste årgang: {world.nextClassQuality[divIdx].toUpperCase()}</span>
        <button style={{ ...S.btn2, marginLeft: "auto" }} onClick={() => newWorld(Math.floor(Math.random() * 1e9))}>
          Ny verden
        </button>
      </div>

      {phase === "ready" && (
        <div>
          {finalize && (finalize.sold.length > 0 || finalize.freeAgentsAdded > 0) && (
            <div style={S.panel}>
              <div style={S.title}>Efter draften</div>
              <div style={{ fontSize: 12, color: "#93a1b8" }}>
                {finalize.sold.map((s) => (<div key={s.name}>Solgt: {s.name} (+{fmt(s.price)} guld)</div>))}
                {finalize.freeAgentsAdded > 0 && <div>Frie agenter hentet: {finalize.freeAgentsAdded}</div>}
              </div>
            </div>
          )}
          <div style={S.row}>
            <div style={S.panel}>
              <div style={S.title}>Truppen</div>
              <SquadTable squad={me.squad} />
            </div>
            <div>
              {table && (
                <div style={S.panel}>
                  <div style={S.title}>Sidste sæsons tabel</div>
                  <LeagueTable rows={table} playerClubId={world.playerClubId} />
                </div>
              )}
              <button style={S.btn} onClick={playSeason}>Spil sæson {world.season} ▶</button>
            </div>
          </div>
        </div>
      )}

      {phase === "harvest" && <HarvestView />}
      {(phase === "draft" || phase === "draft-done") && <DraftBoard />}
    </div>
  );
}
