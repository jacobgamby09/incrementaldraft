import { DndContext, useDroppable, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  evaluate,
  overallFromLines,
  previewPlacement,
  resolveAssignment,
  SLOT_BY_ID,
  SLOTS_442,
  type Synergy,
} from "../engine/formation";
import { pickXI, teamLines } from "../engine/lineup";
import type { Player, TeamLines } from "../engine/types";
import { playerClub, playerDivisionIndex } from "../engine/world";
import { AnimatedNumber } from "./components/AnimatedNumber";
import { PlayerChip } from "./components/PlayerChip";
import { useGame } from "./store";

interface Hover {
  slotId: string;
  player: Player;
}

function SlotView({ slotId, player, fit, isOver }: { slotId: string; player?: Player; fit?: number; isOver: boolean }) {
  const slot = SLOT_BY_ID.get(slotId)!;
  const { setNodeRef } = useDroppable({ id: slotId });
  return (
    <div ref={setNodeRef} className={`slot ${isOver ? "slot-over" : ""}`} style={{ left: slot.x, top: slot.y }}>
      {player ? <PlayerChip player={player} fit={fit} /> : <div className="slot-empty">{slot.label}</div>}
    </div>
  );
}

function BenchZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div ref={setNodeRef} style={{ display: "flex", gap: 14, flexWrap: "wrap", minHeight: 90, paddingTop: 10 }}>
      {children}
    </div>
  );
}

function SynergyLines({ synergies }: { synergies: Synergy[] }) {
  const paths: { d: string; good: boolean; key: string }[] = [];
  for (const syn of synergies) {
    if (syn.slotIds.length < 2) continue;
    const from = SLOT_BY_ID.get(syn.slotIds[0])!;
    for (const toId of syn.slotIds.slice(1)) {
      const to = SLOT_BY_ID.get(toId)!;
      const midX = (from.x + to.x) / 2 + (from.x === to.x ? 12 : 0);
      const midY = (from.y + to.y) / 2;
      paths.push({
        d: `M ${from.x} ${from.y} Q ${midX} ${midY}, ${to.x} ${to.y}`,
        good: syn.positive,
        key: `${syn.id}-${toId}`,
      });
    }
  }
  return (
    <svg className="links" viewBox="0 0 640 760">
      {paths.map((p) => (
        <path key={p.key} className={p.good ? "link-good" : "link-bad"} d={p.d} />
      ))}
    </svg>
  );
}

function StatRow({ label, value, ghost, max, note }: { label: string; value: number; ghost?: number; max: number; note: string }) {
  const delta = ghost !== undefined ? Math.round(ghost) - Math.round(value) : 0;
  return (
    <div className="stat-row">
      <div className="stat-line">
        <span className="stat-label">{label}</span>
        <span className="stat-num"><AnimatedNumber value={Math.round(value)} /></span>
        {delta !== 0 && (
          <span className={`stat-delta ${delta > 0 ? "pos" : "neg"}`}>
            → {Math.round(ghost!)} {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
      <div className="stat-bar">
        {ghost !== undefined && <i className="ghost" style={{ width: `${Math.min(100, (ghost / max) * 100)}%` }} />}
        <i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

export function FormationScreen({ hideSeasonButton = false }: { hideSeasonButton?: boolean } = {}) {
  useGame((s) => s.version);
  const world = useGame((s) => s.world);
  const placePlayer = useGame((s) => s.placePlayer);
  const autoFillLineup = useGame((s) => s.autoFillLineup);
  const playSeason = useGame((s) => s.playSeason);

  const [hover, setHover] = useState<Hover | null>(null);
  const [dragged, setDragged] = useState<Player | null>(null);

  const me = playerClub(world);
  const assignment = resolveAssignment(me);
  const evaluation = evaluate(assignment);

  const assignedIds = new Set([...assignment.values()].map((p) => p.id));
  const bench = me.squad.filter((p) => !assignedIds.has(p.id));

  // Liga-snit: gennemsnitlige linjer for de øvrige klubber i divisionen
  const leagueAvg = useMemo<TeamLines>(() => {
    const divIdx = playerDivisionIndex(world);
    const others = world.divisions[divIdx].filter((c) => !c.isPlayer);
    const sum = others.reduce(
      (acc, c) => {
        const lines = teamLines(pickXI(c.squad));
        return { attack: acc.attack + lines.attack, midfield: acc.midfield + lines.midfield, defense: acc.defense + lines.defense };
      },
      { attack: 0, midfield: 0, defense: 0 },
    );
    return { attack: sum.attack / others.length, midfield: sum.midfield / others.length, defense: sum.defense / others.length };
  }, [world, world.season]);

  const preview = hover ? previewPlacement(assignment, hover.slotId, hover.player) : null;

  const findPlayer = (id: string | number): Player | undefined => me.squad.find((p) => p.id === id);

  const onDragStart = (e: DragStartEvent) => {
    setDragged(findPlayer(e.active.id) ?? null);
  };
  const onDragOver = (e: DragOverEvent) => {
    const player = findPlayer(e.active.id);
    const overId = e.over?.id;
    if (player && typeof overId === "string" && SLOT_BY_ID.has(overId)) {
      setHover({ slotId: overId, player });
    } else {
      setHover(null);
    }
  };
  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id;
    if (typeof overId === "string" && SLOT_BY_ID.has(overId)) {
      placePlayer(overId, String(e.active.id));
    }
    setHover(null);
    setDragged(null);
  };

  const max = Math.max(evaluation.lines.attack, evaluation.lines.midfield, evaluation.lines.defense, leagueAvg.attack, leagueAvg.midfield, leagueAvg.defense) * 1.25;
  const shownSynergies = preview ? preview.evalAfter.synergies : evaluation.synergies;

  return (
    <DndContext onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setHover(null); setDragged(null); }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="pitch">
          <div className="pitch-line pitch-halfline" />
          <div className="pitch-line pitch-circle" />
          <div className="pitch-line pitch-box top" />
          <div className="pitch-line pitch-box bot" />
          <SynergyLines synergies={shownSynergies.filter((s) => s.slotIds.length >= 2)} />
          {SLOTS_442.map((slot) => (
            <SlotView
              key={slot.id}
              slotId={slot.id}
              player={assignment.get(slot.id)}
              fit={evaluation.fit[slot.id]}
              isOver={hover?.slotId === slot.id}
            />
          ))}
        </div>

        <div style={{ width: 330, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="md-panel">
            <div className="md-title">Holdstyrke</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>
                <AnimatedNumber value={overallFromLines(preview ? preview.lines : evaluation.lines)} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.6, color: "var(--text-dim)" }}>
                OVERALL · liga-snit {overallFromLines(leagueAvg)}
              </span>
            </div>
            <StatRow label="ANGREB" value={evaluation.lines.attack} ghost={preview?.lines.attack} max={max} note={`Liga-snit: ${Math.round(leagueAvg.attack)}`} />
            <StatRow label="MIDTBANE" value={evaluation.lines.midfield} ghost={preview?.lines.midfield} max={max} note={`Liga-snit: ${Math.round(leagueAvg.midfield)}`} />
            <StatRow label="FORSVAR" value={evaluation.lines.defense} ghost={preview?.lines.defense} max={max} note={`Liga-snit: ${Math.round(leagueAvg.defense)}`} />
          </div>

          {preview && dragged && (
            <div className="md-panel preview-box">
              <div className="md-title">Preview · {dragged.name} → {SLOT_BY_ID.get(hover!.slotId)!.label}</div>
              <div className="pv">
                Fit: <b>{"★".repeat(preview.fit)}{"☆".repeat(6 - preview.fit)}</b>
                <br />
                Angreb <b>{Math.round(evaluation.lines.attack)} → {Math.round(preview.lines.attack)}</b> · Midtbane{" "}
                <b>{Math.round(evaluation.lines.midfield)} → {Math.round(preview.lines.midfield)}</b> · Forsvar{" "}
                <b>{Math.round(evaluation.lines.defense)} → {Math.round(preview.lines.defense)}</b>
              </div>
            </div>
          )}

          <div className="md-panel">
            <div className="md-title">{preview ? "Synergier (preview)" : "Aktive synergier"}</div>
            <div className="syn-row">
              {shownSynergies.length === 0 && <span style={{ color: "var(--text-dim)" }}>Ingen endnu — prøv at kombinere traits og flanker</span>}
              {shownSynergies.map((s) => (
                <div key={s.id}>
                  <span className={`syn-dot ${s.positive ? "good" : "bad"}`} />
                  {s.label}
                  {s.delta.attack + s.delta.midfield + s.delta.defense > 0 && (
                    <span style={{ color: "var(--text-dim)" }}>
                      {" "}(
                      {s.delta.attack > 0 && `+${Math.round(s.delta.attack)} A `}
                      {s.delta.midfield > 0 && `+${Math.round(s.delta.midfield)} M `}
                      {s.delta.defense > 0 && `+${Math.round(s.delta.defense)} F`}
                      )
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!hideSeasonButton && (
              <button className="md-btn" onClick={playSeason}>Spil sæson {world.season} ▶</button>
            )}
            <button className="md-btn2" onClick={autoFillLineup}>Auto-opstilling</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 990, marginTop: 20 }}>
        <div className="md-title">Bænken — træk en spiller ind på banen</div>
        <BenchZone>
          {bench.map((p) => (
            <PlayerChip key={p.id} player={p} />
          ))}
          {bench.length === 0 && <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Bænken er tom</span>}
        </BenchZone>
      </div>
    </DndContext>
  );
}
