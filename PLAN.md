# Dynastiet — Teknisk plan

*Tech-stack og byggeplan. Designet står i [DESIGN.md](DESIGN.md).*

## Valgkriterium

Stakken skal først og fremmest levere en tilfredsstillende
formations-oplevelse: kort der trækkes, tal der fjedrer, synergi-linjer,
kaskade-effekter. Det er en rig, reaktiv UI — ikke en spil-scene. Derfor
web-stakken (DOM/CSS/SVG er bedst til kort-layouts og tekst-tunge boards;
spilmotorers UI-systemer er det ikke). Distribution: browser først
(itch.io / egen side), senere Steam via Tauri/Electron-wrapper.

## Stack

| Lag | Valg | Hvorfor |
|---|---|---|
| Sprog | TypeScript overalt | Én kodebase for logik og UI |
| UI | React 19 + Vite | Kendt fra DicePG; størst økosystem |
| State | Zustand | Én serialiserbar store = gratis save/load |
| Animation | Motion (Framer Motion) | Springs, layout-animation, kort-flips, stagger |
| Drag & drop | dnd-kit | Slot-baseret drop, touch-support |
| Synergi-linjer | SVG-overlay | Animerede paths mellem slots, grøn/rød efter delta |
| Lyd | Howler.js | Guld-pling, mål-brøl |
| Persistens | IndexedDB (idb-keyval) | Versioneret save-skema fra dag ét |
| Test | Vitest | Paritetstests af sim-kernen (se nedenfor) |
| Juice (senere) | Lille canvas-lag | Konfetti/partikler oven på DOM — pynt, ikke hus |

Bevidst fravalgt: Unity/Godot (UI-tunge kortspil er DOM's hjemmebane),
Phaser/PixiJS som fundament (scene-graph vi ikke behøver; canvas kommer
ind som pynt-lag).

## Arkitekturens vigtigste beslutning: snittet

**Simulationskernen er ren TypeScript uden én React-import.**
Deterministisk, seedet RNG. Motoren afvikler en kamp på et millisekund og
returnerer en **event-liste** ("23': chance, Holm, misset" / "41': mål").
UI'et afspiller listen som drama i valgfri hastighed.

Det giver direkte fra designdokumentet:

1. "Simulér øjeblikkeligt, afspil som drama" bliver arkitektur —
   kampfart-opgraderinger (10s → 3s) er ren afspilningshastighed
2. **Kalibrering som regressionstest**: kampmodellen porteres 1:1 fra
   `simulation/match_sim.py`, og Vitest håndhæver tallene (jævnbyrdig
   ≈ 37/26/37, +20% favorit ≈ 54% sejr, stat-paritet inden for ~1 pp).
   Ændrer nogen modellen, fejler CI
3. Deterministisk seed = reproducerbare sæsoner ved fejljagt og balancering

Formations-skærmens krav løses i samme snit: `previewPlacement(trup,
slot, spiller)` er en ren motor-funktion (mikrosekunder ved 14 spillere),
så hover-preview kan køre på hver pointer-bevægelse.

## Visuel retning (arbejdsbeslutning)

**A · Matchday** — mørk stadion-nat, TV-grafik-æstetik, glaspaneler,
neongrøn accent, guld til valuta. Valgt fordi glødende synergi-linjer,
guld-plings og juice-laget har bedst vilkår på mørk baggrund, og de store
tal står skarpest. Tokens og referencer: `mockups/formation-mockup.html`
(tema A). Pixel art fravalgt pga. læsbarhed på tæt data
(`mockups/formation-mockup-pixel.html` beholdes som reference).

**Playercards** (`mockups/player-cards-mockup.html`):

- **Kortet er ceremoni, ikke information** — fuldt kort i draften og som
  detalje-visning (klik på spiller hvor som helst); kompakt kort på bane
  og bænk, hvor læsbarheden vinder
- **Ingen fotos** — trøje/kit-grafik med nummer som kortets centrum
  (kit-farver + mønstre: striber, skrå bånd, halve — individualitet uden
  ansigts-asset-pipeline), stråle-burst og klubfarve-glød bagved
- **Rammen = potentiale-tier**: fyld=bronze, solid=sølv, profil=guld,
  juvel=animeret holo med glans-sweep. Sjældenhedsglæden er dermed koblet
  direkte til scouting-systemet
- **Uscoutede kort står i tåge** (interval-stats, grå stiplet ramme, "?")
  og transformerer visuelt, når en scout-rapport bruges — scouting som
  reveal-øjeblik
- Tier-farven går igen som tynd kant på det kompakte kort, så juvelen
  også kan ses på banen

## Projektstruktur

```
/engine     ← ren TS: kampmodel, XP/loft, økonomi, draft-generering, seedet RNG
/ui         ← React: skærme, komponenter, animationer
/content    ← data: navne, traits, formations-vægte, priser
/tests      ← Vitest: paritetstests mod Python-harnessernes tal
simulation/ ← Python-harnesses (kalibreringens kilde, beholdes)
```

## Byggerækkefølge (efter risiko)

1. **Fundament**: scaffold (Vite + React + TS) · port af kampmodellen til
   `/engine` · paritetstest mod Python-tallene grønne
2. **Spilbart loop hurtigst muligt**: sæsonafvikling + liga-tabel med
   simpel tekst-UI · XP/høst i rå form · minimal draft (liste, ingen
   scouting) — hele loopet kan gennemspilles grimt
3. **Formations-skærmen i fuld kvalitet**: drag & drop, hover-preview,
   spring-countere på holdtal, synergi-linjer i SVG, rolle-fit-stjerner.
   *Prototypens egentlige testspørgsmål bor her — den får kærligheden
   tidligt, ikke til sidst*
4. **Draften**: board, rækkefølge-bånd, scouting-tåge, AI-picks med
   animation, behovspanel
5. **Resten af loopet**: transfervindue, høst-ceremonien (stagger-
   animation), talent-træ, spillersalg
6. **Polish**: lyd, juice-lag, save-versioning, balancepas mod
   playtest-spørgsmålene i DESIGN.md

Milepæl efter trin 3: **kan man mærke om opstillings-fiflen er sjov?**
Hvis nej, justeres synergier/traits FØR der bygges videre (jf.
DESIGN.md's testspørgsmål 1).

## Trin 1 — detaljeret plan (næste skridt)

**Mål**: et kørende projekt med en kalibreret, testet kampmotor i ren TS.
Ingen spilskærme endnu — fundamentet skal stå på beviseligt rigtige tal.

### 1a. Scaffold

- Vite + React 19 + TypeScript (strict mode)
- Dependencies nu: `zustand`, `motion`, `@dnd-kit/core`, dev: `vitest`
  (howler og idb-keyval installeres først når de bruges)
- Mappestruktur: `src/engine` · `src/ui` · `src/content` · `tests`
- Regel håndhævet fra dag ét: **ingen React-imports i `src/engine`**

### 1b. Engine-kernen (ren TS)

| Modul | Indhold |
|---|---|
| `engine/rng.ts` | Seedet PRNG (mulberry32) med fork af del-streams — determinisme er kontrakten |
| `engine/types.ts` | `Player`, `Club`, `TeamLines`, `MatchResult`, `MatchEvent` |
| `engine/match.ts` | Kampmodellen 1:1 fra `simulation/match_sim.py`: K=0,5 · p_konv=2,0 · p_mid=1,0 · chancepulje 8-12 · clamp 30-70% |
| Event-listen | `{minut, type: kickoff/chance/goal/final, hold, spillerId}` — chancer fordeles sorteret over minut 1-90; målscorer vægtes efter ANG-bidrag (+Målscorer-trait). Dette er UI'ets afspilnings-kontrakt |

`match.ts` tager holdlinjer (ANG/MID/FOR) som input — opstillings-beregning
(slot-vægte, synergier, previewPlacement) hører til trin 2/3.

### 1c. Paritetstests (Vitest — kalibreringen som CI-vagt)

Kør 20-50k seedede kampe per scenario og assert mod Python-tallene
(tolerancer sat så tests ikke flakker):

| Test | Forventning |
|---|---|
| Jævnbyrdig | sejr 37% ±2 · uafgjort 26% ±2 · mål/kamp 2,50 ±0,15 |
| +20% favorit | sejr 54% ±2 |
| +50% favorit | sejr 73% ±2 · margin ≥4 ca. 10% |
| Stat-paritet | +20 point i hhv. ANG/MID/FOR: hver delta i [1,5; 3,5] pp og indbyrdes spredning < 1,5 pp |
| Determinisme | samme seed ⇒ identisk event-liste, byte for byte |
| Hastighed | 10.000 kampe < 1 s (løs perf-vagt) |

### 1d. Engine-konsol (lille dev-side)

`npm run dev` viser en rå debug-side: "kør 10.000 kampe"-knap, der
printer fordelingstabellen i browseren + afspiller én kamps event-liste
som tekst. Beviser wiring engine→UI og gør motoren håndgribelig, uden at
være en spilskærm.

### Acceptkriterier for trin 1

1. `npm test` grøn, inkl. hele paritetssuiten
2. `npm run dev` kører engine-konsollen
3. Nul React-imports i `src/engine` (håndhævet med ESLint-regel eller
   simpel grep i CI)

Derefter trin 2: sæsonmotor (liga-tabel, XP/loft, aldring, draft-generering)
oven på samme testdisciplin — career_sim.py's targets bliver trin 2's
paritetstests.

## Udskudt (bevidst)

- Mobil-layout (touch virker via dnd-kit, men layoutet designes til
  desktop først)
- Steam-wrapper (Tauri/Electron) — efter web-versionen har bevist loopet
- Canvas-juice-laget — efter trin 5
- Ligapyramide, prestige/Arven, feeder-klubber — post-prototype,
  jf. DESIGN.md
