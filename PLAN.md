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

## Udskudt (bevidst)

- Mobil-layout (touch virker via dnd-kit, men layoutet designes til
  desktop først)
- Steam-wrapper (Tauri/Electron) — efter web-versionen har bevist loopet
- Canvas-juice-laget — efter trin 5
- Ligapyramide, prestige/Arven, feeder-klubber — post-prototype,
  jf. DESIGN.md
