"""Monte Carlo-harness for Dynastiets kampmodel.

Modellen:
  chanceandel = clamp( MID_a^p_mid / (MID_a^p_mid + MID_b^p_mid), 0.30, 0.70 )
  P(maal)     = K * ANG_att^p_konv / (ANG_att^p_konv + FOR_def^p_konv)
  N chancer ~ uniform(8..12); hver chance tildeles hold efter andel,
  konverteres med P(maal). Maal er dermed binomial-udfald.

Balance-regel under test: p_mid = p_konv / 2 giver first-order paritet
mellem MID, ANG og FOR ved jaevnbyrdighed (MID taeller dobbelt, fordi
chancefordelingen er nulsum).

Kalibrerings-targets:
  - Jaevnbyrdig kamp: ~25-28%% uafgjort, ~2.4-2.7 maal/kamp, 0-0 under ~12%%
  - +20%% favorit: ~52-58%% sejr
  - +50%% favorit: ~65-75%% sejr, blowouts (margin >= 4) sjaeldne
  - Stat-paritet: +20 point i hhv. ANG/MID/FOR skal flytte sejrsraten ens
"""

import random
from collections import Counter

CLAMP_LO, CLAMP_HI = 0.30, 0.70
N_LO, N_HI = 8, 12
K = 0.5
BASE = 200.0

rng = random.Random(42)


def simulate_match(a, b, p_mid, p_konv):
    """a, b = (ANG, MID, FOR). Returnerer (maal_a, maal_b)."""
    sa, sb = a[1] ** p_mid, b[1] ** p_mid
    share = sa / (sa + sb)
    share = min(max(share, CLAMP_LO), CLAMP_HI)
    qa = K * a[0] ** p_konv / (a[0] ** p_konv + b[2] ** p_konv)
    qb = K * b[0] ** p_konv / (b[0] ** p_konv + a[2] ** p_konv)
    ga = gb = 0
    for _ in range(rng.randint(N_LO, N_HI)):
        if rng.random() < share:
            if rng.random() < qa:
                ga += 1
        else:
            if rng.random() < qb:
                gb += 1
    return ga, gb


def run(a, b, p_mid, p_konv, n=20000):
    w = d = l = goals = big = 0
    scores = Counter()
    for _ in range(n):
        ga, gb = simulate_match(a, b, p_mid, p_konv)
        if ga > gb:
            w += 1
        elif ga == gb:
            d += 1
        else:
            l += 1
        goals += ga + gb
        if abs(ga - gb) >= 4:
            big += 1
        scores[(ga, gb)] += 1
    return {
        "win": w / n, "draw": d / n, "loss": l / n,
        "avg_goals": goals / n, "blowout": big / n, "scores": scores, "n": n,
    }


def team(ang=BASE, mid=BASE, forsvar=BASE):
    return (ang, mid, forsvar)


def pct(x):
    return f"{100 * x:5.1f}%"


print("=" * 74)
print("EKSPERIMENT A: Styrkeforhold  (favoritens alle stats = base * ratio)")
print(f"  K={K}, chancer {N_LO}-{N_HI}, clamp [{CLAMP_LO},{CLAMP_HI}], p_mid=p_konv/2")
print("=" * 74)
GRID = [1.3, 1.6, 2.0]
RATIOS = [1.0, 1.1, 1.2, 1.5]
for p_konv in GRID:
    p_mid = p_konv / 2
    print(f"\n  p_konv={p_konv}  p_mid={p_mid}")
    print(f"  {'ratio':>6} {'sejr':>7} {'uafgj':>7} {'tab':>7} "
          f"{'maal/kamp':>10} {'margin>=4':>10}")
    for r in RATIOS:
        fav = team(BASE * r, BASE * r, BASE * r)
        res = run(fav, team(), p_mid, p_konv)
        print(f"  {r:>6} {pct(res['win'])} {pct(res['draw'])} "
              f"{pct(res['loss'])} {res['avg_goals']:>10.2f} "
              f"{pct(res['blowout'])}")

print()
print("=" * 74)
print("EKSPERIMENT B: Stat-paritet  (+20 point i EN stat, ellers jaevnbyrdigt)")
print("  Maal: de tre sejrsrater skal vaere (naesten) ens")
print("=" * 74)
for p_konv in GRID:
    p_mid = p_konv / 2
    print(f"\n  p_konv={p_konv}  p_mid={p_mid}")
    base_res = run(team(), team(), p_mid, p_konv, n=50000)
    print(f"    baseline (symmetri-tjek): sejr {pct(base_res['win'])}, "
          f"uafgjort {pct(base_res['draw'])}")
    for navn, boosted in [
        ("ANG+20", team(ang=BASE + 20)),
        ("MID+20", team(mid=BASE + 20)),
        ("FOR+20", team(forsvar=BASE + 20)),
    ]:
        res = run(boosted, team(), p_mid, p_konv, n=50000)
        print(f"    {navn}: sejr {pct(res['win'])}  "
              f"(delta {100 * (res['win'] - base_res['win']):+.1f} pp)")

print()
print("=" * 74)
print("EKSPERIMENT C: Resultatfordeling (mest almindelige slutresultater)")
print("=" * 74)
for p_konv in GRID:
    p_mid = p_konv / 2
    for label, fav in [("jaevnbyrdig", team()),
                       ("+20% favorit", team(BASE * 1.2, BASE * 1.2, BASE * 1.2))]:
        res = run(fav, team(), p_mid, p_konv, n=30000)
        top = res["scores"].most_common(8)
        zero = res["scores"][(0, 0)] / res["n"]
        line = "  ".join(f"{a}-{b}: {100 * c / res['n']:.1f}%" for (a, b), c in top)
        print(f"\n  p_konv={p_konv}, {label}  (0-0: {pct(zero)})")
        print(f"    {line}")

print()
print("Faerdig. Juster GRID/RATIOS/K oeverst for videre tuning.")
