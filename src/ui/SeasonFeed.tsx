import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ECON } from "../engine/economy";
import { standingsAfter } from "../engine/season";
import type { FeedMatch, MatchEvent } from "../engine/types";
import { AnimatedNumber } from "./components/AnimatedNumber";
import { useGame } from "./store";

const ROUND_MS = 850;

function eventLine(e: MatchEvent, playerIsHome: boolean): string {
  const own = (e.team === 0) === playerIsHome;
  switch (e.type) {
    case "kickoff":
      return "0'  Kampstart";
    case "chance-missed":
      return `${e.minute}'  Chance — ${e.scorerName ?? "?"} … forbi${own ? "" : " (dem)"}`;
    case "goal":
      return `${e.minute}'  MÅÅÅL! ${e.scorerName ?? "?"} (${e.score![0]}-${e.score![1]})${own ? "" : " (dem)"}`;
    case "final":
      return `90'  Slutfløjt — ${e.score![0]}-${e.score![1]}`;
  }
}

function MatchCard({ match, playerClubId, expanded, onToggle }: {
  match: FeedMatch;
  playerClubId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isHome = match.homeId === playerClubId;
  const gf = isHome ? match.score[0] : match.score[1];
  const ga = isHome ? match.score[1] : match.score[0];
  const outcome = gf > ga ? "w" : gf === ga ? "d" : "l";
  const badge = { w: "S", d: "U", l: "N" }[outcome];
  const opponent = isHome ? match.awayName : match.homeName;

  const ownScorers = (match.events ?? [])
    .filter((e) => e.type === "goal" && (e.team === 0) === isHome)
    .map((e) => `${e.scorerName} ${e.minute}'`)
    .join(" · ");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={`feed-card ${outcome}`}
      onClick={onToggle}
    >
      <div className="feed-card-top">
        <span className="feed-gw">R{match.round}</span>
        <span className={`feed-badge ${outcome}`}>{badge}</span>
        <span className="feed-opp">
          {opponent} <span className="feed-ha">({isHome ? "H" : "U"})</span>
        </span>
        <span className={`feed-score ${outcome}`}>{gf}-{ga}</span>
      </div>
      {ownScorers && <div className="feed-scorers">⚽ {ownScorers}</div>}
      {expanded && match.events && (
        <div className="feed-events">
          {match.events.map((e, i) => (
            <div key={i}>{eventLine(e, isHome)}</div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function SeasonFeed() {
  const report = useGame((s) => s.report);
  const world = useGame((s) => s.world);
  const toHarvest = useGame((s) => s.toHarvest);

  const [revealed, setRevealed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const prevPosition = useRef<number | null>(null);

  const totalRounds = report?.rounds.length ?? 0;

  useEffect(() => {
    if (!report || paused || revealed >= totalRounds) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), ROUND_MS / speed);
    return () => clearTimeout(t);
  }, [report, revealed, paused, speed, totalRounds]);

  const derived = useMemo(() => {
    if (!report) return null;
    const mult = ECON.DIV_MULT[report.playerDivisionIndex];
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, gold = 0;
    const playerMatches: FeedMatch[] = [];
    for (const round of report.rounds.slice(0, revealed)) {
      const m = round.find((x) => x.isPlayerMatch)!;
      playerMatches.push(m);
      const isHome = m.homeId === world.playerClubId;
      const f = isHome ? m.score[0] : m.score[1];
      const a = isHome ? m.score[1] : m.score[0];
      gf += f;
      ga += a;
      if (f > a) { w++; gold += ECON.WIN * mult; }
      else if (f === a) { d++; gold += ECON.DRAW * mult; }
      else l++;
      gold += f * ECON.GOAL * mult;
    }
    const standings = standingsAfter(report.rounds, revealed);
    const position = standings.findIndex((s) => s.clubId === world.playerClubId) + 1;
    return { w, d, l, gf, ga, gold: Math.round(gold), playerMatches: playerMatches.reverse(), position };
  }, [report, revealed, world.playerClubId]);

  if (!report || !derived) return null;

  const done = revealed >= totalRounds;
  const positionArrow =
    prevPosition.current !== null && derived.position > 0
      ? derived.position < prevPosition.current ? "↑" : derived.position > prevPosition.current ? "↓" : ""
      : "";
  if (derived.position > 0) prevPosition.current = derived.position;

  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ width: 480 }}>
        <div className="md-panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="md-title" style={{ margin: 0 }}>
              Runde {Math.min(revealed, totalRounds)} / {totalRounds}
            </span>
            {!done ? (
              <>
                <button className="md-btn2" onClick={() => setPaused((p) => !p)}>{paused ? "▶" : "⏸"}</button>
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    className="md-btn2"
                    style={speed === s ? { background: "var(--accent)", color: "#0b1220" } : undefined}
                    onClick={() => setSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
                <button className="md-btn2" style={{ marginLeft: "auto" }} onClick={() => setRevealed(totalRounds)}>
                  Spol til slut ⏭
                </button>
              </>
            ) : (
              <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 13 }}>SÆSONEN ER SLUT</span>
            )}
          </div>
        </div>

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="md-panel"
            style={{ marginBottom: 14, borderColor: report.promoted ? "var(--accent)" : undefined }}
          >
            <div className="md-title">Slutresultat</div>
            <div style={{ fontSize: 15, lineHeight: 1.7 }}>
              {report.promoted && <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>🎉 OPRYKNING!</div>}
              Nr. <b>{report.playerPosition}</b> · Sæsonindtægt{" "}
              <b style={{ color: "var(--gold)" }}>+{report.income.total.toLocaleString("da-DK")} guld</b>{" "}
              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>(inkl. præmie +{report.income.prize.toLocaleString("da-DK")})</span>
            </div>
            <button className="md-btn" style={{ marginTop: 12 }} onClick={toHarvest}>
              Til høsten ▶
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {derived.playerMatches.map((m) => (
            <MatchCard
              key={m.round}
              match={m}
              playerClubId={world.playerClubId}
              expanded={expanded === m.round}
              onToggle={() => setExpanded(expanded === m.round ? null : m.round)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="md-panel">
          <div className="md-title">Status</div>
          <div className="feed-tally">
            <div><b className="pos">{derived.w}</b><span>SEJRE</span></div>
            <div><b>{derived.d}</b><span>UAFGJ</span></div>
            <div><b className="neg">{derived.l}</b><span>NEDERLAG</span></div>
            <div><b style={{ color: "var(--gold)" }}>{derived.w * 3 + derived.d}</b><span>POINT</span></div>
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 10, textAlign: "center" }}>
            GF {derived.gf} · GA {derived.ga} · GD {derived.gf - derived.ga >= 0 ? "+" : ""}{derived.gf - derived.ga}
          </div>
        </div>

        <div className="md-panel">
          <div className="md-title">Placering</div>
          <div style={{ fontSize: 34, fontWeight: 800, textAlign: "center" }}>
            {derived.position > 0 ? `${derived.position}.` : "—"}{" "}
            <span style={{ fontSize: 18, color: positionArrow === "↑" ? "var(--accent)" : positionArrow === "↓" ? "var(--danger)" : "var(--text-dim)" }}>
              {positionArrow}
            </span>
          </div>
        </div>

        <div className="md-panel">
          <div className="md-title">Sæsonens indtægt</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--gold)", textAlign: "center" }}>
            +<AnimatedNumber value={derived.gold} /> guld
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 6, textAlign: "center" }}>
            mål og sejre drypper live — præmien kommer til sidst
          </div>
        </div>
      </div>
    </div>
  );
}
