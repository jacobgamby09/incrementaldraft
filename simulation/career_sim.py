"""Karriere- og oekonomi-harness for Dynastiet.

DEL 1 — XP-formel-kalibrering (grid-soegning):
  pris(OVR -> OVR+1) = A * r^OVR  XP
  Antagelser: spilleren starter hver kamp (14/saeson, 10 XP), U23 = x1.5,
  traeningsanlaeg vokser paa storklubs-skema (loftet binder ikke).
  Targets (saesoner til potentialet indfries):
    fyld (Pot 45): 2-3 | solid (Pot 60): 4-5 | profil (Pot 78): 6-8 | juvel (Pot 88): 8-10

DEL 2 — 20-saesoners klubsimulering, division 5, tre forbrugsstrategier:
  loft-foerst / indkomst-foerst / balanceret.
  Targets: ingen dominant strategi; loft III (66) koebt ca. saeson 5-7;
  juveler skal IKKE kunne forloeses uden loft-investering.

Forenklinger (bevidste): en spiller har et kvalitetstal q (~OVR) + position;
ingen traits/mentor; intet transfervindue (kun salg); AI-klubber er
kvalitetsbaand, ikke fulde trupper; ingen oprykning (derfor er loft V-VII
reelt udenfor raekkevidde her — de hoerer til hoejere divisioner).
"""

import random

# ---------- kampmodel (kalibreret i match_sim.py) ----------
K, P_KONV, P_MID = 0.5, 2.0, 1.0
CLAMP_LO, CLAMP_HI = 0.30, 0.70

# ---------- oekonomi-konstanter (foreslaaede, testes her) ----------
GULD_MAAL, GULD_SEJR, GULD_UAFGJORT = 10, 50, 15
PRAEMIER = [500, 400, 300, 250, 200, 150, 100, 50]  # placering 1-8
LOFT = {1: 50, 2: 58, 3: 66, 4: 74, 5: 82, 6: 90, 7: 99}
TIER_PRIS = {2: 1000, 3: 2500, 4: 6000, 5: 15000, 6: 40000, 7: 100000}
NODE_BASIS, NODE_VAEKST = 300, 1.6      # stadion/fanshop: +5%/niveau
XP_START, XP_BAENK, KAMPE = 10, 3, 14

rng = random.Random(7)


def spil_kamp(a, b):
    """a, b = (ANG, MID, FOR). Returnerer (maal_a, maal_b)."""
    sa, sb = a[1] ** P_MID, b[1] ** P_MID
    share = min(max(sa / (sa + sb), CLAMP_LO), CLAMP_HI)
    qa = K * a[0] ** P_KONV / (a[0] ** P_KONV + b[2] ** P_KONV)
    qb = K * b[0] ** P_KONV / (b[0] ** P_KONV + a[2] ** P_KONV)
    ga = gb = 0
    for _ in range(rng.randint(8, 12)):
        if rng.random() < share:
            ga += rng.random() < qa
        else:
            gb += rng.random() < qb
    return int(ga), int(gb)


# ==================== DEL 1: XP-formel ====================

ARKETYPER = [("fyld", 45, 2.5), ("solid", 60, 4.5),
             ("profil", 78, 7.0), ("juvel", 88, 9.0)]


def saesoner_til_pot(pot, A, r, start_ovr=32, start_alder=17):
    ovr, alder = start_ovr, start_alder
    for saeson in range(1, 26):
        tier = min(7, 1 + saeson // 2)  # storklub: loftet binder ikke
        mult = (1 + 0.10 * (tier - 1)) * (1.5 if alder < 23 else 1.0)
        xp = KAMPE * XP_START * mult
        while ovr < pot and xp >= A * r ** ovr:
            xp -= A * r ** ovr
            ovr += 1
        if ovr >= pot:
            return saeson
        alder += 1
    return None


print("=" * 78)
print("DEL 1: XP-formel  pris(OVR->OVR+1) = A * r^OVR")
print(f"  Targets: fyld 2-3 | solid 4-5 | profil 6-8 | juvel 8-10 saesoner")
print("=" * 78)
best, best_err = None, 1e9
print(f"  {'A':>3} {'r':>6} | {'fyld':>5} {'solid':>6} {'profil':>7} {'juvel':>6}")
for A in (2, 3, 4, 5, 6):
    for r in (1.030, 1.035, 1.040, 1.045, 1.050):
        res = [saesoner_til_pot(p, A, r) for _, p, _ in ARKETYPER]
        if None in res:
            continue
        err = sum((a - t) ** 2 for a, (_, _, t) in zip(res, ARKETYPER))
        marker = ""
        if err < best_err:
            best, best_err = (A, r), err
            marker = "  <-- bedste indtil videre"
        print(f"  {A:>3} {r:>6} | {res[0]:>5} {res[1]:>6} {res[2]:>7} "
              f"{res[3]:>6}{marker}")
A_XP, R_XP = best
print(f"\n  VALGT: A={A_XP}, r={R_XP}")


# ==================== DEL 2: klubsimulering ====================

class Spiller:
    __slots__ = ("pos", "q", "pot", "alder")

    def __init__(self, pos, q, pot, alder):
        self.pos, self.q, self.pot, self.alder = pos, q, pot, alder


def start_trup():
    trup = []
    for pos, antal in (("GK", 2), ("DF", 5), ("MF", 4), ("FW", 3)):
        for _ in range(antal):
            q = rng.uniform(33, 45)
            trup.append(Spiller(pos, q, q + rng.uniform(2, 12),
                                rng.randint(20, 31)))
    return trup


def vaelg_xi(trup):
    xi = []
    for pos, antal in (("GK", 1), ("DF", 4), ("MF", 4), ("FW", 2)):
        kandidater = sorted((s for s in trup if s.pos == pos),
                            key=lambda s: -s.q)
        xi.extend(kandidater[:antal])
    return xi


def hold_linjer(xi):
    ang = sum(s.q for s in xi if s.pos == "FW")
    mid = sum(s.q for s in xi if s.pos == "MF")
    fors = sum(s.q for s in xi if s.pos in ("GK", "DF"))
    return (ang, mid, fors)


def ny_aargang(saeson):
    infl = 1.02 ** saeson
    aargang = []
    kvoter = ["GK"] * 2 + ["DF"] * 7 + ["MF"] * 7 + ["FW"] * 5
    kvoter += [rng.choice(["DF", "MF", "FW"]) for _ in range(3)]
    for pos in kvoter:
        q = rng.uniform(25, 40) * infl
        roll = rng.random()
        if roll < 0.50:
            pot = rng.uniform(40, 55)
        elif roll < 0.80:
            pot = rng.uniform(55, 70)
        elif roll < 0.95:
            pot = rng.uniform(70, 85)
        else:
            pot = rng.uniform(85, 95)
        pot = max(pot * infl, q + 3)
        aargang.append(Spiller(pos, q, pot, rng.randint(16, 19)))
    return aargang


def simuler_strategi(strategi, saesoner=20, seed=42):
    global rng
    rng = random.Random(seed)
    trup = start_trup()
    guld, tier, stadion, fanshop = 0.0, 1, 0, 0
    koebslog, solgte_juveler, forloeste = [], 0, 0
    placeringer, cyklus = [], 0

    for saeson in range(1, saesoner + 1):
        infl = 1.02 ** saeson

        # --- saeson: dobbelt roundrobin, os + 7 AI-baandklubber ---
        ai = [(2 * q, 4 * q, 5 * q) for q in
              (42 * infl * rng.uniform(0.85, 1.15) for _ in range(7))]
        xi = vaelg_xi(trup)
        os = hold_linjer(xi)
        point = [0.0] * 8  # index 0 = os
        maal, sejre, uafgjorte = 0, 0, 0
        for i in range(8):
            for j in range(8):
                if i == j:
                    continue
                ha = os if i == 0 else ai[i - 1]
                ua = os if j == 0 else ai[j - 1]
                ga, gb = spil_kamp(ha, ua)
                for idx, (gf, gm) in ((i, (ga, gb)), (j, (gb, ga))):
                    point[idx] += 3 if gf > gm else (1 if gf == gm else 0)
                    point[idx] += 0.001 * (gf - gm)  # maalforskel som tiebreak
                if i == 0:
                    maal += ga
                    sejre += ga > gb
                    uafgjorte += ga == gb
                elif j == 0:
                    maal += gb
                    sejre += gb > ga
                    uafgjorte += ga == gb

        placering = sorted(range(8), key=lambda k: -point[k]).index(0) + 1
        placeringer.append(placering)

        # --- indkomst ---
        guld += (maal * GULD_MAAL * (1 + 0.05 * fanshop)
                 + sejre * GULD_SEJR * (1 + 0.05 * stadion)
                 + uafgjorte * GULD_UAFGJORT + PRAEMIER[placering - 1])

        # --- XP/udvikling (loftet gaelder!) ---
        loft = LOFT[tier]
        xi_set = set(id(s) for s in xi)
        for s in trup:
            basis = XP_START if id(s) in xi_set else XP_BAENK
            mult = (1 + 0.10 * (tier - 1)) * (1.5 if s.alder < 23 else 1.0)
            xp = KAMPE * basis * mult
            maks = min(s.pot, loft)
            while s.q < maks and xp >= A_XP * R_XP ** s.q:
                xp -= A_XP * R_XP ** s.q
                s.q += 1
            if s.q >= s.pot - 0.5 and s.pot >= 80:
                forloeste += 1
                s.pot += 1000  # taeller kun een gang

        # --- aldring / pension ---
        for s in trup:
            s.alder += 1
            if s.alder >= 30:
                s.q -= (s.alder - 29)
        trup = [s for s in trup if s.alder < 34 and s.q > 18]

        # --- salg af loftramte juveler ---
        for s in list(trup):
            reel_pot = s.pot if s.pot < 500 else s.pot - 1000
            if (s.alder <= 23 and reel_pot > loft + 5
                    and s.q >= min(reel_pot, loft) - 1):
                guld += s.q * 8 + (reel_pot - s.q) * 6
                trup.remove(s)
                solgte_juveler += 1

        # --- draft (omvendt placering; vi kender potentialer) ---
        aargang = ny_aargang(saeson)
        raekkefoelge = sorted(range(8), key=lambda k: point[k])
        for runde in range(3):
            for klub in raekkefoelge:
                if not aargang:
                    break
                if klub == 0:
                    behov = min(("GK", 2), ("DF", 5), ("MF", 5), ("FW", 3),
                                key=lambda pa: sum(1 for s in trup
                                                   if s.pos == pa[0]) / pa[1])
                    gruppe = [s for s in aargang if s.pos == behov[0]] or aargang
                    valg = max(gruppe, key=lambda s: s.pot)
                    trup.append(valg)
                else:
                    valg = max(aargang, key=lambda s: s.q)  # AI: public board
                aargang.remove(valg)

        # --- frie agenter, saa XI altid kan stilles ---
        for pos, minimum in (("GK", 2), ("DF", 5), ("MF", 5), ("FW", 3)):
            while sum(1 for s in trup if s.pos == pos) < minimum:
                if guld >= 150:
                    guld -= 150
                q = 36 * infl
                trup.append(Spiller(pos, q, q + 2, 27))

        # --- forbrugsstrategi ---
        def koeb_tier():
            nonlocal tier, guld
            naeste = tier + 1
            if naeste in TIER_PRIS and guld >= TIER_PRIS[naeste]:
                guld -= TIER_PRIS[naeste]
                tier = naeste
                koebslog.append(f"S{saeson}: loft {LOFT[tier]}")
                return True
            return False

        def koeb_node():
            nonlocal stadion, fanshop, guld
            lvl = min(stadion, fanshop)
            pris = NODE_BASIS * NODE_VAEKST ** lvl
            if guld >= pris:
                guld -= pris
                if stadion <= fanshop:
                    stadion += 1
                else:
                    fanshop += 1
                return True
            return False

        if strategi == "loft":
            while koeb_tier():
                pass
        elif strategi == "indkomst":
            while koeb_node():
                pass
            if stadion >= 5 and fanshop >= 5:
                koeb_tier()
        else:  # balanceret
            while True:
                koebt = koeb_tier() if cyklus % 3 == 0 else koeb_node()
                if not koebt:
                    break
                cyklus += 1

    xi = vaelg_xi(trup)
    return {
        "placeringer": placeringer,
        "koebslog": koebslog,
        "tier": tier, "stadion": stadion, "fanshop": fanshop,
        "solgte_juveler": solgte_juveler, "forloeste": forloeste,
        "guld_rest": guld,
        "xi_snit": sum(s.q for s in xi) / len(xi) if xi else 0,
        "trofaeer": placeringer.count(1),
    }


print()
print("=" * 78)
print("DEL 2: 20 saesoner, division 5, tre forbrugsstrategier (seed 42)")
print("=" * 78)
for strategi in ("loft", "indkomst", "balanceret"):
    r = simuler_strategi(strategi)
    p = r["placeringer"]
    blokke = [sum(p[i:i + 5]) / 5 for i in range(0, 20, 5)]
    print(f"\n  Strategi: {strategi.upper()}")
    print(f"    snitplacering (5-saesons-blokke): "
          f"{'  '.join(f'{b:.1f}' for b in blokke)}")
    print(f"    loft-koeb: {', '.join(r['koebslog']) or 'ingen'}")
    print(f"    slut: tier {r['tier']} (loft {LOFT[r['tier']]}), "
          f"stadion {r['stadion']}, fanshop {r['fanshop']}, "
          f"XI-snit {r['xi_snit']:.0f}, guld {r['guld_rest']:.0f}")
    print(f"    juveler solgt: {r['solgte_juveler']}, "
          f"forloeste 80+-talenter: {r['forloeste']}, "
          f"mesterskaber: {r['trofaeer']}")

print("\nFaerdig. Targets: loft III ca. S5-7; ingen strategi dominant;")
print("juveler forloeses IKKE i division 5 uden loft-investering.")
