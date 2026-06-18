# Salzburg 3D City Digital Twin

An interactive 3D urban visualization built with **MapLibre GL JS**, demonstrating real-time WebGL-based building extrusion over OpenStreetMap data for Salzburg, Austria.

Built as part of the *Interactive Geospatial Applications* module — MSc Copernicus Master in Digital Earth, Paris Lodron University of Salzburg.

---

## Why This Matters

Cities are growing faster than the people managing them can see.

Urban planners make decisions about building density, infrastructure load, and land use
based on spreadsheets and 2D maps; tools that flatten the very thing they are trying
to understand. A 40-metre commercial block and a 6-metre residential house look identical
on a flat choropleth. They are not identical. The decisions made about them should not be
identical either.

3D Digital Twins change that. When you can see a city as it actually exists — height,
mass, spatial relationship between buildings; you start asking different questions.
Where is the density concentrated? Which neighbourhoods are low-rise and which are
towers? Where does a new development break the skyline?

This application puts those questions in a browser tab, accessible to anyone, with no
installation, no license, no GIS software required. A municipality with no dedicated
GIS team can open this and immediately understand the spatial structure of their city.
A student can explore urban form without downloading a single shapefile.

That is the impact: making spatial intelligence accessible at the point where decisions
are actually made; not in a research lab, but in a meeting room, on a laptop, in
thirty seconds.

---

## Live Demo

🔗 [Live Application](https://mariamushtaq-12.github.io/Real-time-3D-City-Digital-Twin/)

---

## Why MapLibre GL JS?

This project argues that MapLibre GL JS is fundamentally different from Python-based mapping libraries like Folium or basic Leaflet — not just "better", but a different category of technology entirely.

| Capability | MapLibre GL JS | Folium | Leaflet |
|---|---|---|---|
| 3D Building Extrusion | ✓ Native (`fill-extrusion`) | ✗ | ✗ |
| GPU-Accelerated Rendering | ✓ WebGL | ✗ CPU only | ✗ CPU only |
| Real-Time Data Filtering | ✓ GPU-side expressions | ✗ Python rerun | Limited |
| Smooth Camera Animation | ✓ `flyTo()` / `easeTo()` | ✗ | ✗ |
| Runtime Style Swap | ✓ `setStyle()` | ✗ Regenerate HTML | ✗ |
| Data-Driven Styling | ✓ Expression language | Limited | Limited |
| Pitch / Bearing Control | ✓ Full 3D camera | ✗ | ✗ |

> Folium generates a static HTML snapshot from Python. MapLibre renders real geometry on the GPU at 60fps. These are not comparable tools — they solve different problems.

---

## Features

- **Real 3D Buildings** — GPU-extruded from OpenFreeMap vector tiles (OSM data), rendered at 60fps via WebGL
- **View Modes** — Switch between Height Class coloring, Monochrome, and Points of Interest
- **Building Inspector** — Click any building to inspect height, estimated floors, use type, and coordinates
- **Camera Controls** — Pitch and bearing sliders with live map sync; fly to Fortress, Old Town, University, or Overview
- **Atmosphere Presets** — Day, Dusk, and Night basemap swap at runtime without page reload
- **Live Building Count** — Updates as you pan and zoom
- **Coordinate Display** — Real-time lat/lng on mousemove

---

## Technologies

- [MapLibre GL JS](https://maplibre.org/) — WebGL map rendering engine
- [OpenFreeMap](https://openfreemap.org/) — Free vector tile hosting (OpenStreetMap data)
- HTML5 / CSS3 / JavaScript (ES6)
- GitHub Pages — zero-backend deployment

---

## Project Structure

```
├── index.html       # App shell, layout, sidebar, inspector panel
├── style.css        # Dark urban theme, sidebar, inspector, MapLibre overrides
├── script.js        # Map init, layer management, interactions, camera, filters
└── README.md
```

---

## How It Works

1. MapLibre initializes with a pitched 3D camera over Salzburg city center
2. OpenFreeMap vector tiles are loaded as a source (`ofm-tiles`)
3. A `fill-extrusion` layer reads `render_height` from OSM building features and extrudes them on the GPU
4. Buildings are colored using MapLibre **data-driven expressions** based on height class
5. Basemap POI layers (`poi_r1`, `poi_r7`, `poi_r20`) are queried on click to determine building use type
6. All filtering, styling, and camera changes happen **client-side** — no server, no Python, no page reload

---

## Key MapLibre Concepts Demonstrated

- `fill-extrusion` layer type with `render_height` and `render_min_height`
- `interpolate` expressions for zoom-dependent height animation
- `setPaintProperty()` for runtime color switching
- `queryRenderedFeatures()` for spatial cross-layer querying
- `flyTo()` and `easeTo()` for smooth camera animation
- `setStyle()` for runtime basemap swapping with layer persistence via `style.load` event
- `setFilter()` for GPU-side feature filtering

---

## Deployment

This app runs entirely on GitHub Pages — no backend, no API key, no build step.

```bash
git clone https://github.com/MariaMushtaq-12/Real-time-3D-City-Digital-Twin.git
cd Real-time-3D-City-Digital-Twin
# open index.html in browser
```

---

## Author

**Maria Mushtaq**
MSc Copernicus Master in Digital Earth (CDE)
Paris Lodron University of Salzburg × Palacký University Olomouc

[GitHub](https://github.com/MariaMushtaq-12) · [LinkedIn](https://www.linkedin.com/in/maria-mushtaq-a0244b226/)
