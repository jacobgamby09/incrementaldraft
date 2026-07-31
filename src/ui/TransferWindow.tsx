import { AnimatePresence, motion } from "motion/react";
import { SQUAD_CAP } from "../engine/divisions";
import { salePrice } from "../engine/economy";
import { playerOvr } from "../engine/lineup";
import { rerollCost } from "../engine/season";
import type { Player } from "../engine/types";
import { playerClub, playerDivisionIndex } from "../engine/world";
import { FormationScreen } from "./FormationScreen";
import { TRAIT_ICON, TRAIT_LABEL, tierClass } from "./components/PlayerChip";
import { useGame } from "./store";

const POS_COLOR: Record<string, string> = {
  GK: "var(--chip-gk)",
  DF: "var(--chip-df)",
  MF: "var(--chip-mf)",
  FW: "var(--chip-fw)",
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

function OfferCard({ player, price, affordable, onBuy }: {
  player: Player;
  price: number;
  affordable: boolean;
  onBuy: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={`offer-card ${tierClass(player.potential)}`}
    >
      <div className="offer-top">
        <span className="offer-ovr">{playerOvr(player)}</span>
        <span className="chip-pos" style={{ background: POS_COLOR[player.pos] }}>{player.pos}</span>
        <span className="offer-age">{player.age} år</span>
      </div>
      <div className="offer-name">{player.name}</div>
      <div className="chip-stats" style={{ fontSize: 11 }}>
        <span>A <b>{Math.round(player.attack)}</b></span>
        <span>M <b>{Math.round(player.midfield)}</b></span>
        <span>F <b>{Math.round(player.defense)}</b></span>
      </div>
      <div className="offer-trait">
        {player.trait ? `${TRAIT_ICON[player.trait]} ${TRAIT_LABEL[player.trait]}` : "—"}
      </div>
      <button className="md-btn offer-buy" disabled={!affordable} onClick={onBuy}>
        Køb · {fmt(price)}
      </button>
    </motion.div>
  );
}

export function TransferWindow() {
  useGame((s) => s.version);
  const world = useGame((s) => s.world);
  const notice = useGame((s) => s.notice);
  const buy = useGame((s) => s.buy);
  const reroll = useGame((s) => s.reroll);
  const sell = useGame((s) => s.sell);
  const playSecondHalf = useGame((s) => s.playSecondHalf);

  const me = playerClub(world);
  const divIdx = playerDivisionIndex(world);
  const offers = world.activeSeason?.offers ?? [];
  const cost = rerollCost(divIdx);

  const squad = [...me.squad].sort((a, b) => playerOvr(b) - playerOvr(a));

  return (
    <div>
      <div className="md-panel" style={{ marginBottom: 16, borderLeft: "3px solid var(--gold)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="md-title" style={{ margin: 0 }}>Transfervinduet · halvtid</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
              Færdige spillere i peak-alderen — magt nu, ingen udvikling tilbage.
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 17 }}>{fmt(me.gold)} guld</span>
            <button className="md-btn2" disabled={me.gold < cost} onClick={reroll}>
              Nye tilbud · {fmt(cost)}
            </button>
            <button className="md-btn" onClick={playSecondHalf}>Spil 2. halvleg ▶</button>
          </div>
        </div>
        {notice && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 10, fontWeight: 700 }}>{notice}</div>}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <div className="md-title">Tilbud ({offers.length})</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", minHeight: 210 }}>
            <AnimatePresence>
              {offers.map((offer, i) => (
                <OfferCard
                  key={offer.player.id}
                  player={offer.player}
                  price={offer.price}
                  affordable={me.gold >= offer.price && me.squad.length < SQUAD_CAP}
                  onBuy={() => buy(i)}
                />
              ))}
            </AnimatePresence>
            {offers.length === 0 && (
              <div style={{ color: "var(--text-dim)", fontSize: 13, alignSelf: "center" }}>
                Alle tilbud er brugt — reroll for nye.
              </div>
            )}
          </div>
        </div>

        <div className="md-panel" style={{ maxHeight: 320, overflowY: "auto" }}>
          <div className="md-title">Sælg fra truppen ({me.squad.length}/{SQUAD_CAP})</div>
          <table style={{ borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {squad.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "3px 8px 3px 0", fontWeight: 700 }}>{p.name}</td>
                  <td style={{ padding: "3px 8px", color: "var(--text-dim)" }}>{p.pos} · {p.age} år</td>
                  <td style={{ padding: "3px 8px", fontWeight: 800 }}>{playerOvr(p)}</td>
                  <td style={{ padding: "3px 8px", color: "var(--gold)" }}>{fmt(salePrice(p, divIdx))}</td>
                  <td style={{ padding: "3px 0" }}>
                    <button className="md-btn2" onClick={() => sell(p.id)}>Sælg</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md-title">Ret opstillingen inden anden halvleg</div>
      <FormationScreen hideSeasonButton />
    </div>
  );
}
