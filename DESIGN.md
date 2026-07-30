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
6. **Kernen automatiseres aldrig.** Draft, opstilling og vinduets valg ER
   spillet og forbliver manuelle for evigt. Incremental-følelsen kommer fra
   kompression (kampfart, øjeblikkelig sæson-afvikling) og automatisering
   af bi-elementer (fx feeder-klubber senere) — aldrig af beslutningerne.
   Der findes ingen manuel træning at automatisere: XP kommer af spilletid,
   punktum. Ingen træningsskemaer, nogensinde.

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

Fodbold er lavscorende, og lavscorende spil har naturligt høj varians —
favoritten vinder kun 50-60% i virkeligheden. Modellen udnytter det:
**vi simulerer chancer, ikke resultater.** Det bedste hold har de bedste
chancer; garantier findes ikke. Holdtallene (Angreb/Midtbane/Forsvar) er
summen af de 11 spilleres vægtede bidrag inkl. synergier og traits.

### Tre dueller, der mapper 1:1 til holdtallene

1. **Midtbaneduellen skaber chancerne.** Kampen har en chance-pulje
   (8-12, tilfældig). Hver chance tildeles et hold efter:
   `andel = MID_dig^p_mid / (MID_dig^p_mid + MID_opp^p_mid)`,
   clampet til **[30%, 70%]**.
2. **Angreb mod forsvar afgør hver chance:**
   `P(mål) = K × ANG^p_konv / (ANG^p_konv + FOR^p_konv)`
3. **Terningen ruller per chance.** Mål er binomial-udfald — variansen er
   den ærlige konsekvens af få, usikre chancer. Ingen skjult dagsform,
   momentum eller held-modifier; hver overraskelse kan spores til chancer,
   der blev misset eller konverteret.

Modellen er **skala-fri** (kun forhold betyder noget: 240/210 regner som
24/21) — den virker uændret fra division 5 til superligaerne.

### Balance-reglen: p_mid = p_konv / 2

MID tæller dobbelt (chancefordelingen er nulsum: flere chancer til dig =
færre til dem), så midtbaneduellen får halv eksponent — det giver
first-order paritet mellem de tre stats. Clampen sætter desuden et hårdt
loft på MID-stacking (forbi 70% er MID-point værd nul) og garanterer
underdoggen ~30% af chancerne.

Konkave kurver gør resten: dominerer du midten, er næste MID-point næsten
værdiløst og ANG det bedste køb — det bedste draft-køb afhænger af trup og
kontekst, monokultur er matematisk irrationel. Formationer bliver
spillestile, ikke power-rankings: 4-5-1 = volumen/lav varians, 4-3-3 =
effektivitet/høj varians. (Som favorit vil du have lav varians, som
underdog høj.)

### Kalibrerede værdier (Monte Carlo, `simulation/match_sim.py`)

**K=0,5 · p_konv=2,0 · p_mid=1,0 · chancepulje 8-12 · clamp 30-70%**

Målt over 20-50k kampe per celle (seed 42):

| Scenario           | Sejr | Uafgjort | Tab | Mål/kamp | Margin ≥4 |
|--------------------|------|----------|-----|----------|-----------|
| Jævnbyrdig         | 37%  | 26%      | 36% | 2,50     | 2,6%      |
| +10% favorit       | 46%  | 25%      | 29% | 2,51     | 2,9%      |
| +20% favorit       | 54%  | 24%      | 22% | 2,53     | 4,0%      |
| +50% favorit       | 73%  | 17%      | 10% | 2,70     | 10,1%     |

- Stat-paritet bestået: +20 point i hhv. ANG/MID/FOR giver +2,5/+2,6/+2,2
  pp sejrsrate — ingen stat dominerer draften.
- Typiske resultater: 1-1, 1-0, 2-1 hyppigst; 0-0 i ~6% — realistisk
  fodbold uden håndkodede resultattabeller.
- Genkalibrering ved regelændringer: kør harnesset igen, tjek targets
  (jævnbyrdig ~37/26/37, +20% ≈ 52-58% sejr, paritet inden for ~1 pp).

### Målscorere

Hvert mål tildeles en spiller vægtet efter ANG-bidrag i opstillingen
(+ekstra vægt til *Målscorer*-traiten). Giver "hvem scorer"-displayet,
guld-dryppet per mål, topscorer-statistik — og gør draft-valg til navne,
man ser score.

### Diagnose (designprincip 4, håndhævet)

| Symptom               | Diagnose                       | Næste træk        |
|-----------------------|--------------------------------|-------------------|
| Få chancer skabt      | Tabte midtbanen                | Draft/køb MID     |
| Chancer, men få mål   | Deres forsvar slog dit angreb  | ANG / Playmaker   |
| Mange mål imod        | Dit forsvar lækker             | FOR               |

Sæson-skærmen auto-genererer én sætning per tendens ("I blev udspillet på
midtbanen i 9 af 14 kampe").

### De 10 sekunder: simulér øjeblikkeligt, afspil som drama

Kampen afgøres på et millisekund; de 10 sekunder er iscenesættelse.
Hurtig minut-ticker, kun nøgle-events: "23' — CHANCE! Holm… FORBI" /
"41' — MÅÅÅL! Holm". **Missede chancer skal vises** — de gør variansen
følt i stedet for mistænkelig ("vi skabte nok, vi var uskarpe" kan ses
med egne øjne). Mål plinger guld ind live.

Ingen interaktion under kampe. Skader vises som drama ("Jensen ude resten
af sæsonen") — de gør næste opstilling til et nyt puslespil, de kræver
ikke handling nu.

## Draften (de unge — fremtiden)

### Grundbeslutning: fælles pulje, privat viden

Alle klubber drafter fra **samme årgang** (klassisk amerikansk draft).
Begrundelse — nedskrevet så debatten ikke genåbnes uden grund:

- Transfervinduet ER allerede spillets private pulje; en privat draft-pulje
  ville være butik nummer to og udviske draftens identitet
- Draft-rækkefølge som catch-up, tanking, pick-handel og guldårgange som
  verdens-events kræver alle en objektiv, delt årgang
- "Overlever han til mit pick?" — draftens bedste følelse kræver rivaler
- **Den private pulje opstår alligevel — som information**: årgangen er
  delt, men den del du kan se klart, er formet af dit scouting-arbejde.
  Scouting genererer ikke puljen; den genererer dit udsyn over den.
  (Ungdomsakademiet bliver senere den ægte private pulje.)

### Årgangen (1.0)

- **24 spillere** per årgang (8 klubber × 3 runder — alle draftes, ingen rest)
- **Positions-garanti**: min. 2 GK / 7 forsvar / 7 midtbane / 5 angreb
- Alder 16-19; OVR ved draft 25-40 (division 5-skala)
- **Potentiale-fordeling** (normal årgang): 50% Pot 40-55 (fyld),
  30% Pot 55-70 (solide), 15% Pot 70-85 (profiler), 5% Pot 85+
  (juvelen — 1-2 per årgang)
- **Årgangs-kvalitet annonceret én sæson forud**: Svag / Normal / Stærk /
  Gylden (forskyder vægtene; gylden ≈ 3× profiler og juveler).
  Strategisk tab for bedre picks er en legitim spillestil.
- **Picks efter omvendt ligaplacering** — bundhold vælger først. Oprykning
  giver automatisk topvalg: væggen finansierer sin egen løsning.

### Offentlig rangliste vs. privat scouting (kernefærdigheden)

Årgangen præsenteres med en **offentlig ekspert-rangliste** ("mediernes
board"): sorteret efter nuværende OVR plus støj, **blind for potentiale og
traits**. AI-klubberne drafter efter boardet.

Spillerens forspring er **scout-rapporter** (6 per sæson i basis; +2 per
scouting-node, op til ~14): fra årgangen offentliggøres (midt i sæsonen,
samtidig med transfervinduet) kan rapporter bruges frit — én rapport =
spillerens intervaller snævres kraftigt ind, potentiale-estimat og trait
afsløres. **Scout-fokus**: vælg en positionsgruppe; rapporter på den
koster det halve.

Kernefærdigheden i én sætning: *mediet ser hvem der er god nu — du ser
hvem der bliver god.* Juvelen (OVR 27 / Pot 88) står som nr. 19 på
boardet; har du scoutet ham, falder han til dit 2.-pick. Det øjeblik er
systemets payoff, og det opstår mekanisk af forskellen mellem offentlig
og privat information.

### AI-klubbernes draft-logik

Bevidst simpel: `score = offentlig rangering + positionsbehov + støj`.
AI'en kender ikke potentiale — den bruger samme board som offentligheden.
(Senere krydderi: enkelte klubber med "godt akademi"-flag får svag
potentiale-snusen.) Naturlige reaches og steals uden klog AI.

### Draft-dagen (skærmen, 3-5 minutter)

Placering i loopet: efter Høst og talent tree/salg, **før** næste sæsons
opstilling — rookies er med i puslespillet med det samme.

1. **Rækkefølge-båndet** (top): alle 24 picks som strimmel, dine markeret;
   "3 picks til din tur". AI-picks afvikles på ~1,5 sek. med animation
   ("Northbridge FC vælger… CB Anders Holt")
2. **Boardet** (midten): 24 kort, sortérbart (offentlig rang / position /
   din scouting). Scoutede kort skarpe, uscoutede i tåge-intervaller;
   draftede gråtones med klub-logo
3. **Behovspanelet** (side): egen trup per position med alder
   ("2 CM, ældst 33") — behovet synligt dér, hvor valget træffes

Ingen timer — spillet venter på dig. Rookies lander på lav OVR og er
projekter, som XP-systemet (spilletid, Mentor) skal forløse: draften
fodrer direkte "vind nu vs. udvikl"-dilemmaet.

### Udenfor 1.0 (prioriteret)

1. Pick-handel med AI (byt ned + guld / køb dig op)
2. Draft-kalenderen (se 2-3 årgange frem)
3. Prøvetræningen (fuld afsløring af én spiller på draft-dagen)
4. Kompensations-picks ved stjernesalg
5. Stab i årgange (sjældne draftbare trænere/fysioer), live-tilbud på
   draft-dagen

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

**Spillersalg**: pris = OVR × alderskurve, plus potentiale-præmie for unge
(køberne betaler for fremtiden — loftramte juveler er klubbens dyreste
vare). Peak-alder sælger dyrt, veteraner billigt. Livscyklus: draft ung →
udvikl → peak (vind) → sælg før forfaldet. At time salget er en færdighed.

### Tal (division 5-baseline; alt skalerer ×~2,5 per division)

**Indtægter:** mål 10 · sejr 50 · uafgjort 15 · placeringspræmie 50-500.
Midterhold ≈ 700-800 guld/sæson; tophold ≈ 1.100.

**Udgifter:** vindueskøb (peak-spiller) 300-800 · reroll 50 · første
talent-nodes 200-400 · uendelige nodes ×1,6 per niveau · udviklingsloft
1.000 / 2.500 / 6.000 / …

**Balancemålet i én sætning:** en sæson finansierer ÉT meningsfuldt valg —
et vindueskøb ELLER en solid node ELLER en bid af næste loft. Aldrig to.

**Simuleret (career_sim.py, 20 sæsoner):** loft 58 købes ~S3, loft 66
~S5-6 (target S5-7 ✓); ingen juvel forløses i division 5 — de sælges eller
kræver oprykning ✓; loft-først og balanceret klart bedre end
indkomst-først i sim uden transfervindue (vinduet mangler i sim'en og
favoriserer indkomst-strategien — genbesøg +5%-satsen hvis skævheden
består i playtest).

*Playtest-vagt: hvis spillere hamstrer alt til træet og ignorerer butikken,
overvej at splitte i to valutaer — men prøv med én først.*

## Høsten (dopamin-ceremonien)

Efter sidste kamp: en instrueret belønningsskærm — spillerkort der vender,
XP-bjælker der fyldes i sekvens, OVR-hop som stempler ("64 → 67"),
facilitets-bonusser vist eksplicit ("+30% XP fra Træningsanlæg niv. 3") —
og loftramte spillere med grå bjælke og spildt XP (se Udviklingsloftet).
Spar ikke på animationen; den er halvdelen af loopets dopamin.

**XP fordeles efter spilletid.** Startere vokser mest → dilemmaet
"stil de bedste og vind" vs. "giv de unge minutter og udvikl" opstår af sig
selv og fodrer salgs-økonomien (udviklede spillere sælger dyrere).

## XP og udviklingsloftet

### To lofter — det laveste gælder

```
maks OVR = min(spillerens potentiale, klubbens udviklingsloft)
```

Udviklingsloftet hæves via Træningsanlægget (se talent-træet). **En lille
klub kan ikke forløse en juvel** — Pot 88 betyder intet, hvis anlægget
stopper ham ved 50. Rammer en spiller loftet, stopper væksten synligt:
grå bjælke på høst-skærmen, **"LOFT NÅET — 140 XP spildt"**. Spildt XP
vises altid; den smerte driver næste beslutning:

**Sælg juvelen eller hæv loftet.** Køberklubber betaler for potentiale, så
en loftramt ung juvel er klubbens dyreste vare (~ét anlægs-niveau i pris).
Loopet: *juvel → loft → sælg → investér → højere loft → behold den næste
juvel længere.* Den lille klubs fantasi: talentfabrik før pokalmaskine.
Aldringskurven tikker imens — en juvel, der venter 3 sæsoner på et
loft-løft, mister vækstår for evigt. At sælge er ofte det rigtige; det
skal gøre lidt ondt.

Loftet rammer kun fremtiden: transfervinduets peak-spillere er
færdigudviklede og upåvirkede — butikken forbliver ren "magt nu".

### XP-regler

| Kilde/modifikator | Værdi |
|---|---|
| Starter, per kamp | 10 XP |
| Bænk, per kamp | 3 XP |
| Under 23 år | ×1,5 |
| Mentor-nabo (U21) | +50% |
| Træningsanlæg | +10% per niveau |

**Pris per OVR-point: `5 × 1,03^OVR` XP** (kalibreret i
`simulation/career_sim.py`, del 1). Karriere-pacing under
storklubs-forhold: fyld (Pot 45) ~1-2 sæsoner, solid (Pot 60) ~3-4,
profil (Pot 78) ~6, juvel (Pot 88) ~9 — og i praksis langsommere, da
rookies starter på bænken. Juvelen kan aldrig forløses af tid alene:
kun tid plus infrastruktur.

## Talent-træet (fire grene)

Grenene spejler spillets søjler. Ingen gren automatiserer kernen
(designprincip 6).

**🎓 Akademiet (udvikling)**

| Node | Effekt | Pris |
|---|---|---|
| Træningsanlæg I-VII | Udviklingsloft 50→58→66→74→82→90→99, +10% XP/trin | 1.000 / 2.500 / 6.000 / 15.000 / 40.000 / 100.000 |
| Fysioterapi (uendelig) | −2% aldersforfald per niveau | 300, ×1,6 |
| Ungdomsakademi (sen milestone) | 1-2 private prospects per sæson | dyr, sen 1.0/post-1.0 |

Træningsanlæggets prisfaktor (~×2,5/trin) matcher divisions-skaleringen:
hvert loft-niveau bliver overkommeligt ca. én division senere — loftet
følger rejsen op gennem pyramiden.

**🔭 Scouting-afdelingen (draft)**

| Node | Effekt |
|---|---|
| Scoutkorps I-IV | +2 rapporter per trin (6 → 14) |
| Fokus I / II | Rapporter på fokusgruppe koster det halve / to fokusgrupper |

**🏟️ Klubben (økonomi)**

| Node | Effekt |
|---|---|
| Stadion (uendelig) | +5% guld per sejr per niveau (300, ×1,6) |
| Fanshop (uendelig) | +5% guld per mål per niveau (300, ×1,6) |
| Bestyrelsen I-III | +25% placeringspræmie per trin |
| Vindues-slots | 3 → 4 → 5 tilbud i transfervinduet |
| Trupstørrelse | 14 → 16 → 18 |

Stadion belønner sejre (kontrol-spillestil), Fanshop belønner mål
(offensiv spillestil) — selv økonomi-nodes har build-identitet.

**⚽ Førsteholdet (kamp)**

| Node | Effekt |
|---|---|
| Formationer | 4-3-3, 3-5-2, 4-5-1, 5-3-2 (én ad gangen, stigende pris) |
| Kampfart I-III | 10s → 7s → 5s → 3s per kamp |

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
- **Kompression, ikke automatisering**: kampfart-opgraderinger og
  øjeblikkelig sæson-afvikling (sæsonen er i forvejen passiv tilskuertid).
  Kernen (draft, opstilling, vindue) forbliver manuel for evigt; kun
  bi-elementer automatiseres — en sportsdirektør kan drive feeder-klubberne,
  aldrig din klub.
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
- Talent tree: Træningsanlæg I-II (udviklingsloft 50→58), Stadion
  (uendelig), Scoutkorps I, unlock af 4-3-3 som gulerod
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
- Antal scout-rapporter (6 af 24?) — følelses-parameter: man skal kunne se
  ~25-40% af årgangen klart. For lidt = gætværk, for meget = indkøbsliste.
  Skal findes i playtest
- Streak-/underdog-bonusser i guld-økonomien
- Hjemmebanefordel (+5-8% chanceandel — binder til stadion-økonomien)
- Pyramidens præcise struktur og rating-skalering per division
