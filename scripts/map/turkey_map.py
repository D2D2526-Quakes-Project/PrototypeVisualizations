import json, math, os
import numpy as np
from PIL import Image, ImageFilter
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.colors import to_rgba, LinearSegmentedColormap
from matplotlib.lines import Line2D
import matplotlib.ticker as mticker
from scipy.ndimage import uniform_filter

MAP_LON_W, MAP_LON_E = 35.25, 39.15
MAP_LAT_S, MAP_LAT_N = 35.85, 38.85


# ── SATELLITE BACKGROUND ────────────────────────────────────────
def tile_bounds(x, y, z=8):
    def tlon(tx):
        return tx / 2**z * 360 - 180

    def tlat(ty):
        n = math.pi - 2 * math.pi * ty / 2**z
        return math.degrees(math.atan(math.sinh(n)))

    return tlon(x), tlat(y + 1), tlon(x + 1), tlat(y)


tile_dir = "./ImageTiles"
x_tiles = list(range(152, 156))
y_tiles = list(range(97, 104))
vm = {  #
    #
    97: "(3)",  # top
    98: "(1)",  # top-1
    99: "base",  # bottom+1
    100: "(2)",  # bottom
    101: "base",  # 1
    102: "base",  # 1
    103: "base",  # 1
}

mosaic = Image.new("RGB", (len(x_tiles) * 256, len(y_tiles) * 256))
for row, ty in enumerate(y_tiles):
    var = vm[ty]
    for col, tx in enumerate(x_tiles):
        fname = f"{tx}.jpeg" if var == "base" else f"{tx} {var}.jpeg"
        p = os.path.join(tile_dir, fname)
        if os.path.exists(p):
            mosaic.paste(Image.open(p), (col * 256, row * 256))

mW = tile_bounds(x_tiles[0], y_tiles[0])[0]
mE = tile_bounds(x_tiles[-1], y_tiles[-1])[2]
mS = tile_bounds(x_tiles[0], y_tiles[-1])[1]
mN = tile_bounds(x_tiles[0], y_tiles[0])[3]
mw, mh = mosaic.size


def l2px(lon):
    return int((lon - mW) / (mE - mW) * mw)


def t2px(lat):
    return int((mN - lat) / (mN - mS) * mh)


# Crop with a tiny overlap to hide seam edges, then gaussian blur seams
bg_arr = np.array(mosaic)

# Blur only horizontal seam bands (every 256 rows)
for seam_row in range(256, mh, 256):
    r0, r1 = max(0, seam_row - 6), min(mh, seam_row + 6)
    bg_arr[r0:r1] = uniform_filter(bg_arr[r0:r1].astype(float), size=(8, 1, 1)).astype(np.uint8)

bg_smooth = Image.fromarray(bg_arr)
bg = bg_smooth.crop((l2px(MAP_LON_W), t2px(MAP_LAT_N), l2px(MAP_LON_E), t2px(MAP_LAT_S)))

# ── LOAD DATA ───────────────────────────────────────────────────
with open("./cont_pga.json") as f:
    pga_data = json.load(f)
with open("./features.json") as f:
    eq_feat = json.load(f)
with open("./stationlist.json") as f:
    sl = json.load(f)

epi_lon, epi_lat = eq_feat["geometry"]["coordinates"][:2]
epi_mag = eq_feat["properties"]["mag"]

stations = [
    s
    for s in sl["features"]
    if s["properties"]["pga"] is not None
    and s["properties"]["network"] in ["TK", "KO", "TU"]
    and MAP_LON_W - 0.3 <= s["geometry"]["coordinates"][0] <= MAP_LON_E + 0.3
    and MAP_LAT_S - 0.3 <= s["geometry"]["coordinates"][1] <= MAP_LAT_N + 0.3
]

# ── FAULT TRACES ────────────────────────────────────────────────
EAF = [
    (36.10, 36.38),
    (36.12, 36.48),
    (36.15, 36.60),
    (36.18, 36.72),
    (36.20, 36.85),
    (36.25, 37.00),
    (36.30, 37.10),
    (36.35, 37.20),
    (36.40, 37.32),
    (36.50, 37.42),
    (36.60, 37.48),
    (36.70, 37.52),
    (36.80, 37.55),
    (36.90, 37.57),
    (36.95, 37.58),
    (37.00, 37.60),
    (37.10, 37.63),
    (37.20, 37.67),
    (37.30, 37.70),
    (37.40, 37.72),
    (37.50, 37.75),
    (37.60, 37.79),
    (37.70, 37.82),
    (37.80, 37.85),
    (37.90, 37.88),
    (38.00, 37.92),
    (38.10, 37.97),
    (38.20, 38.02),
    (38.30, 38.07),
    (38.40, 38.10),
    (38.50, 38.13),
    (38.60, 38.17),
    (38.70, 38.20),
]
NPF = [(37.05, 37.62), (36.97, 37.52), (36.87, 37.41), (36.77, 37.30), (36.67, 37.18), (36.57, 37.04), (36.47, 36.90), (36.38, 36.77), (36.30, 36.63), (36.23, 36.50)]
F3 = [
    (37.08, 37.65),
    (37.18, 37.72),
    (37.28, 37.78),
    (37.38, 37.82),
    (37.48, 37.87),
    (37.58, 37.92),
    (37.68, 37.97),
    (37.78, 38.01),
    (37.88, 38.05),
    (37.98, 38.08),
    (38.08, 38.12),
    (38.18, 38.15),
    (38.28, 38.18),
    (38.38, 38.20),
    (38.48, 38.22),
    (38.58, 38.25),
    (38.68, 38.27),
]
EAF_RUPT = [(lo, la) for lo, la in EAF if lo >= 37.0]


# ── MMI COLOR ───────────────────────────────────────────────────
def mmi_color(v):
    if v < 2:
        return "#aec6f0"
    elif v < 3:
        return "#8eadee"
    elif v < 4:
        return "#80ffff"
    elif v < 5:
        return "#7df894"
    elif v < 6:
        return "#ffff00"
    elif v < 7:
        return "#ffa500"
    elif v < 8:
        return "#ff4500"
    elif v < 9:
        return "#cc0000"
    else:
        return "#800000"


# ── FIGURE ───────────────────────────────────────────────────────
fig = plt.figure(figsize=(13, 10.5), dpi=180)
ax = fig.add_axes([0.06, 0.12, 0.88, 0.84])

ax.imshow(np.array(bg), extent=[MAP_LON_W, MAP_LON_E, MAP_LAT_S, MAP_LAT_N], origin="upper", aspect="auto", zorder=0)

# ── PGA CONTOURS ─────────────────────────────────────────────────
pga_label_pos = {
    0.5: None,
    1: None,
    2: (38.85, 38.55),
    5: (38.85, 38.22),
    10: (38.85, 37.88),
    20: (38.75, 37.52),
    50: (38.40, 37.10),
    100: (36.76, 37.08),
}
for feat in pga_data["features"]:
    p, color, val = feat["properties"], feat["properties"]["color"], feat["properties"]["value"]
    lw = {0.5: 1.2, 1: 1.4, 2: 1.6, 5: 2.0, 10: 2.2, 20: 2.5, 50: 2.8, 100: 3.0}.get(val, 2.0)
    for line in feat["geometry"]["coordinates"]:
        xs = [pt[0] for pt in line]
        ys = [pt[1] for pt in line]
        ax.plot(xs, ys, "-", color=color, linewidth=lw, zorder=6, solid_capstyle="round", alpha=0.97)
    # Label
    pos = pga_label_pos.get(val)
    if pos:
        ax.text(
            pos[0],
            pos[1],
            f"{int(val) if val>=1 else val}%g",
            fontsize=7,
            color="black",
            ha="center",
            va="center",
            fontweight="bold",
            zorder=20,
            bbox=dict(boxstyle="round,pad=0.2", facecolor=color, edgecolor="black", linewidth=0.5, alpha=0.92),
        )

# ── FAULT TRACES ─────────────────────────────────────────────────
# Background EAF (thin black with white stroke)
ex, ey = zip(*EAF)
ax.plot(ex, ey, "-", color="black", linewidth=1.5, zorder=8, path_effects=[pe.Stroke(linewidth=3.0, foreground="white", alpha=0.7), pe.Normal()])

# Rupture traces
RED, DARK = "#cc1100", "#660800"


def plot_rupture(trace, zorder=9):
    rx, ry = zip(*trace)
    ax.plot(rx, ry, "-", color=RED, linewidth=3.5, zorder=zorder, solid_capstyle="round", solid_joinstyle="round", path_effects=[pe.Stroke(linewidth=5.5, foreground=DARK, alpha=0.5), pe.Normal()])


plot_rupture(NPF)
plot_rupture(F3)
plot_rupture(EAF_RUPT)

# Fault label positions
fault_labels = [
    ("NPF", 36.63, 37.06, 62, RED),
    ("EAF", 37.82, 37.90, 20, "black"),
    ("F3", 38.20, 38.15, 13, RED),
]
for lbl, lx, ly, rot, col in fault_labels:
    ax.text(lx, ly, lbl, fontsize=9, fontweight="bold", color=col, rotation=rot, ha="center", va="center", zorder=14, path_effects=[pe.withStroke(linewidth=2.5, foreground="white")])

# ── STATIONS ─────────────────────────────────────────────────────
# Separate close from far for marker sizing
for s in stations:
    g = s["geometry"]["coordinates"]
    lon, lat = g[0], g[1]
    if not (MAP_LON_W <= lon <= MAP_LON_E and MAP_LAT_S <= lat <= MAP_LAT_N):
        continue
    p = s["properties"]
    mmi = p["intensity"] or 0
    col = mmi_color(mmi)
    dist = float(p["distance"]) if p["distance"] else 9999
    ms = 9 if dist < 30 else (7 if dist < 80 else 5.5)
    lw = 0.6 if dist < 80 else 0.4

    ax.plot(lon, lat, "^", color=col, markeredgecolor="black", markeredgewidth=lw, markersize=ms, zorder=12)

# Label stations: TK numeric codes + key KO/TU, within 70 km
labeled_stations = [
    (
        s["geometry"]["coordinates"][0],
        s["geometry"]["coordinates"][1],
        s["properties"]["code"],
        mmi_color(s["properties"]["intensity"] or 0),
        float(s["properties"]["distance"]) if s["properties"]["distance"] else 9999,
    )
    for s in stations
    if s["properties"]["network"] in ("TK", "KO", "TU")
    and s["properties"]["code"]
    in {
        "3145",
        "2712",
        "2708",
        "3142",
        "3143",
        "3138",
        "3144",
        "2718",
        "4615",
        "4632",
        "3139",
        "4629",
        "3137",
        "4616",
        "4630",
        "3146",
        "2716",
        "2717",
        "4624",
        "4620",
        "4611",
        "4618",
        "4617",
        "3116",
        "3124",
        "3115",
        "3123",
        "3132",
        "4408",
        "3134",
        "0201",
        "3136",
        "3133",
        "2703",
        "3135",
        "3129",
        "3131",
        "4612",
        "3112",
        "KHMN",
        "NAR",
        "4625",
        "4626",
    }
    and MAP_LON_W <= s["geometry"]["coordinates"][0] <= MAP_LON_E
    and MAP_LAT_S <= s["geometry"]["coordinates"][1] <= MAP_LAT_N
]

# Smart label placement — right or left depending on x position
for lon, lat, code, col, dist in labeled_stations:
    fs = 5.2 if dist < 30 else 4.5
    dx = 0.045 if lon < 37.5 else -0.045
    ha = "left" if dx > 0 else "right"
    ax.annotate(
        code, xy=(lon, lat), xytext=(lon + dx, lat + 0.025), fontsize=fs, color="black", zorder=16, ha=ha, fontfamily="monospace", path_effects=[pe.withStroke(linewidth=1.8, foreground="white")]
    )

# ── EPICENTER ────────────────────────────────────────────────────
ax.plot(epi_lon, epi_lat, "*", color="yellow", markeredgecolor="black", markeredgewidth=1.2, markersize=24, zorder=18)
ax.text(epi_lon + 0.15, epi_lat - 0.25, f"Mw {epi_mag}", fontsize=11, fontweight="bold", color="white", zorder=19, ha="left", path_effects=[pe.withStroke(linewidth=3.5, foreground="black")])

# ── AXES ─────────────────────────────────────────────────────────
ax.set_xlim(MAP_LON_W, MAP_LON_E)
ax.set_ylim(MAP_LAT_S, MAP_LAT_N)
ax.set_aspect("equal")
xtk = np.arange(35.5, 39.5, 0.5)
ytk = np.arange(36.0, 39.0, 0.5)
ax.set_xticks(xtk)
ax.set_yticks(ytk)
ax.set_xticklabels([f"{x:.1f}°E" for x in xtk], fontsize=8.5)
ax.set_yticklabels([f"{y:.1f}°N" for y in ytk], fontsize=8.5)
ax.tick_params(which="both", direction="in", top=True, right=True, length=5, width=0.9)
for sp in ax.spines.values():
    sp.set_linewidth(1.3)
for xt in xtk:
    ax.axvline(xt, color="white", lw=0.25, alpha=0.35, zorder=1)
for yt in ytk:
    ax.axhline(yt, color="white", lw=0.25, alpha=0.35, zorder=1)

# ── SCALE BAR ────────────────────────────────────────────────────
sl0, sl1 = 37.05, 35.96
deg50 = 50 / (111.32 * math.cos(math.radians(sl1)))
for dy, lw, col in [(0, 4, "white"), (0, 1.5, "black")]:
    ax.plot([sl0, sl0 + deg50], [sl1 + dy, sl1 + dy], "-", color=col, lw=lw, zorder=18)
ax.text(sl0 + deg50 / 2, sl1 - 0.07, "50 km", ha="center", va="top", fontsize=8, fontweight="bold", color="white", zorder=19, path_effects=[pe.withStroke(linewidth=2, foreground="black")])
ax.text(sl0, sl1 + 0.05, "0", ha="center", fontsize=7, color="white", zorder=19, path_effects=[pe.withStroke(linewidth=1.5, foreground="black")])
ax.text(sl0 + deg50, sl1 + 0.05, "50", ha="center", fontsize=7, color="white", zorder=19, path_effects=[pe.withStroke(linewidth=1.5, foreground="black")])

# ── PGA COLORBAR ─────────────────────────────────────────────────
vals = sorted(f["properties"]["value"] for f in pga_data["features"])
colors = {f["properties"]["value"]: f["properties"]["color"] for f in pga_data["features"]}
# Build a discrete colormap from the actual ShakeMap colors
boundaries = [0.25, 0.75, 1.5, 3.5, 7.5, 15, 35, 75, 150]
cmap_colors = [colors[v] for v in vals]
cmap_pga = LinearSegmentedColormap.from_list("pga", list(zip(np.linspace(0, 1, len(cmap_colors)), [to_rgba(c) for c in cmap_colors])))

cax = fig.add_axes([0.06, 0.065, 0.60, 0.030])
sm = plt.cm.ScalarMappable(cmap=cmap_pga, norm=plt.Normalize(0.25, 150))
sm.set_array([])
cb = fig.colorbar(sm, cax=cax, orientation="horizontal", extend="both")
cb.set_label("Peak Ground Acceleration (%g)", fontsize=9, labelpad=2)
cb.set_ticks([0.5, 1, 2, 5, 10, 20, 50, 100])
cb.ax.set_xticklabels(["0.5", "1", "2", "5", "10", "20", "50", "100"], fontsize=8)
cb.ax.tick_params(length=4)
# Color tick marks
for val in vals:
    frac = (val - 0.25) / (150 - 0.25)
    cax.axvline(frac, color=colors[val], linewidth=2.5, zorder=5)

# ── LEGEND ───────────────────────────────────────────────────────
mmi_def = [
    (1, "I (<2)", "#aec6f0"),
    (3, "III (2-4)", "#80ffff"),
    (5, "V (4-6)", "#7df894"),
    (6, "VI (5-7)", "#ffff00"),
    (7, "VII (6-8)", "#ffa500"),
    (8, "VIII (7-9)", "#ff4500"),
    (9, "IX+ (≥8)", "#cc0000"),
]
handles = [Line2D([0], [0], marker="^", color="w", markerfacecolor=c, markeredgecolor="black", markeredgewidth=0.5, markersize=8, label=lbl) for _, lbl, c in mmi_def]
handles += [
    Line2D([0], [0], color="black", lw=1.5, label="EAF (background)"),
    Line2D([0], [0], color=RED, lw=3.5, label="2023 rupture traces"),
    Line2D([0], [0], marker="*", color="w", markerfacecolor="yellow", markeredgecolor="black", ms=13, label=f"Mw {epi_mag} epicenter"),
]
leg = ax.legend(
    handles=handles, loc="lower right", fontsize=7, framealpha=0.90, edgecolor="#555", title="Seismic Intensity (MMI)", title_fontsize=7.5, ncol=1, bbox_to_anchor=(0.998, 0.005), handlelength=1.8
)

# ── TITLE & NOTE ─────────────────────────────────────────────────
ax.set_title("2023 Kahramanmaraş Earthquake — USGS ShakeMap\n" "PGA Contours, Strong-Motion Stations & Fault Rupture Traces", fontsize=11, fontweight="bold", pad=9)
fig.text(
    0.06,
    0.012,
    "PGA contours & station data: USGS ShakeMap (cont_pga.json, stationlist.json, features.json)  ·  " "Fault traces: Nissen et al. 2023 Science; GEM Global Active Faults (Styron & Pagani 2020)",
    fontsize=6.2,
    color="#444",
    ha="left",
    va="bottom",
)

out = "./turkey_shakemap_v2.png"
fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
print(f"Saved: {out}")
plt.close(fig)
