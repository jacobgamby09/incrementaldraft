import { create } from "zustand";
import { advanceAiPicks, playerPick } from "../engine/draft";
import { autoAssign } from "../engine/formation";
import {
  beginSeason,
  buyOffer,
  concludeSeason,
  finalizeSeason,
  rerollOffers,
  sellPlayer,
  startDrafts,
} from "../engine/season";
import type { DraftState, FinalizeReport, SeasonReport, World } from "../engine/types";
import { createWorld, playerClub, playerDivisionIndex } from "../engine/world";

export type Phase = "ready" | "feed" | "window" | "harvest" | "draft" | "draft-done";

interface GameState {
  version: number;
  world: World;
  phase: Phase;
  /** Hvilken halvleg feedet viser */
  half: 1 | 2;
  report: SeasonReport | null;
  draft: DraftState | null;
  finalize: FinalizeReport | null;
  notice: string | null;

  newWorld(seed: number): void;
  playSeason(): void;
  openWindow(): void;
  playSecondHalf(): void;
  toHarvest(): void;
  goToDraft(): void;
  pick(prospectId: string): void;
  finishSeason(): void;
  placePlayer(slotId: string, playerId: string): void;
  autoFillLineup(): void;
  buy(offerIndex: number): void;
  reroll(): void;
  sell(playerId: string): void;
}

export const useGame = create<GameState>((set, get) => ({
  version: 0,
  world: createWorld(1),
  phase: "ready",
  half: 1,
  report: null,
  draft: null,
  finalize: null,
  notice: null,

  newWorld: (seed) =>
    set({
      world: createWorld(seed),
      phase: "ready",
      half: 1,
      report: null,
      draft: null,
      finalize: null,
      notice: null,
      version: get().version + 1,
    }),

  playSeason: () => {
    const { world, version } = get();
    beginSeason(world);
    set({ report: null, phase: "feed", half: 1, version: version + 1 });
  },

  openWindow: () => set({ phase: "window", version: get().version + 1 }),

  playSecondHalf: () => {
    const { world, version } = get();
    const report = concludeSeason(world);
    set({ report, phase: "feed", half: 2, version: version + 1 });
  },

  toHarvest: () => set({ phase: "harvest", version: get().version + 1 }),

  goToDraft: () => {
    const { world, version } = get();
    const draft = startDrafts(world);
    const done = draft.next >= draft.order.length;
    set({ draft, phase: done ? "draft-done" : "draft", version: version + 1 });
  },

  pick: (prospectId) => {
    const { world, draft, version } = get();
    if (!draft) return;
    playerPick(draft, playerClub(world), prospectId);
    const clubs = world.divisions[playerDivisionIndex(world)];
    advanceAiPicks(draft, clubs, world.rng);
    const done = draft.next >= draft.order.length || draft.prospects.length === 0;
    set({ phase: done ? "draft-done" : "draft", version: version + 1 });
  },

  finishSeason: () => {
    const { world, version } = get();
    const finalize = finalizeSeason(world);
    set({ finalize, phase: "ready", half: 1, draft: null, version: version + 1 });
  },

  placePlayer: (slotId, playerId) => {
    const { world, version } = get();
    const me = playerClub(world);
    const lineup = { ...(me.lineup ?? {}) };
    const fromSlot = Object.entries(lineup).find(([, pid]) => pid === playerId)?.[0];
    const occupant = lineup[slotId];
    lineup[slotId] = playerId;
    if (fromSlot && fromSlot !== slotId) {
      if (occupant) lineup[fromSlot] = occupant;
      else delete lineup[fromSlot];
    }
    me.lineup = lineup;
    set({ version: version + 1 });
  },

  autoFillLineup: () => {
    const { world, version } = get();
    const me = playerClub(world);
    me.lineup = autoAssign(me.squad);
    set({ version: version + 1 });
  },

  buy: (offerIndex) => {
    const { world, version } = get();
    const result = buyOffer(world, offerIndex);
    set({ notice: result.ok ? null : result.reason, version: version + 1 });
  },

  reroll: () => {
    const { world, version } = get();
    const result = rerollOffers(world);
    set({ notice: result.ok ? null : result.reason, version: version + 1 });
  },

  sell: (playerId) => {
    const { world, version } = get();
    const result = sellPlayer(world, playerId);
    set({ notice: result.ok ? null : result.reason, version: version + 1 });
  },
}));
