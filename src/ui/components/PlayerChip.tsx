import { useDraggable } from "@dnd-kit/core";
import { playerOvr } from "../../engine/lineup";
import type { Player } from "../../engine/types";

export const TRAIT_ICON: Record<string, string> = {
  playmaker: "✨",
  goalscorer: "⚽",
  captain: "Ⓒ",
  mentor: "🎓",
  twoway: "↔",
  glass: "💥",
};

export const TRAIT_LABEL: Record<string, string> = {
  playmaker: "Playmaker",
  goalscorer: "Målscorer",
  captain: "Anfører",
  mentor: "Mentor",
  twoway: "Tovejsmaskine",
  glass: "Glaskrop",
};

const POS_COLOR: Record<string, string> = {
  GK: "var(--chip-gk)",
  DF: "var(--chip-df)",
  MF: "var(--chip-mf)",
  FW: "var(--chip-fw)",
};

/** Potentiale-tier → kant-farve (juvelen kan spottes på banen, jf. PLAN.md). */
export function tierClass(potential: number): string {
  if (potential >= 85) return "tier-juvel";
  if (potential >= 70) return "tier-guld";
  if (potential >= 55) return "tier-solv";
  return "";
}

export function PlayerChip({ player, fit }: { player: Player; fit?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: player.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chip ${tierClass(player.potential)} ${isDragging ? "dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      {player.trait && (
        <div className="chip-trait" title={TRAIT_LABEL[player.trait]}>
          {TRAIT_ICON[player.trait]}
        </div>
      )}
      <div className="chip-top">
        <span className="chip-ovr">{playerOvr(player)}</span>
        <span className="chip-pos" style={{ background: POS_COLOR[player.pos] }}>
          {player.pos}
        </span>
      </div>
      <div className="chip-name">{player.name}</div>
      <div className="chip-stats">
        <span>A <b>{Math.round(player.attack)}</b></span>
        <span>M <b>{Math.round(player.midfield)}</b></span>
        <span>F <b>{Math.round(player.defense)}</b></span>
      </div>
      {fit !== undefined && <div className="chip-fit">{"★".repeat(fit)}{"☆".repeat(6 - fit)}</div>}
      <div className="chip-age">
        {player.age} år{player.potential >= 70 ? ` · Pot ${Math.round(player.potential)}` : ""}
      </div>
    </div>
  );
}
