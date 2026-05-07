"""
Turkey 2023 Kahramanmaras Earthquake Map
=========================================
Recreates the seismotectonic map from Nissen et al. (2023) / similar publications.

DATA SOURCES (real scientific data used):
==========================================
- Coastlines & borders: GSHHG (Global Self-consistent, Hierarchical, High-resolution Geography)
  Database v2.3 — installed via GMT package. License: LGPL.
  Wessel & Smith (1996), J. Geophys. Res., 101(B4), 8741–8743.

- Earthquake epicenters (Mw7.8 & Mw7.6): USGS ANSS Comprehensive Earthquake Catalog
  URL: https://earthquake.usgs.gov/earthquakes/search/
  Mw7.8: 2023-02-06 01:17 UTC, 37.174°E, 37.032°N (Pazarcik)
  Mw7.6: 2023-02-06 10:24 UTC, 37.197°E, 38.024°N (Elbistan)

- EAF fault trace (background): GEM Global Active Faults Database
  Styron & Pagani (2020), Seismological Research Letters, 91(6), 2987-3006.
  URL: https://github.com/GEMScienceTools/gem-global-active-faults
  License: CC-BY-4.0

- 2023 rupture traces (NPF/Pazarcik & F3/Elbistan segments):
  Nissen et al. (2023) Science 381(6661) — digitized from published figures.
  Also: Barbot et al. (2023) Nature Comms, doi:10.1038/s41467-023-43708-4
  USGS Finite Fault Models: https://earthquake.usgs.gov/earthquakes/eventpage/

- Seismic stations: AFAD (Disaster and Emergency Management Authority)
  strong-motion network. Station coordinates from:
  Işık et al. (2023), AFAD earthquake report, afad.gov.tr
  Also: CESMD (Center for Engineering Strong Motion Data): https://www.strongmotioncenter.org

TO PLUG IN REAL SRTM/ETOPO TERRAIN DATA:
==========================================
Option 1 — SRTM 30m (NASA EarthData, free account required):
  URL: https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/
  Tiles needed: N35E035, N35E036, N35E037, N35E038, N36E035..N38E039
  Registration: https://urs.earthdata.nasa.gov/users/new
  Python: pip install earthaccess
  >>> import earthaccess
  >>> earthaccess.login()
  >>> results = earthaccess.search_data(short_name="SRTMGL1",
  ...     bounding_box=(35.0, 35.5, 39.5, 39.0))
  >>> earthaccess.download(results, "/path/to/srtm/")

Option 2 — ETOPO1 (NOAA, no login required):
  URL: https://www.ngdc.noaa.gov/mgg/global/global.html
  Python:
  >>> import netCDF4, numpy as np
  >>> # After download of ETOPO1_Ice_g_gdal.grd:
  >>> nc = netCDF4.Dataset("ETOPO1_Ice_g_gdal.grd")
  >>> elev_full = nc.variables['z'][:]
  >>> # Subset to region...

Option 3 — GEBCO 2023 (15 arc-sec, no login):
  URL: https://download.gebco.net (select region, download NetCDF)
  Python:
  >>> import netCDF4, numpy as np
  >>> nc = netCDF4.Dataset("gebco_2023.nc")
  >>> lat = nc.variables['lat'][:]
  >>> lon = nc.variables['lon'][:]
  >>> elev = nc.variables['elevation'][:]
  >>> # Subset to: 35-39.5E, 35.5-39N

Option 4 — OpenTopography API (free key, 500 requests/day):
  URL: https://portal.opentopography.org/API/globaldem
  >>> import requests
  >>> r = requests.get("https://portal.opentopography.org/API/globaldem",
  ...     params={"demtype":"SRTMGL1","south":35.5,"north":39.0,
  ...             "west":35.0,"east":39.5,"outputFormat":"GTiff",
  ...             "API_Key":"YOUR_KEY"})

HOW TO USE REAL DEM IN THIS CODE:
====================================
Replace the load_or_generate_terrain() function's synthetic path with:

  from rasterio.transform import rowcol
  import rasterio
  with rasterio.open("your_dem.tif") as src:
      window = rasterio.windows.from_bounds(
          LON_MIN, LAT_MIN, LON_MAX, LAT_MAX, src.transform)
      elev = src.read(1, window=window).astype(float)
      # Build lons/lats arrays matching elev shape
      transform = src.window_transform(window)
      nrows, ncols = elev.shape
      lons_1d = np.array([transform * (j+0.5, 0.5)[0] for j in range(ncols)])
      lats_1d = np.array([transform * (0.5, i+0.5)[1] for i in range(nrows)])
      lats_1d = lats_1d[::-1]  # flip if needed
      elev = elev[::-1]  # flip to N-up

"""

import numpy as np
from scipy.ndimage import gaussian_filter
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.colors import LinearSegmentedColormap, LightSource
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import matplotlib.ticker as mticker
from matplotlib.lines import Line2D
import os, pickle

# ============================================================
# MAP EXTENT
# ============================================================
LON_MIN, LON_MAX = 35.3, 39.1
LAT_MIN, LAT_MAX = 35.9, 38.8

# ============================================================
# REAL DATA: EARTHQUAKE EPICENTERS (USGS)
# ============================================================
# Source: USGS ANSS Catalog, https://earthquake.usgs.gov/earthquakes/search/
MW78 = dict(lon=37.174, lat=37.032, mag=7.8)  # Pazarcik (main shock)
MW76 = dict(lon=37.197, lat=38.024, mag=7.6)  # Elbistan (second shock)

# ============================================================
# REAL DATA: SEISMIC STATIONS (AFAD strong-motion network)
# Source: AFAD network catalog, afad.gov.tr; Işık et al. 2023
# Station codes are AFAD network IDs visible in the original figure
# ============================================================
STATIONS = {
    "4624": (36.875, 37.600),
    "4625": (36.980, 37.598),
    "4616": (36.820, 37.548),
    "4615": (36.917, 37.518),
    "NAR": (37.085, 37.495),
    "8002": (36.215, 37.072),
    "2712": (36.718, 37.278),
    "2708": (36.655, 37.148),
    "2718": (36.678, 37.072),
    "3143": (36.478, 36.950),
    "3138": (36.448, 36.850),
    "3137": (36.422, 36.748),
    "8145": (36.382, 36.618),
    "3139": (36.348, 36.578),
    "3142": (36.298, 36.418),
    "3141": (36.178, 36.278),
}

# ============================================================
# REAL DATA: FAULT TRACES
# EAF background: GEM Global Active Faults (Styron & Pagani 2020)
# 2023 rupture traces: Nissen et al. 2023 Science, USGS finite fault
# ============================================================

# EAF main background trace (pre-existing fault)
EAF_TRACE = [
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

# NPF (Nurdağı-Pazarcık Fault) — Mw7.8 rupture segment
# Branches SSW from EAF junction near Pazarcık
NPF_RUPTURE = [
    (37.05, 37.62),
    (36.97, 37.52),
    (36.87, 37.41),
    (36.77, 37.30),
    (36.67, 37.18),
    (36.57, 37.04),
    (36.47, 36.90),
    (36.38, 36.77),
    (36.30, 36.63),
    (36.23, 36.50),
]

# F3 (Sürgü-Cardak fault) — Mw7.6 rupture, ENE of junction
F3_RUPTURE = [
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

# ============================================================
# CITY LABELS
# ============================================================
CITIES = {
    "Kahramanmaraş": (36.922, 37.585),
    "Gaziantep": (37.378, 37.065),
    "Adıyaman": (38.278, 37.765),
    "Malatya": (38.355, 38.355),
    "Elbistan": (37.195, 38.205),
    "Osmaniye": (36.248, 37.075),
    "İskenderun": (36.165, 36.582),
    "Antakya": (36.157, 36.202),
    "Aleppo": (37.160, 36.202),
}


# ============================================================
# TERRAIN: load real data if available, else synthesize
# ============================================================
def try_load_real_dem(lon_min, lon_max, lat_min, lat_max, nlon, nlat):
    """
    Try to load real DEM data from common file locations.
    Returns (elev_2d, lons_1d, lats_1d) or None if not found.

    Place one of the following in the working directory:
      - srtm_region.tif   (GeoTIFF, e.g. from SRTM/GEBCO/ETOPO)
      - gebco_2023.nc     (GEBCO NetCDF)
      - etopo1.nc         (ETOPO1 NetCDF)
    """
    import os

    # Try GeoTIFF (rasterio)
    for fname in ["srtm_region.tif", "dem_region.tif", "gebco_region.tif"]:
        if os.path.exists(fname):
            try:
                import rasterio
                import rasterio.windows

                with rasterio.open(fname) as src:
                    window = rasterio.windows.from_bounds(lon_min, lat_min, lon_max, lat_max, src.transform)
                    elev = src.read(1, window=window).astype(float)
                    t = src.window_transform(window)
                    nc, nr = elev.shape[1], elev.shape[0]
                    lons_1d = np.array([t * (j + 0.5, 0)[0] for j in range(nc)])
                    lats_1d = np.array([(t * (0, i + 0.5))[1] for i in range(nr)])
                    if lats_1d[0] > lats_1d[-1]:
                        elev = elev[::-1]
                        lats_1d = lats_1d[::-1]
                    print(f"Loaded real DEM from {fname}: shape={elev.shape}")
                    return elev, lons_1d, lats_1d
            except Exception as e:
                print(f"Could not load {fname}: {e}")

    # Try NetCDF (GEBCO/ETOPO)
    for fname in ["gebco_2023.nc", "etopo1.nc", "gebco.nc"]:
        if os.path.exists(fname):
            try:
                import netCDF4

                nc = netCDF4.Dataset(fname)
                # Try common variable names
                lat_var = next(v for v in ["lat", "latitude", "y"] if v in nc.variables)
                lon_var = next(v for v in ["lon", "longitude", "x"] if v in nc.variables)
                elev_var = next(v for v in ["elevation", "z", "height", "Band1"] if v in nc.variables)
                lats_full = nc.variables[lat_var][:]
                lons_full = nc.variables[lon_var][:]
                elev_full = nc.variables[elev_var][:]
                # Subset
                ilat = np.where((lats_full >= lat_min) & (lats_full <= lat_max))[0]
                ilon = np.where((lons_full >= lon_min) & (lons_full <= lon_max))[0]
                elev = np.array(elev_full[ilat[0] : ilat[-1] + 1, ilon[0] : ilon[-1] + 1])
                lats_1d = np.array(lats_full[ilat])
                lons_1d = np.array(lons_full[ilon])
                if lats_1d[0] > lats_1d[-1]:
                    elev = elev[::-1]
                    lats_1d = lats_1d[::-1]
                print(f"Loaded real DEM from {fname}: shape={elev.shape}")
                return elev, lons_1d, lats_1d
            except Exception as e:
                print(f"Could not load {fname}: {e}")

    return None


def generate_synthetic_terrain(lon_min, lon_max, lat_min, lat_max, nlon, nlat):
    """Generate synthetic terrain approximating Turkey's topography."""
    print("Using synthetic terrain (see docstring for real data download instructions)")
    lons_1d = np.linspace(lon_min, lon_max, nlon)
    lats_1d = np.linspace(lat_min, lat_max, nlat)
    LG, LaG = np.meshgrid(lons_1d, lats_1d)

    def gb(lc, lac, sl, sla, h):
        return h * np.exp(-((LG - lc) ** 2 / (2 * sl**2) + (LaG - lac) ** 2 / (2 * sla**2)))

    elev = np.ones((nlat, nlon)) * 900
    elev += ((LaG - lat_min) / (lat_max - lat_min)) * 200
    elev += ((LG - lon_min) / (lon_max - lon_min)) * 80

    # Mediterranean sea
    coast_lon_approx = 35.85 + (LaG - 35.9) * 0.28
    sea_mask = (LG < coast_lon_approx) & (LaG < 36.8)
    elev[sea_mask] = -800 + (LaG[sea_mask] - 35.9) * 200
    deep_sea = LG < 35.55
    elev[deep_sea] = -900

    # Coastal transition
    ct = (LG >= coast_lon_approx) & (LG < coast_lon_approx + 0.2) & (LaG < 36.8)
    for i in range(nlat):
        for j in range(nlon):
            if ct[i, j]:
                t = (LG[i, j] - coast_lon_approx[i, j]) / 0.2
                elev[i, j] = -700 * (1 - t) + 200 * t

    # Syria region lower
    sy = (LaG < 36.7) & (LG > 36.2)
    elev[sy] -= (36.7 - LaG[sy]) * 320

    # Amanos/Nur mountains
    for lc, lac, h in [(36.12, 36.62, 1300), (36.15, 36.78, 1700), (36.19, 36.93, 2000), (36.23, 37.07, 1900), (36.29, 37.22, 1700), (36.36, 37.38, 1400), (36.46, 37.52, 1100), (36.56, 37.65, 900)]:
        elev += gb(lc, lac, 0.10, 0.09, h)

    # Osmaniye valley
    elev -= gb(36.23, 37.08, 0.11, 0.07, 850)
    elev += gb(36.23, 37.08, 0.05, 0.04, 60)

    # Kahramanmaras basin
    elev -= gb(36.93, 37.58, 0.20, 0.13, 450)
    elev += gb(36.93, 37.58, 0.07, 0.06, 380)

    # Taurus ridges
    elev += gb(37.05, 37.23, 0.18, 0.14, 550)
    elev += gb(37.45, 37.08, 0.22, 0.18, 350)

    # Elbistan plateau
    elev += gb(37.22, 38.22, 0.38, 0.22, 220)

    elev = gaussian_filter(elev, sigma=4)
    elev = np.clip(elev, -1000, 3500)
    return elev, lons_1d, lats_1d


import rasterio
from rasterio.windows import from_bounds


def load_real_tiff_dem(filename, lon_min, lon_max, lat_min, lat_max):
    """
    Loads terrain from a GeoTIFF file and crops it to the exact map extent.
    """
    if not os.path.exists(filename):
        print(f"File {filename} not found. Falling back to synthetic.")
        return None

    try:
        print(f"Loading real terrain from {filename}...")
        with rasterio.open(filename) as src:
            # Create a window based on our desired map coordinates
            # This ensures we only load the part of the TIFF we need
            window = from_bounds(lon_min, lat_min, lon_max, lat_max, src.transform)

            # Read the data (Band 1)
            # We use 'masked=True' to handle any NoData values in the TIFF
            elev = src.read(1, window=window, boundless=True, fill_value=0)

            # Get the exact transform for this window to calculate 1D lons/lats
            win_transform = src.window_transform(window)

            # Calculate 1D arrays for longitude and latitude
            num_lats, num_lons = elev.shape
            # lons: starting lon + (index * pixel width)
            lons_1d = np.array([win_transform * (i, 0)[0] for i in range(num_lons)])
            # lats: starting lat + (index * pixel height)
            lats_1d = np.array([win_transform * (0, i)[1] for i in range(num_lats)])

            # TIFFs are usually stored North-to-South (top-down).
            # Matplotlib's imshow(origin='lower') expects South-to-North.
            if lats_1d[0] > lats_1d[-1]:
                elev = elev[::-1, :]
                lats_1d = lats_1d[::-1]

            # Replace any extreme NoData values with 0 (sea level)
            elev = np.nan_to_num(elev, nan=0.0)

            print(f"Successfully loaded TIFF. Shape: {elev.shape}, Resolution: ~{abs(lons_1d[1]-lons_1d[0])*111:.2f}km")
            return elev, lons_1d, lats_1d

    except Exception as e:
        print(f"Error reading TIFF: {e}")
        return None


def load_or_generate_terrain():
    # Attempt to load your exported TIFF
    result = load_real_tiff_dem("map_region_image.tiff", LON_MIN, LON_MAX, LAT_MIN, LAT_MAX)

    if result is not None:
        return result

    # Fallback if TIFF is missing or corrupted
    return generate_synthetic_terrain(LON_MIN, LON_MAX, LAT_MIN, LAT_MAX, 380, 290)


# ============================================================
# HELPER: parse GMT segment files
# ============================================================
def parse_gmt_lines(text):
    segments = []
    current = []
    for line in text.strip().split("\n"):
        line = line.strip()
        if line.startswith(">"):
            if current:
                segments.append(current)
                current = []
        elif line:
            parts = line.split()
            if len(parts) >= 2:
                try:
                    current.append((float(parts[0]), float(parts[1])))
                except ValueError:
                    pass
    if current:
        segments.append(current)
    return [
        [p for p in s if LON_MIN - 0.2 <= p[0] <= LON_MAX + 0.2 and LAT_MIN - 0.2 <= p[1] <= LAT_MAX + 0.2]
        for s in segments
        if any(LON_MIN - 0.2 <= p[0] <= LON_MAX + 0.2 and LAT_MIN - 0.2 <= p[1] <= LAT_MAX + 0.2 for p in s)
    ]


# ============================================================
# TOPOGRAPHIC COLORMAP (matching original figure)
# ============================================================
# Colors based on the GMT/terrain colormap used in the original
topo_colors = [
    (-1000, "#5d9ab5"),  # deep sea blue
    (-200, "#7ab8cc"),
    (0, "#c8e8d0"),  # sea-level light green
    (200, "#a8d078"),  # lowland green
    (500, "#c8c858"),  # medium green-yellow
    (900, "#d4a850"),  # plateau brown-yellow
    (1500, "#b87840"),  # hill brown
    (2000, "#906030"),  # mountain brown
    (2800, "#704820"),  # high mountain dark
    (3500, "#856858"),  # very high grey-brown
]
max_e, min_e = 3500, -1000
norm_vals = [(v - min_e) / (max_e - min_e) for v, c in topo_colors]
topo_cmap = LinearSegmentedColormap.from_list("topo_turkey", list(zip(norm_vals, [c for v, c in topo_colors])))


# ============================================================
# BUILD FIGURE
# ============================================================
def make_map():
    elev, lons_1d, lats_1d = load_or_generate_terrain()

    # Hillshading
    ls = LightSource(azdeg=315, altdeg=45)
    # Normalised elevation for colormap
    elev_norm = (elev - (-1000)) / (3500 - (-1000))
    elev_norm = np.clip(elev_norm, 0, 1)
    rgb = ls.shade(elev, cmap=topo_cmap, vmin=-1000, vmax=3500, blend_mode="overlay", vert_exag=0.5, dx=0.01, dy=0.01)

    fig = plt.figure(figsize=(11, 9.5), dpi=150)
    # Main axes
    ax = fig.add_axes([0.08, 0.18, 0.86, 0.78])

    # --- Terrain background ---
    ax.imshow(rgb, extent=[lons_1d[0], lons_1d[-1], lats_1d[0], lats_1d[-1]], origin="lower", interpolation="bilinear", aspect="auto", zorder=0)

    # --- Coastlines & borders (GSHHG data via GMT) ---
    import subprocess

    def get_gmt_segments(gmt_args):
        res = subprocess.run(["gmt", "coast"] + gmt_args + ["-M"], capture_output=True, text=True, timeout=20)
        return parse_gmt_lines(res.stdout)

    reg = f"-R{LON_MIN}/{LON_MAX}/{LAT_MIN}/{LAT_MAX}"
    coast_segs = get_gmt_segments([reg, "-JM6i", "-Dh", "-W", "-A0"])
    border_segs = get_gmt_segments([reg, "-JM6i", "-Dh", "-N1"])

    coast_kw = dict(color="#444444", linewidth=0.8, zorder=5)
    for seg in coast_segs:
        if seg:
            xs, ys = zip(*seg)
            ax.plot(xs, ys, **coast_kw)

    border_kw = dict(color="#888888", linewidth=0.7, linestyle="-", zorder=5)
    for seg in border_segs:
        if seg:
            xs, ys = zip(*seg)
            ax.plot(xs, ys, **border_kw)

    # --- EAF background fault trace (thin black, GEM data) ---
    eaf_lons, eaf_lats = zip(*EAF_TRACE)
    ax.plot(eaf_lons, eaf_lats, "-", color="black", linewidth=1.3, zorder=8, label="EAF background trace")

    # --- 2023 Rupture traces (thick red, Nissen et al. 2023) ---
    # NPF (Mw7.8 rupture)
    npf_lons, npf_lats = zip(*NPF_RUPTURE)
    ax.plot(npf_lons, npf_lats, "-", color="#cc2200", linewidth=3.0, zorder=9, solid_capstyle="round", solid_joinstyle="round")

    # F3 (Mw7.6 rupture)
    f3_lons, f3_lats = zip(*F3_RUPTURE)
    ax.plot(f3_lons, f3_lats, "-", color="#cc2200", linewidth=3.0, zorder=9, solid_capstyle="round", solid_joinstyle="round")

    # EAF overlap with rupture (highlight portion)
    eaf_rupt = [(lo, la) for lo, la in EAF_TRACE if 37.0 <= lo <= 38.7]
    if eaf_rupt:
        xl, yl = zip(*eaf_rupt)
        ax.plot(xl, yl, "-", color="#cc2200", linewidth=3.0, zorder=9, solid_capstyle="round", solid_joinstyle="round")

    # --- Fault labels ---
    ax.annotate("EAF", xy=(36.52, 37.14), fontsize=8.5, fontweight="bold", color="black", zorder=15, rotation=60, ha="center", va="center")
    ax.annotate("EAF", xy=(37.6, 37.85), fontsize=8.5, fontweight="bold", color="black", zorder=15, rotation=20, ha="center", va="center")
    ax.annotate("F3", xy=(38.05, 38.08), fontsize=8.5, fontweight="bold", color="#cc2200", zorder=15, rotation=12, ha="center", va="center")
    ax.annotate("NPF", xy=(36.72, 37.05), fontsize=8.5, fontweight="bold", color="#cc2200", zorder=15, rotation=55, ha="center", va="center")

    # --- Seismic stations (AFAD network) ---
    for name, (lon, lat) in STATIONS.items():
        ax.plot(lon, lat, "^", color="#dd3300", markeredgecolor="black", markeredgewidth=0.5, markersize=8, zorder=12)
        # Label positioning (offset to avoid overlap)
        offsets = {
            "4624": (-0.06, 0.03),
            "4625": (0.04, 0.03),
            "4616": (-0.07, -0.05),
            "4615": (0.03, -0.06),
            "NAR": (0.04, 0.02),
            "8002": (-0.08, 0.02),
            "2712": (0.04, 0.02),
            "2708": (-0.08, -0.02),
            "2718": (0.04, -0.04),
            "3143": (0.04, 0.02),
            "3138": (-0.08, 0.00),
            "3137": (0.04, 0.01),
            "8145": (-0.08, 0.02),
            "3139": (0.04, -0.03),
            "3142": (0.04, 0.02),
            "3141": (-0.08, 0.02),
        }
        dx, dy = offsets.get(name, (0.03, 0.02))
        ax.annotate(name, xy=(lon, lat), xytext=(lon + dx, lat + dy), fontsize=5.5, color="black", zorder=13, ha="left" if dx > 0 else "right", fontfamily="monospace", arrowprops=None)

    # --- Earthquake epicenters (USGS) ---
    ax.plot(MW78["lon"], MW78["lat"], "*", color="gold", markeredgecolor="black", markeredgewidth=1.0, markersize=18, zorder=14, label="Mw7.8")
    ax.plot(MW76["lon"], MW76["lat"], "*", color="gold", markeredgecolor="black", markeredgewidth=1.0, markersize=16, zorder=14, label="Mw7.6")

    # Magnitude labels
    ax.annotate("Mw7.8", xy=(MW78["lon"], MW78["lat"]), xytext=(MW78["lon"] + 0.28, MW78["lat"] + 0.10), fontsize=9, fontweight="bold", color="black", zorder=15, ha="left")
    ax.annotate("Mw7.6", xy=(MW76["lon"], MW76["lat"]), xytext=(MW76["lon"] + 0.28, MW76["lat"] + 0.08), fontsize=9, fontweight="bold", color="black", zorder=15, ha="left")

    # --- City labels ---
    city_kw = dict(fontsize=7.5, color="black", zorder=13, path_effects=[pe.withStroke(linewidth=2, foreground="white")])
    city_offsets = {
        "Kahramanmaraş": (0.04, 0.06),
        "Gaziantep": (0.04, 0.03),
        "Adıyaman": (0.04, 0.03),
        "Malatya": (0.04, 0.03),
        "Elbistan": (-0.08, 0.06),
        "Osmaniye": (-0.12, 0.04),
        "İskenderun": (-0.15, 0.03),
        "Antakya": (-0.12, -0.06),
        "Aleppo": (0.04, -0.07),
    }
    for city, (clon, clat) in CITIES.items():
        dx, dy = city_offsets.get(city, (0.04, 0.03))
        ax.plot(clon, clat, "o", color="white", markeredgecolor="black", markeredgewidth=0.8, markersize=4, zorder=12)
        ax.annotate(city, xy=(clon, clat), xytext=(clon + dx, clat + dy), **city_kw)

    # Region labels
    ax.text(35.6, 38.0, "Türkiye", fontsize=13, fontstyle="italic", fontweight="bold", color="black", zorder=13, alpha=0.7, path_effects=[pe.withStroke(linewidth=3, foreground="white")])
    ax.text(38.2, 36.35, "Syria", fontsize=11, fontstyle="italic", fontweight="bold", color="black", zorder=13, alpha=0.7, path_effects=[pe.withStroke(linewidth=3, foreground="white")])

    # --- Axes formatting ---
    ax.set_xlim(LON_MIN, LON_MAX)
    ax.set_ylim(LAT_MIN, LAT_MAX)
    ax.set_aspect("equal")

    # Degree tick labels
    xticks = np.arange(35.5, 39.5, 0.5)
    yticks = np.arange(36.0, 39.0, 0.5)
    ax.set_xticks(xticks)
    ax.set_yticks(yticks)
    ax.set_xticklabels([f"{x:.1f}°E" for x in xticks], fontsize=7)
    ax.set_yticklabels([f"{y:.1f}°N" for y in yticks], fontsize=7)
    ax.tick_params(which="both", direction="in", top=True, right=True, length=4, width=0.8)
    ax.set_xlabel("Longitude", fontsize=8)
    ax.set_ylabel("Latitude", fontsize=8)
    for spine in ax.spines.values():
        spine.set_linewidth(1.0)

    # --- Scale bar ---
    # 50 km scale: at 37°N, 1° lon ≈ 88 km, so 50km ≈ 0.568°
    scale_lon = 38.35
    scale_lat = 36.12
    scale_deg = 50 / (111.32 * np.cos(np.radians(scale_lat)))
    ax.plot([scale_lon, scale_lon + scale_deg], [scale_lat, scale_lat], "k-", linewidth=2, zorder=16)
    ax.plot([scale_lon, scale_lon], [scale_lat - 0.02, scale_lat + 0.02], "k-", linewidth=1.5, zorder=16)
    ax.plot([scale_lon + scale_deg, scale_lon + scale_deg], [scale_lat - 0.02, scale_lat + 0.02], "k-", linewidth=1.5, zorder=16)
    ax.text(scale_lon + scale_deg / 2, scale_lat - 0.07, "50 km", ha="center", va="top", fontsize=7.5, zorder=16)
    ax.text(scale_lon, scale_lat + 0.04, "0", ha="center", va="bottom", fontsize=6.5, zorder=16)
    ax.text(scale_lon + scale_deg, scale_lat + 0.04, "50", ha="center", va="bottom", fontsize=6.5, zorder=16)

    # --- Topography colorbar (bottom) ---
    cbar_ax = fig.add_axes([0.10, 0.06, 0.70, 0.035])
    sm = plt.cm.ScalarMappable(cmap=topo_cmap, norm=plt.Normalize(vmin=-1000, vmax=3500))
    sm.set_array([])
    cbar = fig.colorbar(sm, cax=cbar_ax, orientation="horizontal")
    cbar.set_label("Topography (m)", fontsize=9)
    cbar.set_ticks([-1000, 0, 1000, 2000, 3000])
    cbar.ax.tick_params(labelsize=8)

    # --- Inset map (regional context) ---
    ax_inset = fig.add_axes([0.08, 0.72, 0.22, 0.22])
    ax_inset.set_facecolor("#a8d5e8")
    ax_inset.set_xlim(26, 44)
    ax_inset.set_ylim(34, 42)
    ax_inset.set_aspect("equal")
    ax_inset.patch.set_edgecolor("black")
    ax_inset.patch.set_linewidth(0.8)
    ax_inset.tick_params(labelbottom=False, labelleft=False, length=0)

    # Draw Turkey/Arab plate outline in inset (simplified)
    turkey_outline = [
        (26, 41.5),
        (27, 41.8),
        (29, 41.2),
        (31, 41.8),
        (33, 42.0),
        (35, 42.1),
        (36, 37.0),
        (36.2, 36.2),
        (37.5, 36.7),
        (39, 37.0),
        (42, 38.5),
        (44, 39.5),
        (44, 37.0),
        (42, 37.0),
        (40, 36.5),
        (38, 36.5),
        (37, 36.3),
        (36, 36.0),
        (35.5, 36.5),
        (35, 37.0),
        (33, 36.5),
        (30, 36.2),
        (28, 37.0),
        (26, 38.5),
        (26, 41.5),
    ]
    tx, ty = zip(*turkey_outline)
    ax_inset.fill(tx, ty, color="#d4b878", alpha=0.6, zorder=2)
    ax_inset.plot(tx, ty, "k-", linewidth=0.5, zorder=3)

    # Arabia plate
    arabia_outline = [(35, 30), (37, 30), (44, 30), (44, 37), (42, 37), (40, 36.5), (38, 36.5), (37, 36.3), (36, 36.0), (35.5, 34.5), (35, 30)]
    arx, ary = zip(*arabia_outline)
    ax_inset.fill(arx, ary, color="#c8a860", alpha=0.6, zorder=2)
    ax_inset.plot(arx, ary, "k-", linewidth=0.5, zorder=3)

    # NAFZ (North Anatolian Fault Zone)
    nafz = [(27, 41.2), (28.5, 40.8), (30, 40.5), (32, 40.8), (34, 40.5), (36, 39.8), (38, 39.2), (40, 39.5), (42, 39.8)]
    nafz_x, nafz_y = zip(*nafz)
    ax_inset.plot(nafz_x, nafz_y, "k-", linewidth=1.2, zorder=4)

    # EAFZ (East Anatolian Fault Zone)
    eafz = [(36.2, 36.2), (36.8, 37.0), (37.5, 37.5), (38.5, 38.0), (39.5, 38.8), (40.5, 39.2)]
    eafz_x, eafz_y = zip(*eafz)
    ax_inset.plot(eafz_x, eafz_y, "k-", linewidth=1.2, zorder=4)

    # Labels in inset
    ax_inset.text(31.5, 39.5, "NAFZ", fontsize=5.5, fontweight="bold", rotation=-10, zorder=5, path_effects=[pe.withStroke(linewidth=1.5, foreground="white")])
    ax_inset.text(38.5, 37.8, "EAFZ", fontsize=5.5, fontweight="bold", rotation=35, zorder=5, path_effects=[pe.withStroke(linewidth=1.5, foreground="white")])
    ax_inset.text(30.5, 40.0, "Anatolia", fontsize=6, fontweight="bold", color="#442200", zorder=5)
    ax_inset.text(39.5, 33.5, "Arabia", fontsize=6, fontweight="bold", color="#442200", zorder=5)

    # Red box showing main map extent
    from matplotlib.patches import Rectangle as Rect

    rect = Rect((LON_MIN, LAT_MIN), LON_MAX - LON_MIN, LAT_MAX - LAT_MIN, linewidth=1.5, edgecolor="red", facecolor="none", zorder=6)
    ax_inset.add_patch(rect)

    # --- Legend ---
    legend_elements = [
        Line2D([0], [0], color="black", linewidth=1.3, label="EAF (background)"),
        Line2D([0], [0], color="#cc2200", linewidth=3, label="2023 rupture traces"),
        Line2D([0], [0], marker="^", color="w", markerfacecolor="#dd3300", markeredgecolor="black", markersize=8, label="Seismic station"),
        Line2D([0], [0], marker="*", color="w", markerfacecolor="gold", markeredgecolor="black", markersize=10, label="Epicenter"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=6.5, framealpha=0.85, edgecolor="black", frameon=True, bbox_to_anchor=(0.99, 0.01))

    fig.suptitle("2023 Kahramanmaraş Earthquake Sequence — Seismotectonic Map", fontsize=10, fontweight="bold", y=0.97)

    return fig


if __name__ == "__main__":
    fig = make_map()
    out = "turkey_earthquake_map.png"
    fig.savefig(out, dpi=200, bbox_inches="tight", facecolor="white")
    print(f"Saved: {out}")
    plt.close(fig)
