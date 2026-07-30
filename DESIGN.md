# Dynastiet — Design Document

*Incremental fodbold-dynasti med draft som primært gameplay. Konsolideret juli 2026.*

## Pitch

Et **incremental fodbold-manager-spil bygget om draften**. Sæsoner simuleres på
2-5 minutter, hvert år kommer en ny årgang af talenter, og spillets dybde bor
ikke i kampsimulationen men i **opstillings-puslespillet**: træk spillere ind
på positionerne og se synergier kaskadere gennem holdet i realtid.

Verdenen er fiktiv: alle unge talenter registreres i et centralt talentregister,
og hver liga afholder en årlig draft. Det giver frihed fra licens-realisme,
draft-rækkefølge som catch-up-mekanik (dårligst placerede vælger først) og
picks som valuta senere i spillet.

## Læren fra FM-fælden

Football Manager lægger dybden i simulationen — det må dette spil aldrig gøre.
**Kampene er ikke en simulation; de er en resultat-fremviser**, der afvikler
dommen over spillerens puslespil. Al dybde bor på opstillings-skærmen. Ingen
taktik-skydere, presseinstruktioner eller kontraktforhandlinger. Hvis en
feature ikke gør draften eller opstillingen sjovere, ryger den.

## Designprincipper

1. **RNG foreslår, spilleren disponerer.** Tilfældighed ligger i årgange,
   butikstilbud og kampudfald — aldrig i noget spilleren mister uden varsel.
2. **Læsbarhed frem for realisme.** Tre holdtal (Angreb/Midtbane/Forsvar),
   synlige synergi-links, aflæselige nederlag ("vi tabte midtbanen 34-51").
3. **Sæsonen er konsekvens, ikke gameplay.** Ét planlagt beat afbryder den
   (transfervinduet) — aldrig reaktiv fiflen undervejs.
4. **Vægge kan aflæses.** Ligatabel, holdtal mod liga-gennemsnit og
   diagnose-venlige kampresultater gør næste draft til en hypotese.
5. **Information er progression.** Scouting konverterer RNG til viden — man
   opgraderer ikke sine kort, man opgraderer sin evne til at vælge rigtigt.
6. **Automatisering optjenes, gives aldrig.**

## Core loop (8-12 min per sæson)

> **Draft → Opstilling → 7 kampe (guld drypper) → Transfervindue +
> re-opstilling → 7 kampe → Høst (XP/levels) → Talent tree + spillersalg →
> Draft …**

Fem takter med hver sin følelse:

| Takt            | Følelse                  | Varighed  |
|-----------------|--------------------------|-----------|
| Draft           | Forventning og valg      | 1-2 min   |
| Opstilling      | Puslespil og mestring    | 2-4 min   |
| Sæson (×2 halvdele) | Spænding, ren tilskuer | 2-5 min  |
| Høst            | Belønningsregn           | ~1 min    |
| Investering     | Strategi (træ + salg)    | 1-2 min   |

## Opstillings-skærmen (spillets hjerte)

- Træk spillere ind på positioner i formationen; se effekterne øjeblikkeligt.
- **Synergier er lokale og synlige**: kant + back på samme flanke,
  midterforsvarspar, målscorer + playmaker, venstrebenet på venstre kant,
  veteran der booster unge naboer. Links lyser grønt/rødt når en spiller
  droppes; de tre holdtal ticker levende op og ned.
- Ingen skjulte kædeeffekter i flere led — kaskaden skal kunne aflæses,
  ellers bliver puslespillet til regneark.
- **Formationer er puslespils-brætter og dermed unlocks**: start med 4-4-2;
  4-3-3, 3-5-2 osv. købes i talent-træet. Ny formation = ny naboskabsgraf =
  nyt puslespil med samme brikker.
- Fornyelse sæson til sæson kommer af churn: aldring, nye draftees,
  skader, salg og transferkøb omrører truppen, så "den perfekte opstilling"
  er et bevægeligt mål. **Dette er prototypens centrale risiko og skal
  playtestes.**

## Spiller-entiteten

**Grundregel — 5-sekunders-kortet:** en spiller skal kunne vurderes på ~5
sekunder. Alt på kortet besvarer ét af tre spørgsmål: *Hvor god er han nu?
Hvor god bliver han? Hvad gør han for de andre?* Hver ekstra attribute
beskatter alle fremtidige beslutninger med læsetid — flere stats er sidste
udvej, ikke første.

### Kernestats: 3 tal, der spejler holdtallene

Spilleren har **præcis samme tre stats som holdet** — ANG / MID / FOR
(hver 0-99). Holdets Angreb er bogstaveligt summen af spillernes vægtede
ANG-bidrag; ingen oversættelse, ingen magi.

- **Slot-vægte**: hver formations-slot vægter de tre stats (ST: ANG ×1,0 +
  MID ×0,3; back: FOR ×1,0 + ANG ×0,3 osv.). Positions-fit opstår af
  matematikken, ikke af regler. Formationer = forskellige vægt-sæt =
  forskellige puslespils-brætter.
- Kampmodellen læser KUN de tre stats + slot-vægte + synergier. Alt andet
  (OVR, stjerner) er læsbarheds-lag til mennesket.

### OVR og potentiale (0-99-skalaen)

- **OVR er afledt**, ikke en attribute: vægtet sammenfatning af de tre stats
  målt i spillerens bedste rolle. Kortets store tal.
- **Potentiale er et tal på samme skala** — et loft for OVR ("OVR 62 /
  Pot 87"). Ingen stjerner til potentiale.
- **Ingen levels.** XP konverteres direkte til stat-point, fordelt efter
  spillerens profil; OVR genberegnes.
- **Vækst-pacing**: aftagende point mod loftet — et 90-potentiale skal tage
  det meste af en karriere at indfri (8-10 sæsoner), så talenter er
  projekter, ikke instant gratification.
- **0-100 er æraens skala, ikke spillets**: division 5 ligger ~30-55,
  division 1 ~80-99. Den endeløse vækst bor i økonomi og meta-lag.
  Loft-brud (100+-spillere) gemmes som prestige-æra-event.

### Alder

16-35. Styrer XP-hastighed (×1,5 under 23), forfald (fra ~30 mistes
stat-point per sæson — vist ærligt på høst-skærmen) og salgspris
(peak ~26-28 sælger dyrest). Pension ~33-35.

### Traits (ét per spiller i v1, senere to)

| Trait          | Effekt                                                  |
|----------------|---------------------------------------------------------|
| Playmaker      | Angribere på holdet får +ANG                            |
| Målscorer      | Stor +ANG hvis holdet har en Playmaker, ellers lille    |
| Anfører        | Nabospillere under 23 får +1 i alle stats               |
| Mentor         | Nabospillere under 21 får +50% XP                       |
| Tovejsmaskine  | Slot'ens sekundær-vægt tæller fuldt                     |
| Glaskrop       | +stor bonus på primær stat, forhøjet skadesrisiko       |

*Mentor binder opstilling og høst sammen: "vind nu vs. udvikl" bliver
rumligt.* Forskellighed mellem spillere skal komme fra traits, alder og
potentiale — ikke fra flere stats. Føles kort ens i playtest: flere/vildere
traits først.

**Bevidst udeladt af v1:** fod, moral, fitness, personlighed, kontrakter.
(Fod er billigst at tilføje senere: ét ikon + én flanke-synergi.)

### Rolle-fit: stjerner (1-6)

På opstillings-skærmen viser hver placeret spiller ★1-6: **hvor godt hans
stat-profil passer slot'ens vægte — uafhængigt af hvor god han er**
(bidrag divideret med bidraget fra en optimalt formet spiller med samme OVR).

- Kernespændingen i én sætning: **OVR 82 på ★★ kan bidrage mindre end
  OVR 74 på ★★★★★★.** Det tvinger profil-tænkning frem for OVR-sortering.
- Stjerner er rent positionelle; synergier vises som links, aldrig bagt ind
  i stjernerne — man skal kunne se *hvorfor* noget er godt.
- Skærmens læsehierarki: stjerner = det hurtige blik, hover-delta på
  holdtal = præcisionen, synergi-links = krydderiet.

### Præsentationens tre visninger

1. **Draft-kortet**: position, alder, OVR/Pot, tre stats, trait — ~7
   info-enheder. Scouting-tåge per felt: "OVR 55-68 · Pot 70-90 · trait
   skjult"; scout-niveauer klemmer intervallerne. Kortet viser også egen
   positions-dybde ("du har 1 ST, ældst 31") — behovet skal være synligt
   dér hvor valget træffes.
2. **Opstillings-skærmen**: **hover-preview før drop** — holdtallenes delta
   og synergi-links vises FØR spilleren slippes ("Angreb 231 → 246").
   Over en optaget slot: delta mod nuværende spiller. Dette er skærmens
   vigtigste UX-regel.
3. **Trup-listen**: sortérbar, med salgspris + retning ("2.400 guld ↓") —
   salgs-timing er en færdighed, så kurvens retning skal være synlig.

### Eksempel-kort

> **Viktor Holm — ST, 19 år**
> **OVR 64 / Pot 87** · ANG 71 · MID 34 · FOR 16 · Trait: Målscorer
> *(i din 4-4-2, ST-slot: ★★★★★)*

## Kampmodellen

- 11 spilleres stats aggregeres til **Angreb / Midtbane / Forsvar**,
  modificeret af formation, synergier og traits.
- Kampe afvikles på ~10 sekunder: scoreline, målscorere, evt. momentum-bjælke.
- Ingen interaktion under kampe. Skader sker og vises som drama
  ("Jensen ude resten af sæsonen") — de gør næste opstilling til et nyt
  puslespil, de kræver ikke handling nu.
- **Traits er combo-laget**: *Målscorer* (kræver *Playmaker* for fuld effekt),
  *Anfører* (+kemi til unge), *Tovejsmaskine* (tæller dobbelt),
  *Glaskrop* (topstats, skades ofte — fristelsen). Stats vinder kampe,
  traits skaber draft-glæden.

## Draften (de unge — fremtiden)

- Hver sæson genereres en årgang (fx 15-30 spillere) i talentregisteret.
- **Picks efter omvendt ligaplacering** — bundhold vælger først. Oprykning
  til svær liga giver automatisk bedre picks: væggen finansierer sin løsning.
- **AI-klubber drafter imellem dine picks** med egne behov — "overlever min
  målmand til runde 2?" er gratis drama.
- Draftees er unge, gratis (pick-baserede), usikre og med vækst foran sig.
- Årgange varierer i kvalitet, annonceret på forhånd ("gylden årgang næste
  år") — strategisk tab for bedre picks er en legitim spillestil.
- **Scouting-tågen**: uscoutede spillere viser intervaller
  ("CM, 17 år, ★★–★★★★, traits skjult"). Scouting-opgraderinger indsnævrer
  intervallerne, afslører traits og til sidst potentiale-kurver. RNG'en
  forsvinder aldrig — man får bare mere af den at se.

## Transfervinduet (de færdige — nu'et)

Midtvejs i sæsonen (efter kamp 7) pauser sæsonen ved ét planlagt beat:

- **Butik, ikke draft**: 3-4 åbne slots med spillere i peak-alderen —
  kendte stats, øjeblikkelig effekt, ingen udvikling tilbage, faldende
  gensalgsværdi. Betales med guld. **Reroll mod guld.**
- Tilbud er flygtige ("kun i dette vindue") så hamstring på tværs af
  sæsoner taber værdi; priser følger liga-niveau.
- Efter køb: re-opstilling — sæsonens andet puslespils-beat.
- Kontrasten til draften er pointen: draften er lotterikuponer, vinduet er
  kontant afregning. Begge skal være levedygtige (alders/vækst-aksen
  balancerer det næsten selv).

## Økonomien: én valuta, ét gennemgående dilemma

**Guld** tjenes løbende: per sejr og per mål (sæsonen drypper belønning ved
hver kamp — man hepper på mål, fordi mål er penge), plus sæsonpræmier og
spillersalg.

Guld bruges to steder, og valget er loopets strategiske akse:

- **Transfervinduet** — magt nu
- **Talent-træet** — permanent vækst

Det spejler XP-dilemmaet (se Høsten), så hele spillet stiller samme spørgsmål
i to former: *vind nu eller byg fremtiden?* To spillestile opstår af sig selv:
pokaljægeren og handelsklubben (draft ungt → udvikl → sælg på toppen).

**Spillersalg**: pris = level × alderskurve. Peak-alder sælger dyrt, veteraner
billigt. Hver spiller har en livscyklus: draft ung → udvikl → peak (vind) →
sælg før forfaldet. At time salget er en færdighed.

*Playtest-vagt: hvis spillere hamstrer alt til træet og ignorerer butikken,
overvej at splitte i to valutaer — men prøv med én først.*

## Høsten (dopamin-ceremonien)

Efter sidste kamp: en instrueret belønningsskærm — spillerkort der vender,
XP-bjælker der fyldes i sekvens, LEVEL UP-stempler, facilitets-bonusser vist
eksplicit ("+30% XP fra Træningsanlæg niv. 3"). Spar ikke på animationen;
den er halvdelen af loopets dopamin.

**XP fordeles efter spilletid.** Startere vokser mest → dilemmaet
"stil de bedste og vind" vs. "giv de unge minutter og udvikl" opstår af sig
selv og fodrer salgs-økonomien (udviklede spillere sælger dyrere).

## Talent-træet

Blandede nodes:

**Milepæle:** nye formationer (4-3-3, 3-5-2 …), scouting-niveauer, flere
draft-picks, flere butiks-slots, større trup, ungdomsakademi (1-2 private
prospects per sæson), automatisering (se nedenfor).

**Uendelige nodes (geometriske priser):** Træningsanlæg (XP+%), Stadion
(guld per sejr+%), Fysioterapi (+karrierelængde — direkte modvægt til churn),
kampafviklings-hastighed.

## Churn: motoren der holder draften i live

Spillere har udviklingskurver: vækst til peak (~27), derefter fald, pension
(~34). Holdet smuldrer altid langsomt — draften er ikke noget man vælger,
det er noget truppen kræver. Temaet leverer selv grunden til at drafte for
evigt; intet skal opfindes.

## Det lange spil

- **Ligapyramiden er væggene**: Division 5 → … → 1 → kontinentale ligaer →
  (fiktive) superligaer opad i det absurde, med eksponentielt voksende
  ratings og økonomi. Oprykning = breakthrough; første sæson i ny liga =
  væg (og giver topvalg i draften).
- **Automatiseringsstigen** (købes sent): auto-opstilling af reserver →
  auto-sæson (skip) → assistent der drafter sene picks → sportsdirektør.
  Aktiv tilstedeværelse forbliver en multiplikator, aldrig en port.
- **Prestige — "Arven"**: opløs klubben, grundlæg en ny. Mist trup, stadion
  og guld; få Legacy-point (trofæer, æra-rekorder) til permanente multipliers,
  start i højere liga, bedre scouting-baseline — og én **Klublegende**:
  en pensioneret spiller fra den gamle klub, der følger med som træner.
- **Slutspil — klubnetværket**: feeder-klubber i lavere ligaer, der spiller
  automatiserede sæsoner og udvikler dine prospects. Talent-pipeline på
  tværs af et imperium.

## Prototype-scope

- 1 liga, 8 hold, 14 kampe à ~10 sek, tre-tals kampmodel
- 4-4-2 som eneste formation — men **synergi-links og levende holdtal
  bygges fra dag ét** (det er dét, der testes)
- Trup på 14; spillere med alder, tre stats, ét trait; aldring + pension
  aktiv fra start
- Draft: årgang på 15, 2 picks, AI-klubber drafter imellem, scouting niv. 1-2
  (interval → smallere interval)
- Transfervindue efter kamp 7: 3 slots, reroll, peak-alder-spillere
- Guld per sejr + per mål; spillersalg med alderskurve-pris
- Høst-skærm **med animation**
- Talent tree: Træningsanlæg (uendelig), Stadion (uendelig), Scouting,
  unlock af 4-3-3 som gulerod
- Ingen prestige, ingen feeder-klubber, ingen pyramide endnu

### Testspørgsmålene

1. **Er opstillings-fiflen sjov nok til at gøre den igen efter hver sæson?**
   (Kræver at churn + vindue + årgange giver nok fornyelse — kan kun
   afgøres ved playtest.)
2. **Føles høst-skærmen som en belønning, man simulerer en hel sæson for
   at nå frem til?**
3. **Føles transfervinduet som en gave (nyt legetøj, ny opstilling) — eller
   som en afbrydelse af flowet?**

## Kendte risici

1. **Sim-dybde**: kampene skal være netop dybe nok til at draft- og
   opstillings-valg kausalt mærkes i resultaterne. For lavt → draften er
   teater; for dybt → man bygger Football Manager igen.
2. **Opstillings-gentagelse**: uden nok churn er puslespillet løst efter
   tre sæsoner. (Testspørgsmål 1.)
3. **Hamstring**: én valuta kan tippe mod talent-træet. (Playtest-vagt.)
4. **Sessionslængde**: sæsoner må aldrig blive pligt mellem drafts —
   svaret er kompression, ikke mere at klikke på.

## Åbne spørgsmål (bevidst udskudt)

- Faciliteter som butiksvarer i transfervinduet (v1: butik = spillere,
  træ = faciliteter)
- To valutaer, hvis hamstring dominerer
- Skader: frekvens og dybde (v1: sjældne, rent narrative)
- Datacentral (se AI-klubbers draft-behov) som sen scouting-node
- Picks som omsættelig valuta (byt/sælg draft-rettigheder)
- Streak-/underdog-bonusser i guld-økonomien
- Pyramidens præcise struktur og rating-skalering per division
