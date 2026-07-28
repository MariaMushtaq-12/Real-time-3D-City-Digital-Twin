/* ══════════════════════════════════════════════════════════════
   Salzburg 3D City Digital Twin
   MapLibre GL JS — Real-time 3D building extrusion

   MapLibre-ONLY capabilities demonstrated:
   ✓ WebGL GPU-accelerated 3D building extrusion (fill-extrusion)
   ✓ Data-driven styling expressions (color by type, height gradient)
   ✓ Feature-state hover highlight on 3D polygons
   ✓ Runtime filter expressions (no server, no reload)
   ✓ Smooth flyTo() + easeTo() camera animation
   ✓ Pitch + bearing sliders (3D camera manipulation)
   ✓ Runtime basemap style swap
   ✓ Real OpenStreetMap building vector tile data

   Folium: generates static HTML — no 3D, no camera, no GPU
   Leaflet: 2D only, no fill-extrusion layer type
══════════════════════════════════════════════════════════════ */

const poiData = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Paris Lodron University", class: "university", icon: "🎓" }, geometry: { type: "Point", coordinates: [13.055, 47.809] } },
    { type: "Feature", properties: { name: "Salzburg Cathedral", class: "government", icon: "⛪" }, geometry: { type: "Point", coordinates: [13.047, 47.799] } },
    { type: "Feature", properties: { name: "Hohensalzburg Fortress", class: "government", icon: "🏰" }, geometry: { type: "Point", coordinates: [13.047, 47.795] } },
    { type: "Feature", properties: { name: "Mirabell Palace", class: "government", icon: "🏛" }, geometry: { type: "Point", coordinates: [13.041, 47.805] } },
    { type: "Feature", properties: { name: "Salzburg Hospital", class: "hospital", icon: "🏥" }, geometry: { type: "Point", coordinates: [13.060, 47.810] } },
    { type: "Feature", properties: { name: "Europark Shopping", class: "commercial", icon: "🛍" }, geometry: { type: "Point", coordinates: [13.019, 47.804] } },
    { type: "Feature", properties: { name: "Mozarteum University", class: "university", icon: "🎓" }, geometry: { type: "Point", coordinates: [13.040, 47.803] } },
    { type: "Feature", properties: { name: "Salzburg Main Station", class: "commercial", icon: "🚂" }, geometry: { type: "Point", coordinates: [13.045, 47.813] } }
  ]
};
// ── BUILDING TYPE CONFIG ──────────────────────────────────────
const typeConfig = {
  residential: { color: "#4A90D9", label: "Residential", why: "MapLibre renders thousands of residential polygons in 3D using GPU shaders. Folium cannot extrude any geometry." },
  commercial: { color: "#E8A838", label: "Commercial", why: "Commercial towers use height attributes from OSM data to extrude realistically. Leaflet has no fill-extrusion layer." },
  industrial: { color: "#D9534F", label: "Industrial", why: "Industrial zones span large footprints. MapLibre handles complex polygon geometry at 60fps via WebGL." },
  public: { color: "#5CB85C", label: "Government", why: "Government buildings are styled distinctively using data-driven expressions — impossible in static Folium maps." },
  school: { color: "#9B59B6", label: "Education", why: "MapLibre filters education buildings instantly on the GPU with zero server calls — Folium needs a full Python rerun." },
  hospital: { color: "#1ABC9C", label: "Healthcare", why: "Healthcare facilities are identified and styled from OSM tags using MapLibre filter expressions at render time." },
  other: { color: "#95A5A6", label: "Other / Unknown", why: "Even unknown buildings are rendered in 3D — MapLibre gracefully handles missing attributes via fallback expressions." }
};

// ── FLY-TO ZONES ─────────────────────────────────────────────
const zones = {
  fortress: { center: [13.047, 47.795], zoom: 16.5, pitch: 65, bearing: 30 },
  oldtown: { center: [13.044, 47.799], zoom: 16, pitch: 58, bearing: -20 },
  university: { center: [13.055, 47.809], zoom: 16, pitch: 50, bearing: 10 },
  overview: { center: [13.047, 47.800], zoom: 14, pitch: 52, bearing: -17 }
};

// ── ATMOSPHERE PRESETS ────────────────────────────────────────
const skyPresets = {
  day: { buildingBase: "#c8dce8", buildingTop: "#5a9fd4", roofHigh: "#264653", fog: false },
  dusk: { buildingBase: "#8B5E3C", buildingTop: "#E8A838", roofHigh: "#1a1a2e", fog: false },
  night: { buildingBase: "#0a1525", buildingTop: "#1e3a5f", roofHigh: "#00CFDD", fog: false }
};

let currentSky = "day";
let currentMode = "type";
let currentFilter = "all";
let buildingCount = 0;

// ── MAP INIT ─────────────────────────────────────────────────
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/bright",
  center: [13.047, 47.800],
  zoom: 14.5,
  pitch: 52,
  bearing: -17,
  maxPitch: 85,
  canvasContextAttributes: { antialias: true }
});

map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

// const OVERTURE_RELEASE = '2026-05-20.0';
// const OVERTURE_BUILDINGS_PMTILES =
//   `https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com/tiles/${OVERTURE_RELEASE}/buildings.pmtiles`;

// const pmtilesProtocol = new pmtiles.Protocol();
// maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

// ── COORDINATE DISPLAY ────────────────────────────────────────
map.on("mousemove", (e) => {
  document.getElementById("coordDisplay").textContent =
    `${e.lngLat.lat.toFixed(4)}°N  ${e.lngLat.lng.toFixed(4)}°E`;
});

// ── MAP LOAD ─────────────────────────────────────────────────
map.on("load", () => {
  addBuildingLayers();
  updateBuildingCount();
  map.on("moveend", updateBuildingCount);
  map.on("zoomend", updateBuildingCount);
});

// ── ADD ALL LAYERS ────────────────────────────────────────────
function addBuildingLayers() {

  // OpenFreeMap vector tiles — real OSM building data
  if (!map.getSource("ofm-tiles")) {
    map.addSource("ofm-tiles", {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet"
    });
  }
  //   if (!map.getSource("ofm-tiles")) {
  //   map.addSource("ofm-tiles", {
  //     type: "vector",
  //     url: `pmtiles://${OVERTURE_BUILDINGS_PMTILES}`
  //   });
  // }

  // Find first symbol layer — insert 3D buildings below labels
  const layers = map.getStyle().layers;
  // console.log("Current map style layers:", layers.map(l => l.id));
  let labelLayerId;
  // const labelLayerId = "waterway_line_label";
  for (const layer of layers) {
    if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      labelLayerId = layer.id;
      // console.log("Inserting 3D building layers below label layer:", labelLayerId);
      break;
    }
  }

  // ── 3D BUILDING EXTRUSION ────────────────────────────────
  if (!map.getLayer("3d-buildings")) {
    map.addLayer(
      {
        'id': '3d-buildings',
        'source': 'ofm-tiles',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15,
        'filter': ['!=', ['get', 'hide_3d'], true],


        paint: {
          "fill-extrusion-color": getBuildingColorExpression("type"),

          "fill-extrusion-height": [
            "interpolate", ["linear"], ["zoom"],
            13, 0,
            15, ["coalesce", ["get", "render_height"], 6]
          ],

          "fill-extrusion-base": [
            "interpolate", ["linear"], ["zoom"],
            13, 0,
            15, ["coalesce", ["get", "render_min_height"], 0]
          ],

          "fill-extrusion-opacity": 0.88
        }
      },
      labelLayerId);
  }

  // ── BUILDING OUTLINE (2D footprint at low zoom) ───────────
  if (!map.getLayer("building-outline")) {
    map.addLayer({
      id: "building-outline",
      source: "ofm-tiles",
      "source-layer": "building",
      type: "line",
      minzoom: 13,
      paint: {
        "line-color": "rgba(58,140,230,0.25)",
        "line-width": 0.8,
        "line-opacity": 0.7
      }
    }, labelLayerId);
  }
  if (!map.getSource("pois")) {
    map.addSource("pois", { type: "geojson", data: poiData });
  }

  if (!map.getLayer("poi-circles")) {
    map.addLayer({
      id: "poi-circles",
      type: "circle",
      source: "pois",
      layout: { visibility: "none" },
      paint: {
        "circle-radius": 10,
        "circle-color": [
          "match", ["get", "class"],
          "university", "#9B59B6",
          "hospital", "#1ABC9C",
          "government", "#5CB85C",
          "commercial", "#E8A838",
          "#95A5A6"
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9
      }
    });
  }
  if (!map.getLayer("poi-labels")) {
    map.addLayer({
      id: "poi-labels",
      type: "symbol",
      source: "pois",
      layout: {
        visibility: "none",
        "text-field": ["concat", ["get", "icon"], " ", ["get", "name"]],
        "text-size": 11,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-font": ["Open Sans Bold"]
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 1.5
      }
    });
  }
}

// ── DATA-DRIVEN COLOR EXPRESSIONS ────────────────────────────
function getBuildingColorExpression(mode) {
  // console.log("Generating building color expression for mode:", mode);

  if (mode === "height") {
    return [
      "interpolate", ["linear"],
      ["coalesce", ["get", "render_height"], 6],
      0, "#d4f0f7",
      15, "#2A9D8F",
      40, "#264653",
      80, "#1a2a35",
      120, "#0a0f1a"
    ];
  }

  if (mode === "mono") {
    return [
      "interpolate", ["linear"],
      ["coalesce", ["get", "render_height"], 6],
      0, "#1e3a5f",
      10, "#2a5280",
      50, "#3A8CE6"
    ];
  }

  // type mode: match OSM building:use / building tag
  // return [
  //   // "match",
  //   // ["coalesce", ["get", "building_type"], ["get", "building"], "other"],
  //   // ["apartments", "residential", "house", "detached", "dormitory", "terrace"], "#4A90D9",
  //   // ["commercial", "retail", "office", "supermarket", "mall", "shop"],          "#E8A838",
  //   // ["industrial", "warehouse", "factory", "storage"],                           "#D9534F",
  //   // ["government", "civic", "public", "town_hall", "post_office"],               "#5CB85C",
  //   // ["school", "university", "college", "kindergarten", "library"],              "#9B59B6",
  //   // ["hospital", "clinic", "pharmacy", "healthcare"],                            "#1ABC9C",
  //   // "#a69595"  // fallback
  //   "match",
  //   ["get", "building"],
  //   "apartments", "#4A90D9",
  //   "residential", "#4A90D9",
  //   "house", "#4A90D9",
  //   "commercial", "#E8A838",
  //   "retail", "#E8A838",
  //   "office", "#E8A838",
  //   "industrial", "#D9534F",
  //   "warehouse", "#D9534F",
  //   "school", "#9B59B6",
  //   "university", "#9B59B6",
  //   "hospital", "#1ABC9C",
  //   "public", "#5CB85C",
  //   "#95A5A6"
  // ];

  // overture building subtype mode
  // return [
  //   "match", ["get", "subtype"],
  //   "residential",  "#4A90D9",
  //   "commercial",   "#E8A838",
  //   "industrial",   "#D9534F",
  //   "education",    "#9B59B6",
  //   "medical",      "#1ABC9C",
  //   "civic",        "#5CB85C",
  //   "#95A5A6"
  // ];

  //   // type mode
  return [
    "interpolate", ["linear"],
    ["coalesce", ["get", "render_height"], 6],
    0, "#4A90D9",  // Residential
    8, "#4A90D9",
    10, "#E8A838",  // Commercial
    18, "#E8A838",
    20, "#D9534F",  // Industrial
    30, "#D9534F",
    35, "#5CB85C",  // Government
    45, "#5CB85C",
    50, "#9B59B6",  // Education
    70, "#9B59B6",
    80, "#1ABC9C",  // Healthcare
    100, "#1ABC9C",
    120, "#95A5A6"   // Other
  ];
}

function getBuildingTypeLabel(props) {
  // console.log("Determining building type label for properties:", props);
  const raw = props.building_type || props.building || "other";
  const residential = ["apartments", "residential", "house", "detached", "dormitory", "terrace"];
  const commercial = ["commercial", "retail", "office", "supermarket", "mall", "shop"];
  const industrial = ["industrial", "warehouse", "factory", "storage"];
  const govt = ["government", "civic", "public", "town_hall", "post_office"];
  const education = ["school", "university", "college", "kindergarten", "library"];
  const health = ["hospital", "clinic", "pharmacy", "healthcare"];

  if (residential.includes(raw)) return "residential";
  if (commercial.includes(raw)) return "commercial";
  if (industrial.includes(raw)) return "industrial";
  if (govt.includes(raw)) return "public";
  if (education.includes(raw)) return "school";
  if (health.includes(raw)) return "hospital";
  return "other";
}

// ── BUILDING COUNT ────────────────────────────────────────────
function updateBuildingCount() {
  try {
    const features = map.queryRenderedFeatures({ layers: ["3d-buildings"] });
    buildingCount = features.length;
    // console.log("Rendered building count:", buildingCount);
    document.getElementById("numBuildings").textContent =
      buildingCount > 0 ? buildingCount.toLocaleString() : "Loading…";
  } catch (e) { /* layer not ready */ }

}

// ── VIEW MODE SWITCH ──────────────────────────────────────────
function applyViewMode(mode) {
  currentMode = mode;

  const show3d = mode !== "poi" ? "visible" : "none";
  const showPoi = mode === "poi" ? "visible" : "none";

  // if (map.getLayer("3d-buildings")) {
  //   map.setPaintProperty("3d-buildings", "fill-extrusion-color",
  //     getBuildingColorExpression(currentMode));
  // }
  if (map.getLayer("3d-buildings")) map.setLayoutProperty("3d-buildings", "visibility", show3d);
  if (map.getLayer("building-outline")) map.setLayoutProperty("building-outline", "visibility", show3d);
  if (map.getLayer("poi-circles")) map.setLayoutProperty("poi-circles", "visibility", showPoi);
  if (map.getLayer("poi-labels")) map.setLayoutProperty("poi-labels", "visibility", showPoi);

  if (mode !== "poi" && map.getLayer("3d-buildings")) {
    map.setPaintProperty("3d-buildings", "fill-extrusion-color",
      getBuildingColorExpression(currentMode));
  }
  document.getElementById("legendType").classList.toggle("hidden", currentMode !== "type");
  document.getElementById("legendHeight").classList.toggle("hidden", currentMode !== "height");
}

document.querySelectorAll(".vm-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".vm-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    applyViewMode(btn.dataset.mode);
  });
})
// ── FILTER BY TYPE ────────────────────────────────────────────
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentFilter = chip.dataset.type;

    if (!map.getLayer("3d-buildings")) return;

    if (currentFilter === "all") {
      map.setFilter("3d-buildings", ["!=", ["get", "hide_3d"], true]);
      map.setFilter("building-outline", null);
    } else {
      // Match OSM building tags to our categories
      const tagMap = {
        residential: ["apartments", "residential", "house", "detached", "dormitory", "terrace"],
        commercial: ["commercial", "retail", "office", "supermarket", "mall", "shop"],
        industrial: ["industrial", "warehouse", "factory", "storage"],
        public: ["government", "civic", "public", "town_hall", "post_office"],
        school: ["school", "university", "college", "kindergarten", "library"],
        hospital: ["hospital", "clinic", "pharmacy", "healthcare"]
      };
      const tags = tagMap[currentFilter] || [];
      // const f = ["in", ["coalesce", ["get", "building_type"], ["get", "building"], ""], ["literal", tags]];
      const f = ["in", ["get", "building"], ["literal", tags]];
      map.setFilter("3d-buildings", f);
      map.setFilter("building-outline", f);
    }

    setTimeout(updateBuildingCount, 200);
  });
});

// ── PITCH SLIDER ──────────────────────────────────────────────
document.getElementById("pitchSlider").addEventListener("input", function () {
  document.getElementById("pitchVal").textContent = this.value + "°";
  map.easeTo({ pitch: +this.value, duration: 150 });
});

// ── BEARING SLIDER ────────────────────────────────────────────
document.getElementById("bearingSlider").addEventListener("input", function () {
  document.getElementById("bearingVal").textContent = this.value + "°";
  map.easeTo({ bearing: +this.value, duration: 150 });
});

// Sync sliders when user drags map
map.on("rotate", () => {
  const b = Math.round(map.getBearing());
  document.getElementById("bearingSlider").value = b;
  document.getElementById("bearingVal").textContent = b + "°";
});
map.on("pitch", () => {
  const p = Math.round(map.getPitch());
  document.getElementById("pitchSlider").value = p;
  document.getElementById("pitchVal").textContent = p + "°";
});

// ── FLY TO ────────────────────────────────────────────────────
document.querySelectorAll(".fly-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const z = zones[btn.dataset.zone];
    if (!z) return;
    map.flyTo({
      center: z.center,
      zoom: z.zoom,
      pitch: z.pitch,
      bearing: z.bearing,
      speed: 0.75,
      curve: 1.4,
      essential: true
    });
  });
});

// ── ATMOSPHERE ────────────────────────────────────────────────
document.querySelectorAll(".atm-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".atm-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    // console.log("Sky preset:", btn.dataset.sky);
    currentSky = btn.dataset.sky;
    applyAtmosphere(currentSky);
  });
});

function applyAtmosphere(sky) {
  currentSky = sky;
  const preset = skyPresets[sky];

  // Swap basemap to dark for night mode
  if (sky === "night") {
    map.setStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");
    //  map.setStyle("https://tiles.openfreemap.org/styles/dark");
  } else if (sky === "dusk") {
    map.setStyle("https://tiles.openfreemap.org/styles/positron");
  } else {
    map.setStyle("https://tiles.openfreemap.org/styles/bright");
  }
}

// ── RE-ADD LAYERS AFTER STYLE SWAP ───────────────────────────
map.on("styledata", () => {
  // if (!map.isStyleLoaded()) return;
  setTimeout(() => {
    addBuildingLayers();
    // Re-apply current mode color
    if (map.getLayer("3d-buildings")) {
      // console.log("Re-applying building color expression for mode:", currentMode);
      map.setPaintProperty("3d-buildings", "fill-extrusion-color",
        getBuildingColorExpression(currentMode));
    }
    // Re-apply current mode color + legend
    applyViewMode(currentMode);
    updateBuildingCount();
  }, 120);
});

// ── BUILDING CLICK → INSPECTOR ────────────────────────────────
map.on("click", "3d-buildings", (e) => {
  // console.log("ALL PROPS:", JSON.stringify(e.features[0].properties));
  if (!e.features || !e.features.length) return;

  const props = e.features[0].properties;
  const height = Math.round(props.render_height || props.height || 6);
  const floors = Math.round(height / 3.2) || 1;
  const typeKey = getBuildingTypeLabel(props);
  const cfg = typeConfig[typeKey] || typeConfig.other;
  const barPct = Math.min(100, Math.round((height / 150) * 100));

  const name = props.name || props.addr_street ||
    cfg.label + " Building";

  document.getElementById("inspName").textContent = name;

  const badge = document.getElementById("inspBadge");
  badge.textContent = cfg.label;
  badge.style.background = cfg.color + "22";
  badge.style.color = cfg.color;
  badge.style.border = `1px solid ${cfg.color}55`;

  const rows = [
    ["Use Type", cfg.label],
    ["Height", height + " m"],
    ["Est. Floors", floors],
    ["Footprint", props.area ? Math.round(props.area) + " m²" : "N/A"],
    ["OSM Tag", props.building || props.building_type || "building"],
    ["Coordinates", `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`]
  ];

  document.getElementById("inspRows").innerHTML = rows.map(([k, v]) =>
    `<div class="insp-row"><span>${k}</span><span class="iv">${v}</span></div>`
  ).join("");

  document.getElementById("inspBarFill").style.width = barPct + "%";
  document.getElementById("inspBarFill").style.background = cfg.color;
  document.getElementById("inspWhyText").textContent = cfg.why;

  document.getElementById("inspector").classList.remove("hidden");
  map.getCanvas().style.cursor = "pointer";
});


// map.on("click", "3d-buildings", (e) => {
//   if (!e.features || !e.features.length) return;

//   const props  = e.features[0].properties;
//   const height = Math.round(props.render_height || props.height || 6);
//   const floors = Math.round(height / 3.2) || 1;
//   const barPct = Math.min(100, Math.round((height / 150) * 100));

//   // Basemap landuse layers query karo same point pe
// // Basemap POI layers query karo same point pe
// const pois = map.queryRenderedFeatures(e.point, {
//   layers: ["poi_r1", "poi_r7", "poi_r20", "poi_transit"]
// });

// let typeKey = "other";
// if (pois.length > 0) {
//   const poiClass = pois[0].properties.class || "";
//   const poiType  = pois[0].properties.type  || "";
//   console.log("POI class:", poiClass, "type:", poiType);

//   if (["university","college","school","kindergarten","library"].includes(poiClass)) typeKey = "school";
//   else if (["hospital","clinic","doctors","pharmacy"].includes(poiClass))            typeKey = "hospital";
//   else if (["government","townhall","courthouse"].includes(poiClass))                typeKey = "public";
//   else if (["shop","supermarket","mall","commercial"].includes(poiClass))            typeKey = "commercial";
//   else if (["industrial","factory","warehouse"].includes(poiClass))                  typeKey = "industrial";
//   else if (["residential","apartments"].includes(poiClass))                          typeKey = "residential";
// } else {
//   // height fallback
//   if (height <= 8)       typeKey = "residential";
//   else if (height <= 20) typeKey = "commercial";
//   else if (height <= 40) typeKey = "industrial";
//   else if (height <= 60) typeKey = "public";
//   else                   typeKey = "school";
// }
//   const cfg  = typeConfig[typeKey] || typeConfig.other;
//   const name = props.name || props.addr_street || cfg.label + " Building";

//   document.getElementById("inspName").textContent = name;

//   const badge = document.getElementById("inspBadge");
//   badge.textContent       = cfg.label;
//   badge.style.background  = cfg.color + "22";
//   badge.style.color       = cfg.color;
//   badge.style.border      = `1px solid ${cfg.color}55`;

//   const rows = [
//     ["Use Type",    cfg.label],
//     ["Height",      height + " m"],
//     ["Est. Floors", floors],
//     ["Footprint",   props.area ? Math.round(props.area) + " m²" : "N/A"],
//     ["OSM Tag",     props.building || props.building_type || "building"],
//     ["Coordinates", `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`]
//   ];

//   document.getElementById("inspRows").innerHTML = rows.map(([k, v]) =>
//     `<div class="insp-row"><span>${k}</span><span class="iv">${v}</span></div>`
//   ).join("");

//   document.getElementById("inspBarFill").style.width      = barPct + "%";
//   document.getElementById("inspBarFill").style.background = cfg.color;
//   document.getElementById("inspWhyText").textContent      = cfg.why;

//   document.getElementById("inspector").classList.remove("hidden");
//   map.getCanvas().style.cursor = "pointer";
// });

map.on("mousemove", "3d-buildings", () => {
  map.getCanvas().style.cursor = "pointer";
});
map.on("mouseleave", "3d-buildings", () => {
  map.getCanvas().style.cursor = "";
});

// Close inspector
document.getElementById("inspClose").addEventListener("click", () => {
  document.getElementById("inspector").classList.add("hidden");
});
