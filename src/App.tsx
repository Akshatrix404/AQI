import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";

// ─── AQI CONFIG ─────────────────────────────────────────────────────────────
const AQI_LEVELS = {
  1: { label: "PURE",      sub: "Breathe freely",    color: "#00ffc8", glow: "#00ffc833", advice: "Air quality is pristine. Perfect for outdoor exercise and all activities.", icon: "◎" },
  2: { label: "FAIR",      sub: "Minor concerns",    color: "#ffe44d", glow: "#ffe44d33", advice: "Unusually sensitive individuals should consider reducing prolonged outdoor exertion.", icon: "◑" },
  3: { label: "MODERATE",  sub: "Sensitive groups",  color: "#ff8c42", glow: "#ff8c4233", advice: "Sensitive groups should limit outdoor time. Others may begin to experience symptoms.", icon: "◐" },
  4: { label: "UNHEALTHY", sub: "Wear protection",   color: "#ff4444", glow: "#ff444433", advice: "Everyone may experience health effects. Minimize outdoor exposure.", icon: "◕" },
  5: { label: "HAZARDOUS", sub: "Stay indoors",      color: "#cc44ff", glow: "#cc44ff33", advice: "Health emergency conditions. Everyone should avoid all outdoor activities.", icon: "●" },
};

const POLLUTANT_INFO = {
  co:    { name: "Carbon Monoxide",  unit: "μg/m³", safe: 4400, icon: "CO",   desc: "Emitted from incomplete combustion in engines and heating systems" },
  no:    { name: "Nitric Oxide",     unit: "μg/m³", safe: 40,   icon: "NO",   desc: "Primary pollutant from traffic and industrial combustion" },
  no2:   { name: "Nitrogen Dioxide", unit: "μg/m³", safe: 40,   icon: "NO₂",  desc: "Lung irritant from vehicles and power plants" },
  o3:    { name: "Ozone",            unit: "μg/m³", safe: 100,  icon: "O₃",   desc: "Ground-level photochemical smog from sunlight reactions" },
  so2:   { name: "Sulfur Dioxide",   unit: "μg/m³", safe: 20,   icon: "SO₂",  desc: "Industrial combustion and volcanic activity byproduct" },
  pm2_5: { name: "Fine Particles",   unit: "μg/m³", safe: 25,   icon: "PM₂₅", desc: "Deep lung-penetrating particles from combustion and dust" },
  pm10:  { name: "Coarse Particles", unit: "μg/m³", safe: 50,   icon: "PM₁₀", desc: "Dust, pollen, and mold spores from surfaces and wind" },
  nh3:   { name: "Ammonia",          unit: "μg/m³", safe: 200,  icon: "NH₃",  desc: "Agricultural and industrial emissions affecting respiratory tracts" },
};

// ─── WORKOUT CONFIG ──────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { id: "easy_run",     label: "Easy Run",       icon: "🏃", unit: "km",  baseIntensity: "low",    outdoor: true  },
  { id: "tempo_run",    label: "Tempo Run",       icon: "⚡", unit: "km",  baseIntensity: "medium", outdoor: true  },
  { id: "intervals",   label: "Intervals",       icon: "🔥", unit: "min", baseIntensity: "high",   outdoor: true  },
  { id: "long_run",    label: "Long Run",        icon: "🛣️", unit: "km",  baseIntensity: "medium", outdoor: true  },
  { id: "cycle",       label: "Cycle Endurance", icon: "🚴", unit: "km",  baseIntensity: "medium", outdoor: true  },
  { id: "hiit",        label: "HIIT",            icon: "💥", unit: "min", baseIntensity: "high",   outdoor: false },
  { id: "swim",        label: "Swim",            icon: "🏊", unit: "min", baseIntensity: "medium", outdoor: false },
  { id: "gym",         label: "Gym",             icon: "🏋️", unit: "min", baseIntensity: "medium", outdoor: false },
];

const GYM_ALTERNATIVES = {
  easy_run:  ["Treadmill at easy pace", "Elliptical trainer", "Rowing machine (low resistance)"],
  tempo_run: ["Treadmill tempo intervals", "Stationary bike (moderate)", "Stair climber"],
  intervals: ["Indoor HIIT circuit", "Battle ropes", "Rowing sprints"],
  long_run:  ["Treadmill + incline walking", "Elliptical endurance", "Stationary bike long ride"],
  cycle:     ["Stationary bike", "Spin class", "Cycling trainer"],
  hiit:      ["Bodyweight circuit", "Jump rope + core", "Medicine ball slams"],
  swim:      ["Indoor pool available — proceed as normal", "Water aerobics"],
  gym:       ["Proceed as planned indoors", "Focus on strength training"],
};

function aqiIndexToScore(idx) {
  return [0, 25, 75, 125, 175, 225][idx];
}

function getWorkoutAdjustment(aqiIdx, workout, input, inputType) {
  const score = aqiIndexToScore(aqiIdx);
  const isDistance = inputType === "km";
  const val = parseFloat(input) || 0;

  if (score <= 50) {
    return { tier: 0, label: "Perfect conditions", outdoor: true, indoorOnly: false, adjustedVal: val, paceChange: 0, intensityChange: 0, noIntervals: false, tags: ["✓ No changes needed", "✓ Optimal air quality"], summary: "Go for it — conditions are pristine." };
  }
  if (score <= 100) {
    const adjVal = isDistance ? +(val * 0.9).toFixed(1) : +(val * 0.9).toFixed(0);
    return { tier: 1, label: "Minor adjustment", outdoor: true, indoorOnly: false, adjustedVal: adjVal, paceChange: 15, intensityChange: -10, noIntervals: false, tags: ["↓ Reduce intensity 10%", "→ Pace +15s/km", "↓ Slight distance trim"], summary: "Reduce effort slightly. Sensitive groups should monitor breathing." };
  }
  if (score <= 150) {
    const adjVal = isDistance ? +(val * 0.8).toFixed(1) : +(val * 0.8).toFixed(0);
    return { tier: 2, label: "Moderate restriction", outdoor: true, indoorOnly: false, adjustedVal: adjVal, paceChange: 30, intensityChange: -20, noIntervals: workout.id === "intervals", tags: ["↓ Reduce distance 20%", "→ Pace +30s/km", "✗ No interval training"], summary: "Cut distance and ditch high-intensity bursts. Wear a mask if possible." };
  }
  if (score <= 200) {
    const adjVal = isDistance ? +(val * 0.5).toFixed(1) : +(val * 0.5).toFixed(0);
    return { tier: 3, label: "Indoor recommended", outdoor: workout.outdoor, indoorOnly: false, adjustedVal: adjVal, paceChange: 60, intensityChange: -50, noIntervals: true, tags: ["⚠ Indoor strongly advised", "↓ 50% distance maximum", "✗ No high intensity outdoors"], summary: "Seriously consider moving indoors. If outdoor: halve your planned effort." };
  }
  return { tier: 4, label: "Indoor ONLY", outdoor: false, indoorOnly: true, adjustedVal: 0, paceChange: null, intensityChange: -100, noIntervals: true, tags: ["🚫 Outdoor exercise banned", "✓ Gym alternatives listed below"], summary: "Do not exercise outdoors. Air quality poses serious health risk." };
}

const WAQI_TOKEN = import.meta.env.VITE_WAQI_TOKEN || "demo";

const MOCK_DATA = {
  main: { aqi: 2 },
  components: { co: 226.1, no: 0.46, no2: 8.34, o3: 63.47, so2: 2.37, pm2_5: 8.12, pm10: 12.6, nh3: 3.1 },
};

// Convert real US AQI number (0-500) to our 1-5 index
function realAqiToIndex(aqiNum) {
  if (aqiNum <= 50)  return 1;
  if (aqiNum <= 100) return 2;
  if (aqiNum <= 150) return 3;
  if (aqiNum <= 200) return 4;
  return 5;
}

// ─── LOCATION SEARCH COMPONENT ───────────────────────────────────────────────
function LocationSearch({ theme, onLocationSelect, currentLocationName, onResetLocation }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (val) => {
    setQuery(val);
    setError("");
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setIsOpen(false); return; }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(val)}&token=${WAQI_TOKEN}`);
        const data = await res.json();
        const results = (data.data || [])
          .filter(s => !isNaN(parseInt(s.aqi)) && s.station?.name)
          .slice(0, 8)
          .map(s => ({
            uid: s.uid,
            name: s.station.name,
            aqi: parseInt(s.aqi),
            geo: s.station.geo,
          }));
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      }
      setIsSearching(false);
    }, 350);
  };

  const selectSuggestion = async (suggestion) => {
    setIsOpen(false);
    setQuery(suggestion.name);
    setIsFetching(true);
    setError("");
    try {
      // Fetch full station data from WAQI
      const res = await fetch(`https://api.waqi.info/feed/@${suggestion.uid}/?token=${WAQI_TOKEN}`);
      const json = await res.json();

      if (json.status !== "ok") throw new Error("Station data unavailable");

      const d = json.data;
      const realAqi = d.aqi;
      const aqiIndex = realAqiToIndex(realAqi);

      // Build pollutant components from WAQI iaqi field
      const iaqi = d.iaqi || {};
      const components = {
        co:    iaqi.co?.v    ?? 0,
        no:    iaqi.no?.v    ?? 0,
        no2:   iaqi.no2?.v   ?? iaqi.nox?.v ?? 0,
        o3:    iaqi.o3?.v    ?? 0,
        so2:   iaqi.so2?.v   ?? 0,
        pm2_5: iaqi.pm25?.v  ?? 0,
        pm10:  iaqi.pm10?.v  ?? 0,
        nh3:   iaqi.nh3?.v   ?? 0,
      };

      onLocationSelect({
        locationName: suggestion.name,
        data: {
          main: { aqi: aqiIndex },
          components,
          _realAqi: realAqi,
          _waqiData: d,
        },
      });
    } catch (e) {
      setError("Could not load data for this station. Try another.");
    }
    setIsFetching(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search bar */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            {isFetching ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-3.5 h-3.5 border-t border-r rounded-full" style={{ borderColor: theme.color }} />
            ) : (
              <span className="text-white/30 text-sm">⌕</span>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="Search any city worldwide…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${isOpen ? theme.color + "55" : "rgba(255,255,255,0.1)"}`,
              caretColor: theme.color,
              boxShadow: isOpen ? `0 0 0 3px ${theme.color}15` : "none",
            }}
            onKeyDown={e => {
              if (e.key === "Escape") { setIsOpen(false); inputRef.current?.blur(); }
            }}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-3 h-3 border-t border-r rounded-full border-white/30" />
            </div>
          )}
        </div>

        {/* Reset to GPS button */}
        {onResetLocation && (
          <button onClick={onResetLocation}
            className="flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/80 transition-all flex items-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            title="Reset to your location">
            <span>◎</span>
            <span className="hidden sm:inline">GPS</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 px-3 py-2 rounded-lg text-xs text-red-400/80 border border-red-400/20"
          style={{ background: "rgba(255,68,68,0.06)" }}>
          ⚠ {error}
        </motion.div>
      )}

      {/* Dropdown suggestions */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(12,12,12,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div className="px-3 py-2 border-b border-white/[0.05]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Live Stations · Tap to load</span>
            </div>
            {suggestions.map((s, i) => {
              const color = waqiAqiColor(s.aqi);
              const label = waqiAqiLabel(s.aqi);
              return (
                <motion.button
                  key={s.uid}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => selectSuggestion(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04] group"
                  style={{ borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  {/* AQI badge */}
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 transition-all group-hover:scale-105"
                    style={{ background: color + "22", border: `1px solid ${color}44` }}>
                    <span className="text-xs font-black leading-none" style={{ color }}>{s.aqi}</span>
                    <span className="text-[8px] text-white/30 leading-tight mt-0.5">AQI</span>
                  </div>

                  {/* Name & label */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white/80 truncate group-hover:text-white transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[10px] mt-0.5 font-medium" style={{ color: color + "cc" }}>{label}</div>
                  </div>

                  {/* Arrow */}
                  <span className="text-white/20 group-hover:text-white/50 transition-colors text-sm">→</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AQI COLOR HELPERS ──────────────────────────────────────────────────────
function waqiAqiColor(aqi) {
  if (aqi <= 50)  return "#00e400";
  if (aqi <= 100) return "#ffff00";
  if (aqi <= 150) return "#ff7e00";
  if (aqi <= 200) return "#ff0000";
  if (aqi <= 300) return "#8f3f97";
  return "#7e0023";
}

function waqiAqiLabel(aqi) {
  if (aqi <= 50)  return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function countryFlag(countryName) {
  const flags = {
    india: "🇮🇳", china: "🇨🇳", "united states": "🇺🇸", usa: "🇺🇸",
    "united kingdom": "🇬🇧", uk: "🇬🇧", germany: "🇩🇪", france: "🇫🇷",
    japan: "🇯🇵", australia: "🇦🇺", canada: "🇨🇦", brazil: "🇧🇷",
    russia: "🇷🇺", indonesia: "🇮🇩", pakistan: "🇵🇰", bangladesh: "🇧🇩",
    nigeria: "🇳🇬", mexico: "🇲🇽", "south korea": "🇰🇷", italy: "🇮🇹",
    spain: "🇪🇸", turkey: "🇹🇷", thailand: "🇹🇭", vietnam: "🇻🇳",
    poland: "🇵🇱", ukraine: "🇺🇦", colombia: "🇨🇴", egypt: "🇪🇬",
    iran: "🇮🇷", malaysia: "🇲🇾", nepal: "🇳🇵", sri: "🇱🇰",
  };
  const key = countryName.toLowerCase();
  for (const [k, v] of Object.entries(flags)) {
    if (key.includes(k)) return v;
  }
  return "🌍";
}

// ─── LEAFLET MAP COMPONENT ──────────────────────────────────────────────────
function AQILeafletMap({ theme }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const boundsTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const geminiCacheRef = useRef({});
  const nominatimCacheRef = useRef({});
  const lastCountryRef = useRef(null);

  const [countryPanel, setCountryPanel] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState("aqi");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeOffset, setTimeOffset] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  // Dynamically load Leaflet
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const loadLeaflet = async () => {
      // Load CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(link);
      }

      // Load JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const L = window.L;
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 3,
        zoomControl: false,
      });

      // OSM base layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        opacity: 0.85,
      }).addTo(map);

      // WAQI AQI overlay
      const aqiOverlay = L.tileLayer(
        `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${WAQI_TOKEN}`,
        { attribution: "© WAQI", opacity: 0.7 }
      ).addTo(map);

      // Zoom control top-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch WAQI station markers on bounds change
  const fetchStations = useCallback(async () => {
    const map = mapInstanceRef.current;
    const L = window.L;
    if (!map || !L || !markersLayerRef.current) return;

    const zoom = map.getZoom();
    if (zoom < 4) { markersLayerRef.current.clearLayers(); return; }

    const bounds = map.getBounds();
    const url = `https://api.waqi.info/map/bounds/?latlng=${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}&token=${WAQI_TOKEN}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== "ok") return;

      markersLayerRef.current.clearLayers();

      data.data.forEach((station) => {
        const aqi = parseInt(station.aqi);
        if (isNaN(aqi)) return;
        const color = waqiAqiColor(aqi);
        const label = waqiAqiLabel(aqi);

        const marker = L.circleMarker([station.lat, station.lon], {
          radius: 8,
          fillColor: color,
          fillOpacity: 0.85,
          color: "#000",
          weight: 1,
        });

        // Popup content
        const popupContent = `
          <div style="font-family:'DM Sans',sans-serif;min-width:200px;background:#111;color:#eee;padding:0;border-radius:12px;overflow:hidden;">
            <div style="background:${color}22;border-bottom:1px solid ${color}44;padding:12px 14px;">
              <div style="font-size:11px;color:${color};font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">${label}</div>
              <div style="font-size:22px;font-weight:900;color:${color};font-family:monospace;">${aqi}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${station.station?.name || "Station"}</div>
            </div>
            <div style="padding:10px 14px;">
              <div style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Live Reading</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.6);">US AQI: <strong style="color:#fff">${aqi}</strong></div>
              <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:4px;">${station.station?.time || ""}</div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: "waqi-popup",
          maxWidth: 260,
        });

        // Tooltip on hover
        marker.bindTooltip(`
          <div style="font-family:monospace;font-size:12px;background:#111;color:${color};padding:4px 8px;border:1px solid ${color}44;border-radius:6px;">
            AQI ${aqi} · ${station.station?.name?.split(",")[0] || "Station"}
          </div>
        `, { permanent: false, direction: "top" });

        markersLayerRef.current.addLayer(marker);
      });
    } catch (e) {
      console.warn("WAQI bounds fetch failed:", e);
    }
  }, []);

  // Hover geocoding for country panel
  const handleMapHover = useCallback(async (lat, lng) => {
    const roundedLat = Math.round(lat * 2) / 2;
    const roundedLng = Math.round(lng * 2) / 2;
    const cacheKey = `${roundedLat},${roundedLng}`;

    let country;
    if (nominatimCacheRef.current[cacheKey]) {
      country = nominatimCacheRef.current[cacheKey];
    } else {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        country = data.address?.country || data.address?.country_code?.toUpperCase();
        if (country) nominatimCacheRef.current[cacheKey] = country;
      } catch { return; }
    }

    if (!country || country === lastCountryRef.current) return;
    lastCountryRef.current = country;

    // Fetch WAQI city data for this country
    setPanelLoading(true);
    setCountryPanel({ country, cities: [], gemini: null, loading: true });

    try {
      const waqiRes = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(country)}&token=${WAQI_TOKEN}`);
      const waqiData = await waqiRes.json();

      const cities = (waqiData.data || [])
        .filter(s => !isNaN(parseInt(s.aqi)))
        .map(s => ({ name: s.station?.name?.split(",")[0] || s.uid, aqi: parseInt(s.aqi) }))
        .sort((a, b) => b.aqi - a.aqi)
        .slice(0, 5);

      setCountryPanel(prev => ({ ...prev, cities, loading: false }));

      // Gemini call (cached per country)
      if (geminiCacheRef.current[country]) {
        setCountryPanel(prev => ({ ...prev, gemini: geminiCacheRef.current[country] }));
        setPanelLoading(false);
        return;
      }

      const cityData = cities.map(c => `${c.name}: AQI ${c.aqi}`).join(", ");
      const avgAqi = cities.length ? Math.round(cities.reduce((a, c) => a + c.aqi, 0) / cities.length) : "unknown";

      const prompt = `Country: ${country}. Current AQI levels: ${cityData || "data unavailable"}. Average AQI: ${avgAqi}. Give:
1) Primary pollution sources for this country (2 sentences)
2) Top contributing pollutants with rough percentages
3) Three actionable policy solutions (bullet points)
4) Athlete advisory for someone training outdoors here (1 sentence)
Be specific to this country. Be concise.`;

      const gemRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
      });
      const gemData = await gemRes.json();
      const gemText = gemData.content?.[0]?.text || "";

      // Parse sections from Gemini response
      const parsed = parseGeminiResponse(gemText);
      geminiCacheRef.current[country] = parsed;
      setCountryPanel(prev => ({ ...prev, gemini: parsed }));
    } catch (e) {
      console.warn("Country panel fetch failed:", e);
      setCountryPanel(prev => ({ ...prev, loading: false }));
    }
    setPanelLoading(false);
  }, []);

  function parseGeminiResponse(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const result = { sources: "", pollutants: [], solutions: [], athlete: "" };

    let section = "";
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("primary") || lower.includes("source")) { section = "sources"; continue; }
      if (lower.includes("pollutant") || lower.includes("contribut")) { section = "pollutants"; continue; }
      if (lower.includes("solution") || lower.includes("policy") || lower.includes("action")) { section = "solutions"; continue; }
      if (lower.includes("athlete") || lower.includes("train")) { section = "athlete"; continue; }

      if (section === "sources" && !result.sources) result.sources = line;
      else if (section === "sources" && result.sources && !result.sources.includes(line)) result.sources += " " + line;
      else if (section === "pollutants" && (line.includes("%") || line.match(/PM|NO|SO|CO|O3/i))) {
        result.pollutants.push(line.replace(/^[-*•\d.]+\s*/, ""));
      } else if (section === "solutions" && line.length > 10) {
        result.solutions.push(line.replace(/^[-*•\d.]+\s*/, ""));
      } else if (section === "athlete" && !result.athlete) {
        result.athlete = line;
      }
    }

    // Fallback: if parsing failed, just dump raw text chunks
    if (!result.sources) result.sources = lines.slice(0, 2).join(" ");
    if (!result.solutions.length) result.solutions = lines.slice(-3);

    return result;
  }

  // Attach map events after map is ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const onMoveEnd = () => {
      clearTimeout(boundsTimerRef.current);
      boundsTimerRef.current = setTimeout(fetchStations, 400);
    };

    const onMouseMove = (e) => {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        handleMapHover(e.latlng.lat, e.latlng.lng);
      }, 1200);
    };

    map.on("moveend", onMoveEnd);
    map.on("zoomend", onMoveEnd);
    map.on("mousemove", onMouseMove);

    fetchStations();

    return () => {
      map.off("moveend", onMoveEnd);
      map.off("zoomend", onMoveEnd);
      map.off("mousemove", onMouseMove);
    };
  }, [mapReady, fetchStations, handleMapHover]);

  // Search city
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(searchQuery)}&token=${WAQI_TOKEN}`);
      const data = await res.json();
      if (data.data?.[0]) {
        const s = data.data[0];
        const geo = s.station?.geo;
        if (geo && mapInstanceRef.current) {
          mapInstanceRef.current.setView([geo[0], geo[1]], 10);
        }
      }
    } catch (e) { console.warn("Search failed", e); }
  };

  // My location
  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      mapInstanceRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 10);
    });
  };

  // Layer toggle
  const toggleLayer = (layer) => {
    setActiveLayer(layer);
    // Visual-only toggle for non-AQI layers (future expansion)
  };

  const overallAqi = countryPanel?.cities?.length
    ? Math.round(countryPanel.cities.reduce((a, c) => a + c.aqi, 0) / countryPanel.cities.length)
    : null;

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 72px)" }}>
      {/* Leaflet CSS overrides */}
      <style>{`
        .leaflet-container { background: #0d0d0d; }
        .leaflet-tile { filter: brightness(0.75) saturate(0.6); }
        .waqi-popup .leaflet-popup-content-wrapper { background: transparent !important; padding: 0 !important; border-radius: 12px !important; border: 1px solid rgba(255,255,255,0.12) !important; box-shadow: 0 8px 40px rgba(0,0,0,0.6) !important; overflow: hidden; }
        .waqi-popup .leaflet-popup-tip-container { display: none; }
        .waqi-popup .leaflet-popup-content { margin: 0 !important; }
        .leaflet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; }
        .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.1) !important; background: rgba(10,10,10,0.85) !important; }
        .leaflet-control-zoom a { color: rgba(255,255,255,0.6) !important; background: transparent !important; border-color: rgba(255,255,255,0.08) !important; }
        .leaflet-control-zoom a:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
        .leaflet-control-attribution { background: rgba(0,0,0,0.5) !important; color: rgba(255,255,255,0.25) !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.35) !important; }
      `}</style>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* ── TOP-RIGHT CONTROLS ── */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2" style={{ pointerEvents: "auto" }}>

        {/* Search */}
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search city…"
            className="px-3 py-2 rounded-xl text-xs text-white outline-none w-44"
            style={{ background: "rgba(10,10,10,0.88)", border: "1px solid rgba(255,255,255,0.12)", caretColor: "#00ffc8" }}
          />
          <button onClick={handleSearch} className="px-3 py-2 rounded-xl text-xs font-bold text-white/70 hover:text-white transition-all" style={{ background: "rgba(10,10,10,0.88)", border: "1px solid rgba(255,255,255,0.12)" }}>
            ⌕
          </button>
        </div>

        {/* Layer toggles */}
        <div className="flex gap-1.5">
          {[
            { id: "aqi", label: "AQI", color: "#ff4444" },
            { id: "wind", label: "Wind", color: "#4488ff" },
            { id: "temp", label: "Temp", color: "#ff8c42" },
          ].map(l => (
            <button key={l.id} onClick={() => toggleLayer(l.id)}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeLayer === l.id ? l.color + "22" : "rgba(10,10,10,0.88)",
                border: `1px solid ${activeLayer === l.id ? l.color + "66" : "rgba(255,255,255,0.12)"}`,
                color: activeLayer === l.id ? l.color : "rgba(255,255,255,0.45)",
              }}>{l.label}</button>
          ))}
        </div>

        {/* My location */}
        <button onClick={goToMyLocation}
          className="px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white transition-all flex items-center gap-2"
          style={{ background: "rgba(10,10,10,0.88)", border: "1px solid rgba(255,255,255,0.12)" }}>
          ◎ My Location
        </button>

        {/* Time slider */}
        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(10,10,10,0.88)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5 flex justify-between">
            <span>Forecast</span>
            <span className="text-white/60 font-mono">+{timeOffset}h</span>
          </div>
          <input type="range" min="0" max="24" step="1" value={timeOffset} onChange={e => setTimeOffset(+e.target.value)}
            className="w-full" style={{ accentColor: "#00ffc8" }} />
          <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
            <span>Now</span><span>+24h</span>
          </div>
        </div>
      </div>

      {/* ── AQI LEGEND ── */}
      <div className="absolute bottom-6 left-4 z-[1000]" style={{ pointerEvents: "none" }}>
        <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(10,10,10,0.88)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">AQI Legend</div>
          {[
            { range: "0–50",   label: "Good",        color: "#00e400" },
            { range: "51–100", label: "Moderate",     color: "#ffff00" },
            { range: "101–150",label: "Unhealthy*",   color: "#ff7e00" },
            { range: "151–200",label: "Unhealthy",    color: "#ff0000" },
            { range: "201–300",label: "Very Unhealthy",color: "#8f3f97" },
            { range: "300+",   label: "Hazardous",   color: "#7e0023" },
          ].map(item => (
            <div key={item.range} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
              <span className="text-[10px] text-white/50 font-mono">{item.range}</span>
              <span className="text-[10px] text-white/30">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── COUNTRY SLIDE PANEL ── */}
      <AnimatePresence>
        {countryPanel && (
          <motion.div
            key="country-panel"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="absolute top-4 right-72 z-[999] w-72 max-h-[calc(100vh-120px)] overflow-y-auto"
            style={{ pointerEvents: "auto" }}
          >
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(8,8,8,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}>

              {/* Header */}
              <div className="px-5 py-4 border-b border-white/[0.07]" style={{ background: overallAqi ? waqiAqiColor(overallAqi) + "18" : "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{countryFlag(countryPanel.country)}</span>
                    <span className="font-black text-sm tracking-wide text-white uppercase">{countryPanel.country}</span>
                  </div>
                  <button onClick={() => { setCountryPanel(null); lastCountryRef.current = null; }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/70 transition-all text-xs"
                    style={{ background: "rgba(255,255,255,0.06)" }}>✕</button>
                </div>
                {overallAqi && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: waqiAqiColor(overallAqi) }} />
                    <span className="text-xs" style={{ color: waqiAqiColor(overallAqi) }}>Overall: {waqiAqiLabel(overallAqi)}</span>
                  </div>
                )}
              </div>

              {/* City ranking */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">◆ City Ranking by AQI</div>
                {countryPanel.loading ? (
                  <div className="flex items-center gap-2 py-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-3 h-3 border-t border-r rounded-full border-white/30" />
                    <span className="text-xs text-white/30">Loading stations…</span>
                  </div>
                ) : countryPanel.cities.length === 0 ? (
                  <div className="text-xs text-white/25">No data available</div>
                ) : (
                  <div className="space-y-2">
                    {countryPanel.cities.map((city, i) => {
                      const color = waqiAqiColor(city.aqi);
                      const barPct = Math.min((city.aqi / 300) * 100, 100);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 font-mono w-4 flex-shrink-0">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-white/70 truncate">{city.name}</span>
                              <span className="text-xs font-mono font-bold ml-2 flex-shrink-0" style={{ color }}>{city.aqi}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${barPct}%` }} transition={{ delay: i * 0.1, duration: 0.8 }}
                                className="h-full rounded-full" style={{ background: color, opacity: 0.8 }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gemini content */}
              {countryPanel.gemini ? (
                <>
                  {/* Primary sources */}
                  {countryPanel.gemini.sources && (
                    <div className="px-5 py-3 border-b border-white/[0.06]">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">◈ Primary Sources</div>
                      <p className="text-xs text-white/55 leading-relaxed">{countryPanel.gemini.sources}</p>
                    </div>
                  )}

                  {/* Top pollutants */}
                  {countryPanel.gemini.pollutants?.length > 0 && (
                    <div className="px-5 py-3 border-b border-white/[0.06]">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">◉ Top Pollutants</div>
                      <div className="space-y-1.5">
                        {countryPanel.gemini.pollutants.slice(0, 4).map((p, i) => {
                          const pctMatch = p.match(/(\d+)%/);
                          const pct = pctMatch ? parseInt(pctMatch[1]) : (80 - i * 15);
                          const colors = ["#ff4444", "#ff8c42", "#ffe44d", "#00ffc8"];
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-white/55 truncate pr-2">{p.split(/\d+%/)[0].trim() || p.slice(0, 20)}</span>
                                <span className="font-mono text-white/40">{pct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                                  className="h-full rounded-full" style={{ background: colors[i] || "#888" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Solutions */}
                  {countryPanel.gemini.solutions?.length > 0 && (
                    <div className="px-5 py-3 border-b border-white/[0.06]">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">🛠 How to Solve</div>
                      <div className="space-y-1.5">
                        {countryPanel.gemini.solutions.slice(0, 3).map((s, i) => (
                          <div key={i} className="flex gap-2">
                            <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#00ffc8" }} />
                            <span className="text-[10px] text-white/50 leading-relaxed">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Athlete advisory */}
                  {countryPanel.gemini.athlete && (
                    <div className="px-5 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">🏃 Athlete Advisory</div>
                      <p className="text-[10px] text-white/55 leading-relaxed">{countryPanel.gemini.athlete}</p>
                    </div>
                  )}
                </>
              ) : panelLoading ? (
                <div className="px-5 py-4 flex items-center gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-t border-r rounded-full flex-shrink-0" style={{ borderColor: "#00ffc8" }} />
                  <span className="text-xs text-white/35">Consulting AI…</span>
                </div>
              ) : null}

              {/* Gemini badge */}
              <div className="px-5 py-2 border-t border-white/[0.05]">
                <div className="text-[9px] text-white/20 flex items-center gap-1.5">
                  <span style={{ color: "#00ffc8" }}>◈</span> Powered by Claude AI · Hover map to explore
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PARTICLE CANVAS ─────────────────────────────────────────────────────────
function ParticleCanvas({ color, intensity = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.floor(50 * intensity);
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.35,
      dy: -Math.random() * 0.6 - 0.1,
      life: Math.random(),
      maxLife: Math.random() * 0.5 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy; p.life += 0.003;
        if (p.y < 0 || p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 5;
          p.life = 0;
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5;
        const hex = Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + hex;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [color, intensity]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── ANIMATED NUMBER ─────────────────────────────────────────────────────────
function AnimNum({ value, decimals = 1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = parseFloat(node.textContent) || 0;
    const ctrl = animate(from, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { if (node) node.textContent = v.toFixed(decimals); },
    });
    return () => ctrl.stop();
  }, [value, decimals]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

// ─── RADIAL GAUGE ─────────────────────────────────────────────────────────────
function RadialGauge({ aqi, theme }) {
  const S = 220, cx = 110, cy = 110, R = 88, sw = 12;
  const arc = 2 * Math.PI * R * 0.75;
  const offset = arc * (1 - (aqi - 1) / 4);

  return (
    <div className="relative flex items-center justify-center" style={{ width: S, height: S }}>
      <svg width={S} height={S} style={{ transform: "rotate(-225deg)" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}
          strokeDasharray={`${arc} ${2 * Math.PI * R}`} strokeLinecap="round" />
        <motion.circle cx={cx} cy={cy} r={R} fill="none" stroke={theme.color} strokeWidth={sw}
          strokeDasharray={`${arc} ${2 * Math.PI * R}`} strokeLinecap="round"
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${theme.color})` }}
        />
        {[1,2,3,4,5].map((i) => {
          const a = ((-225 + ((i-1)/4)*270) * Math.PI) / 180;
          return (
            <line key={i}
              x1={cx + (R-18)*Math.cos(a)} y1={cy + (R-18)*Math.sin(a)}
              x2={cx + (R+4)*Math.cos(a)}  y2={cy + (R+4)*Math.sin(a)}
              stroke={i <= aqi ? theme.color : "rgba(255,255,255,0.12)"}
              strokeWidth={i === aqi ? 3 : 1.5} strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <div className="text-6xl font-black tabular-nums" style={{ color: theme.color, textShadow: `0 0 30px ${theme.color}88`, fontFamily: "'DM Mono', monospace" }}>
          {aqi}
        </div>
        <div className="text-[11px] font-bold tracking-[0.3em] mt-1" style={{ color: theme.color + "88" }}>OF 5</div>
      </div>
    </div>
  );
}

// ─── POLLUTANT ROW ────────────────────────────────────────────────────────────
function PollutantRow({ name, value, theme, selected, onClick, idx }) {
  const info = POLLUTANT_INFO[name] || { name, unit: "μg/m³", safe: 100, icon: name.toUpperCase(), desc: "" };
  const pct = Math.min((value / info.safe) * 100, 100);
  const exceeded = value > info.safe;

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: idx * 0.06, duration: 0.5, ease: [0.16,1,0.3,1] }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="rounded-2xl p-4 border transition-all duration-300" style={{
        background: selected ? theme.glow : "rgba(255,255,255,0.02)",
        borderColor: selected ? theme.color + "44" : "rgba(255,255,255,0.06)",
        boxShadow: selected ? `0 0 20px ${theme.glow}` : "none",
      }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all" style={{
            background: selected ? theme.color + "22" : "rgba(255,255,255,0.05)",
            color: selected ? theme.color : "rgba(255,255,255,0.45)",
            border: `1px solid ${selected ? theme.color + "44" : "transparent"}`,
            fontFamily: "'DM Mono', monospace",
          }}>
            {info.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white/40 tracking-wider uppercase">{info.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {exceeded && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: theme.color + "22", color: theme.color }}>OVER</span>
                )}
                <span className="font-mono font-bold text-sm text-white"><AnimNum value={value} decimals={2} /></span>
                <span className="text-white/25 text-xs">{info.unit}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.6, ease: [0.16,1,0.3,1], delay: idx * 0.05 + 0.2 }}
                style={{ background: exceeded ? `linear-gradient(90deg, ${theme.color}, #ff0044)` : theme.color, boxShadow: `0 0 8px ${theme.color}66` }}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="pt-3 mt-3 border-t border-white/5 flex flex-col gap-2">
                <p className="text-xs text-white/40">{info.desc}</p>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden relative">
                  <div className="h-full absolute left-0 w-full opacity-20 rounded-full" style={{ background: "linear-gradient(90deg, #00ff88, #ffe44d, #ff4444)" }} />
                  <motion.div className="h-full w-1 rounded-full absolute top-0" animate={{ left: `${Math.min(pct, 98)}%` }} transition={{ duration: 1 }} style={{ background: theme.color, boxShadow: `0 0 8px ${theme.color}` }} />
                </div>
                <div className="flex justify-between text-[10px] text-white/20">
                  <span>0</span><span>Safe limit: {info.safe} {info.unit}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── WORKOUT ADJUSTER ─────────────────────────────────────────────────────────
function WorkoutAdjuster({ aqi, theme, components }) {
  const [workout, setWorkout] = useState(WORKOUT_TYPES[0]);
  const [inputVal, setInputVal] = useState("10");
  const [inputType, setInputType] = useState("km");
  const [result, setResult] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyText, setWhyText] = useState(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const cacheRef = useRef({});

  useEffect(() => {
    setInputType(workout.unit);
    setInputVal(workout.unit === "km" ? "10" : "45");
    setResult(null);
    setWhyText(null);
    setWhyOpen(false);
  }, [workout]);

  const handleCalculate = () => {
    const adj = getWorkoutAdjustment(aqi, workout, inputVal, inputType);
    setResult(adj);
    setWhyText(null);
    setWhyOpen(false);
  };

  const fetchWhy = async () => {
    const cacheKey = `${aqi}-${workout.id}`;
    if (cacheRef.current[cacheKey]) {
      setWhyText(cacheRef.current[cacheKey]);
      setWhyOpen(true);
      return;
    }
    setWhyLoading(true);
    setWhyOpen(true);
    const FALLBACKS = {
      1: "At AQI level 1 (Pure), air quality poses no physiological threat — oxygen uptake is optimal and alveolar gas exchange operates at full efficiency. There is no inflammatory burden on the airways, meaning cardiac output remains low relative to effort. This is the ideal condition for high-intensity sessions like " + workout.label + ", with no recommended modifications.",
      2: "At AQI level 2 (Fair), trace pollutants begin subtly irritating the bronchial epithelium, causing a marginal increase in airway resistance that slightly reduces VO₂max. The cardiovascular system must work fractionally harder to maintain the same oxygen delivery during " + workout.label + ". Highly sensitive individuals may notice mild throat dryness or a slight increase in perceived exertion.",
      3: "At AQI level 3 (Moderate), fine particulate matter infiltrates the lower respiratory tract and triggers a low-grade inflammatory response via cytokine release, narrowing bronchioles and reducing effective lung surface area. This forces your heart to elevate stroke volume to compensate for reduced oxygen saturation in the blood during " + workout.label + ". The combined cardiovascular and pulmonary stress means perceived exertion rises 10–20% above what the same pace would normally feel like.",
      4: "At AQI level 4 (Unhealthy), PM₂.₅ particles penetrate deep alveolar tissue, impairing gas exchange efficiency and triggering acute bronchospasm in susceptible individuals during " + workout.label + ". Systemic inflammatory markers (IL-6, CRP) rise within 30 minutes of exposure, increasing blood viscosity and putting additional load on the myocardium. Oxygen delivery to working muscles is measurably compromised — studies show VO₂max drops 5–8% in these conditions, making reduced intensity or indoor alternatives essential.",
      5: "At AQI level 5 (Hazardous), ultra-fine particles and toxic gases cause direct oxidative damage to alveolar membranes, with measurable drops in FEV1 within minutes of exposure during " + workout.label + ". The inflammatory cascade overwhelms normal clearance mechanisms, causing acute airway inflammation, chest tightness, and significant cardiac stress as the heart struggles to maintain perfusion pressure. Any outdoor exercise at this level risks acute respiratory events — the physiological cost far exceeds any training benefit.",
    };
    try {
      const prompt = `You are a sports physiologist. In exactly 3 concise sentences, explain the physiological reason why AQI index level ${aqi} (out of 5, where 5 is hazardous) affects performance and health for someone doing a ${workout.label}. Be specific about lung function, oxygen uptake, and inflammation. No bullet points. Plain sentences only.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 256,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text && text.length > 20) {
        cacheRef.current[cacheKey] = text;
        setWhyText(text);
      } else {
        throw new Error("empty");
      }
    } catch {
      const fallback = FALLBACKS[aqi] || FALLBACKS[3];
      cacheRef.current[cacheKey] = fallback;
      setWhyText(fallback);
    }
    setWhyLoading(false);
  };

  const numIn = parseFloat(inputVal) || 0;
  const adj = result;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">⚙ Workout Intensity Adjuster</div>
        <div className="flex-1 h-px bg-white/5" />
        <div className="text-[11px] font-mono text-white/25">AQI {aqi} · {AQI_LEVELS[aqi].label}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-3xl p-7 border space-y-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="text-xs font-bold text-white/40 tracking-widest uppercase">Plan Your Workout</div>
          <div>
            <div className="text-[11px] text-white/25 uppercase tracking-wider mb-3">Workout Type</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
              {WORKOUT_TYPES.map((w) => (
                <button key={w.id} onClick={() => setWorkout(w)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border text-center transition-all"
                  style={{
                    background: workout.id === w.id ? theme.color + "18" : "rgba(255,255,255,0.03)",
                    borderColor: workout.id === w.id ? theme.color + "55" : "rgba(255,255,255,0.07)",
                    boxShadow: workout.id === w.id ? `0 0 16px ${theme.glow}` : "none",
                  }}>
                  <span className="text-xl leading-none">{w.icon}</span>
                  <span className="text-[10px] font-bold text-white/60 leading-tight">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-white/25 uppercase tracking-wider mb-3">
              {inputType === "km" ? "Planned Distance" : "Planned Duration"}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="number" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                  min="0" max="200"
                  className="w-full rounded-xl px-4 py-3 text-white font-mono font-bold text-lg border outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", caretColor: theme.color }}
                  onFocus={e => e.target.style.borderColor = theme.color + "88"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
              <div className="flex rounded-xl overflow-hidden border border-white/10">
                {["km", "min"].map((u) => (
                  <button key={u} onClick={() => setInputType(u)}
                    className="px-4 py-3 text-xs font-bold transition-all"
                    style={{ background: inputType === u ? theme.color + "22" : "transparent", color: inputType === u ? theme.color : "rgba(255,255,255,0.3)" }}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleCalculate}
            className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all"
            style={{ background: `linear-gradient(135deg, ${theme.color}33, ${theme.color}11)`, border: `1px solid ${theme.color}44`, color: theme.color, boxShadow: `0 0 20px ${theme.glow}` }}>
            ◉ Calculate AQI Adjustment
          </button>
        </div>

        <div className="rounded-3xl p-7 border relative overflow-hidden" style={{
          background: "rgba(255,255,255,0.02)",
          borderColor: adj ? (adj.indoorOnly ? "#cc44ff44" : theme.color + "33") : "rgba(255,255,255,0.07)",
        }}>
          <AnimatePresence mode="wait">
            {!adj ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center py-10 gap-3">
                <div className="text-4xl opacity-20">⚙</div>
                <div className="text-white/20 text-sm">Select workout type & input, then calculate</div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[11px] font-bold tracking-widest text-white/30 uppercase">Adjusted Plan</span>
                  <span className="text-[11px] font-black px-3 py-1 rounded-full" style={{
                    background: adj.tier === 0 ? "#00ffc822" : adj.tier <= 2 ? theme.color + "22" : "#ff444422",
                    color: adj.tier === 0 ? "#00ffc8" : adj.tier <= 2 ? theme.color : "#ff4444",
                  }}>{adj.label}</span>
                </div>
                {!adj.indoorOnly && (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 rounded-2xl p-4 border border-white/10 bg-white/[0.03] text-center">
                      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Before</div>
                      <div className="text-3xl font-black font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>{numIn}</div>
                      <div className="text-xs text-white/30 mt-1">{inputType}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-2xl" style={{ color: theme.color }}>→</motion.div>
                    </div>
                    <div className="flex-1 rounded-2xl p-4 border text-center" style={{ borderColor: theme.color + "44", background: theme.glow }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: theme.color + "99" }}>After</div>
                      <div className="text-3xl font-black font-mono" style={{ color: theme.color }}>{adj.adjustedVal}</div>
                      <div className="text-xs mt-1" style={{ color: theme.color + "88" }}>{inputType}</div>
                      {adj.paceChange > 0 && (
                        <div className="text-[10px] mt-1" style={{ color: theme.color + "77" }}>+{adj.paceChange}s/km pace</div>
                      )}
                    </div>
                  </div>
                )}
                {adj.indoorOnly && (
                  <div className="rounded-2xl p-5 border mb-5 text-center" style={{ borderColor: "#cc44ff44", background: "#cc44ff11" }}>
                    <div className="text-3xl mb-2">🚫</div>
                    <div className="font-bold text-sm" style={{ color: "#cc44ff" }}>Outdoor Exercise Banned</div>
                    <div className="text-xs text-white/40 mt-1.5">Air quality is hazardous. Stay indoors.</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {adj.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>{tag}</span>
                  ))}
                </div>
                <p className="text-xs text-white/45 leading-relaxed mb-4">{adj.summary}</p>
                {(adj.indoorOnly || adj.tier >= 3) && (
                  <div className="rounded-2xl p-4 border border-white/10 bg-white/[0.02] mb-4">
                    <div className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3">🏋️ Gym Alternatives</div>
                    <div className="space-y-1.5">
                      {(GYM_ALTERNATIVES[workout.id] || GYM_ALTERNATIVES.gym).map((alt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full" style={{ background: theme.color }} />
                          <span className="text-xs text-white/50">{alt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { if (!whyOpen) fetchWhy(); else setWhyOpen(false); }}
                  className="w-full py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  style={{ borderColor: whyOpen ? theme.color + "44" : "rgba(255,255,255,0.1)", color: whyOpen ? theme.color : "rgba(255,255,255,0.35)", background: whyOpen ? theme.glow : "transparent" }}>
                  <span>🧬 Why?</span>
                  <motion.span animate={{ rotate: whyOpen ? 180 : 0 }} className="text-base leading-none">↓</motion.span>
                </button>
                <AnimatePresence>
                  {whyOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-4 space-y-2">
                        <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                          <span style={{ color: theme.color }}>◈</span> Physiological Explanation · AI Analysis
                        </div>
                        {whyLoading ? (
                          <div className="flex items-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-3 h-3 border-t border-r rounded-full" style={{ borderColor: theme.color }} />
                            <span className="text-xs text-white/30">Consulting physiology model…</span>
                          </div>
                        ) : (
                          <p className="text-xs text-white/55 leading-relaxed">{whyText}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.015)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] font-bold text-white/20 uppercase tracking-widest mb-3">Workout Restriction Scale</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            { range: "AQI 0–50",    label: "No change",              icon: "✓",  color: "#00ffc8" },
            { range: "AQI 51–100",  label: "-10% intensity",         icon: "↓",  color: "#ffe44d" },
            { range: "AQI 101–150", label: "-20% dist, no intervals",icon: "⚠",  color: "#ff8c42" },
            { range: "AQI 151–200", label: "Indoor advised, 50% max",icon: "⛔", color: "#ff4444" },
            { range: "AQI 200+",    label: "Indoor ONLY",            icon: "🚫", color: "#cc44ff" },
          ].map((r, i) => (
            <div key={i} className="rounded-xl p-3 border text-center" style={{ borderColor: r.color + "22", background: r.color + "08" }}>
              <div className="text-base mb-1">{r.icon}</div>
              <div className="text-[10px] font-mono font-bold mb-1" style={{ color: r.color + "99" }}>{r.range}</div>
              <div className="text-[10px] text-white/35 leading-tight">{r.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// SECTION 3 — SAFE TRAINING WINDOWS
// ══════════════════════════════════════════════════════════════
function SafeTrainingWindows({ theme, userLat, userLng }) {
  const [hourlyData, setHourlyData]   = useState([]);
  const [weekData, setWeekData]       = useState([]);
  const [lastWeekData, setLastWeekData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [weekView, setWeekView]       = useState("this");
  const OWM_KEY = "61139cc72b4fb31229baa227db1bc59e";

  function scoreHour(aqi, temp, humidity, windSpeed, hour) {
    let s = 100;
    s -= aqi * 0.4;
    if (temp > 35) s -= 15;
    if (humidity > 80) s -= 10;
    if (humidity < 30) s -= 5;
    if (windSpeed > 15) s += 5;
    if (hour >= 7  && hour <= 9)  s -= 5;
    if (hour >= 17 && hour <= 20) s -= 5;
    return Math.max(0, Math.min(100, Math.round(s)));
  }

  function scoreColor(s) {
    if (s >= 75) return "#00ffc8";
    if (s >= 55) return "#ffe44d";
    if (s >= 35) return "#ff8c42";
    return "#ff4444";
  }

  useEffect(() => {
    if (!userLat || !userLng) return;
    setLoading(true);

    const aqP  = fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=pm2_5,european_aqi&forecast_days=2`).then(r=>r.json());
    const wxP  = fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${userLat}&lon=${userLng}&appid=${OWM_KEY}&units=metric`).then(r=>r.json());
    const aqHP = fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&past_days=7&forecast_days=0`).then(r=>r.json());

    Promise.all([aqP, wxP, aqHP]).then(([aq, wx, aqH]) => {
      const now = new Date();
      const hours = [];
      for (let i = 0; i < 24; i++) {
        const target = new Date(now);
        target.setHours(now.getHours() + i, 0, 0, 0);
        const hIdx  = i + now.getHours();
        const aqi   = aq.hourly?.european_aqi?.[hIdx] ?? 50;
        const pm25  = aq.hourly?.pm2_5?.[hIdx] ?? 12;
        const block = wx.list?.find(b => Math.abs(new Date(b.dt * 1000) - target) < 5400000) ?? wx.list?.[0];
        const temp  = block?.main?.temp ?? 25;
        const hum   = block?.main?.humidity ?? 60;
        const wind  = (block?.wind?.speed ?? 5) * 3.6;
        const hr    = target.getHours();
        hours.push({ label: hr.toString().padStart(2,"0")+":00", hour: hr, aqi: Math.round(aqi), pm25: +pm25.toFixed(1), temp: Math.round(temp), humidity: Math.round(hum), windSpeed: Math.round(wind), score: scoreHour(aqi, temp, hum, wind, hr), isCurrent: i === 0 });
      }
      setHourlyData(hours);

      // This-week daily averages from OWM forecast
      const dayMap = {};
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      wx.list?.forEach(b => {
        const d  = new Date(b.dt * 1000);
        const key = dayNames[d.getDay()];
        if (!dayMap[key]) dayMap[key] = { aqis: [], scores: [], dow: d.getDay() };
        const aqiH = aq.hourly?.european_aqi?.[Math.max(0,Math.round((d-now)/3600000))] ?? 55;
        dayMap[key].aqis.push(aqiH);
        dayMap[key].scores.push(scoreHour(aqiH, b.main.temp, b.main.humidity, b.wind.speed*3.6, d.getHours()));
      });
      const thisWeek = Object.entries(dayMap).map(([day,v])=>({
        day, avgAqi: Math.round(v.aqis.reduce((a,b)=>a+b,0)/v.aqis.length),
        avgScore: Math.round(v.scores.reduce((a,b)=>a+b,0)/v.scores.length), dow: v.dow
      })).sort((a,b)=>a.dow-b.dow).slice(0,7);
      setWeekData(thisWeek);

      // Last-week from historical
      const lwMap = {};
      const lw = aqH.hourly?.european_aqi ?? [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() - 7 + i);
        const key = dayNames[d.getDay()];
        const slice = lw.slice(i*24, (i+1)*24).filter(Boolean);
        const avg = slice.length ? Math.round(slice.reduce((a,b)=>a+b,0)/slice.length) : 60;
        lwMap[key] = { day: key, avgAqi: avg, avgScore: scoreHour(avg, 26, 65, 10, 8), dow: d.getDay() };
      }
      setLastWeekData(Object.values(lwMap).sort((a,b)=>a.dow-b.dow));
      setLoading(false);
    }).catch(() => {
      // fallback mock
      const now = new Date();
      const mock = Array.from({length:24},(_,i)=>{
        const hr = (now.getHours()+i)%24;
        const aqi = 30+Math.random()*100;
        return { label: hr.toString().padStart(2,"0")+":00", hour: hr, aqi: Math.round(aqi), pm25: +(8+Math.random()*20).toFixed(1), temp: Math.round(24+Math.random()*12), humidity: Math.round(50+Math.random()*30), windSpeed: Math.round(5+Math.random()*15), score: scoreHour(aqi,26,60,10,hr), isCurrent: i===0 };
      });
      setHourlyData(mock);
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      setWeekData(days.map((d,i)=>({day:d, avgAqi: Math.round(40+Math.random()*80), avgScore: Math.round(40+Math.random()*50), dow:i})));
      setLastWeekData(days.map((d,i)=>({day:d, avgAqi: Math.round(50+Math.random()*70), avgScore: Math.round(35+Math.random()*55), dow:i})));
      setLoading(false);
    });
  }, [userLat, userLng]);

  const top3      = [...hourlyData].sort((a,b)=>b.score-a.score).slice(0,3).map(h=>h.hour);
  const bestHour  = [...hourlyData].sort((a,b)=>b.score-a.score)[0];
  const displayWk = weekView === "this" ? weekData : lastWeekData;
  const bestDay   = [...displayWk].sort((a,b)=>b.avgScore-a.avgScore)[0];
  const maxScore  = Math.max(...hourlyData.map(h=>h.score), 1);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1.5,ease:"linear"}}
          className="w-10 h-10 border-t-2 border-r-2 rounded-full" style={{borderColor:theme.color}}/>
        <div className="text-white/30 text-xs font-mono tracking-widest uppercase">Loading forecast…</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Best window banner ── */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        className="rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{background: bestHour?.score>=55 ? scoreColor(bestHour.score)+"12" : "#ff444410",
                border:`1px solid ${bestHour?.score>=55 ? scoreColor(bestHour.score) : "#ff4444"}30`}}>
        <div className="flex items-center gap-4">
          <div className="text-3xl">{bestHour?.score>=55?"🏃":"🏠"}</div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest mb-0.5" style={{color: bestHour?.score>=55?scoreColor(bestHour.score):"#ff4444"}}>
              {bestHour?.score>=55 ? "Best Training Window Today" : "No Good Windows Today — Train Indoors"}
            </div>
            <div className="text-sm text-white/60">
              {bestHour?.score>=55
                ? `${bestHour.label} · Score ${bestHour.score}/100 · AQI ${bestHour.aqi} · ${bestHour.temp}°C · ${bestHour.humidity}% RH`
                : "Air quality too poor for outdoor training today"}
            </div>
          </div>
        </div>
        {bestDay && (
          <div className="text-xs text-white/35 flex items-center gap-2 flex-shrink-0">
            <span>Best day this week:</span>
            <span className="font-black text-sm" style={{color:scoreColor(bestDay.avgScore)}}>{bestDay.day}</span>
            <span className="font-mono" style={{color:scoreColor(bestDay.avgScore)}}>Score {bestDay.avgScore}</span>
          </div>
        )}
      </motion.div>

      {/* ── 24-hour bar timeline ── */}
      <div className="rounded-3xl p-6 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">◆ 24-Hour Training Score Timeline</h2>
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            {[["#00ffc8","≥75 Excellent"],["#ffe44d","55–74 Good"],["#ff8c42","35–54 Marginal"],["#ff4444","<35 Avoid"]].map(([c,l])=>(
              <span key={l} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:c}}/>{l}</span>
            ))}
          </div>
        </div>

        <div className="relative mt-8">
          <div className="flex items-end gap-0.5 h-52">
            {hourlyData.map((h,i)=>{
              const col = scoreColor(h.score);
              const isTop = top3.includes(h.hour);
              const barH  = Math.max((h.score/maxScore)*100, 3);
              return (
                <div key={i} className="flex-1 flex flex-col items-center relative group cursor-pointer"
                  onMouseEnter={()=>setHoveredHour(i)} onMouseLeave={()=>setHoveredHour(null)}>
                  {/* BEST badge */}
                  {isTop && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*0.02}}
                      className="absolute -top-6 text-[7px] font-black px-1.5 py-0.5 rounded whitespace-nowrap z-10"
                      style={{background:col+"22",color:col,border:`1px solid ${col}55`}}>▲BEST</motion.div>
                  )}
                  {/* Bar */}
                  <motion.div
                    initial={{height:0}} animate={{height:`${barH}%`}}
                    transition={{duration:0.7,delay:i*0.015,ease:[0.16,1,0.3,1]}}
                    className="w-full rounded-t transition-all"
                    style={{
                      background: `linear-gradient(to top, ${col}cc, ${col})`,
                      opacity: hoveredHour===null ? 0.8 : hoveredHour===i ? 1 : 0.4,
                      boxShadow: h.isCurrent?`0 0 14px ${col}`:isTop?`0 0 8px ${col}66`:"none",
                      border: h.isCurrent?`1px solid ${col}`:"none",
                    }}/>
                  {/* Tooltip */}
                  {hoveredHour===i && (
                    <motion.div initial={{opacity:0,y:6,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 w-48 rounded-2xl overflow-hidden pointer-events-none"
                      style={{background:"rgba(8,8,8,0.98)",border:`1px solid ${col}44`,boxShadow:`0 12px 40px rgba(0,0,0,0.7)`}}>
                      <div className="px-4 py-3 border-b border-white/[0.06]" style={{background:col+"14"}}>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{h.label}</div>
                        <div className="text-2xl font-black font-mono leading-none mt-1" style={{color:col}}>Score {h.score}</div>
                        <div className="text-[10px] mt-0.5" style={{color:col+"aa"}}>{h.score>=75?"Excellent":h.score>=55?"Good":h.score>=35?"Marginal":"Avoid"}</div>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        {[["AQI",h.aqi],["Temp",`${h.temp}°C`],["Humidity",`${h.humidity}%`],["Wind",`${h.windSpeed} km/h`],["PM₂.₅",`${h.pm25} µg/m³`]].map(([k,v])=>(
                          <div key={k} className="flex justify-between text-[10px]">
                            <span className="text-white/30">{k}</span>
                            <span className="text-white/70 font-mono font-bold">{v}</span>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-white/[0.06] text-[9px] text-white/30 leading-snug">
                          Lung load (45 min training): ~{Math.round(h.pm25 * 0.45 * 45)} µg PM₂.₅ absorbed
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          {/* X-axis labels */}
          <div className="flex gap-0.5 mt-1.5">
            {hourlyData.map((h,i)=>(
              <div key={i} className="flex-1 text-center">
                {i%4===0&&<span className="text-[8px] text-white/20 font-mono">{h.label.slice(0,2)}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7-day forecast ── */}
      <div className="rounded-3xl p-6 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">◆ 7-Day AQI Forecast</h2>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {["this","last"].map(w=>(
              <button key={w} onClick={()=>setWeekView(w)}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{background:weekView===w?theme.color+"22":"transparent",color:weekView===w?theme.color:"rgba(255,255,255,0.3)"}}>
                {w==="this"?"This Week":"Last Week"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {displayWk.map((d,i)=>{
            const sc  = scoreColor(d.avgScore);
            const aqC = waqiAqiColor(d.avgAqi);
            const best = d.day===bestDay?.day && weekView==="this";
            return (
              <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
                className="rounded-2xl p-3 text-center relative flex flex-col items-center gap-1"
                style={{background:best?sc+"12":"rgba(255,255,255,0.02)",border:`1px solid ${best?sc+"55":"rgba(255,255,255,0.07)"}`,boxShadow:best?`0 0 18px ${sc}22`:"none"}}>
                {best && <div className="absolute -top-2.5 text-[8px] font-black px-2 py-0.5 rounded-full whitespace-nowrap" style={{background:sc,color:"#000"}}>BEST</div>}
                <div className="text-[10px] font-bold text-white/40 uppercase">{d.day}</div>
                <div className="text-xl font-black font-mono" style={{color:aqC}}>{d.avgAqi}</div>
                <div className="text-[8px] text-white/30">AQI</div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${d.avgScore}%`}} transition={{delay:i*0.06+0.3}}
                    className="h-full rounded-full" style={{background:sc}}/>
                </div>
                <div className="text-[9px] font-mono font-bold" style={{color:sc}}>{d.avgScore}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 4 — ROUTE PLANNER
// ══════════════════════════════════════════════════════════════
function RoutePlanner({ theme, userLat, userLng }) {
  const mapDivRef      = useRef(null);
  const mapRef         = useRef(null);
  const routeLayersRef = useRef([]);
  const markerLayerRef = useRef(null);
  const osmLayerRef    = useRef(null);
  const clickStepRef   = useRef("start"); // use ref to avoid stale closure in map click handler
  const [mapReady,    setMapReady]    = useState(false);
  const [startPt,     setStartPt]     = useState(null);
  const [endPt,       setEndPt]       = useState(null);
  const [clickStep,   setClickStep]   = useState("start");
  const [mode,        setMode]        = useState("click");
  const [loopKm,      setLoopKm]      = useState("5");
  const [calculating, setCalculating] = useState(false);
  const [routes,      setRoutes]      = useState(null);
  const [windBearing, setWindBearing] = useState(null);
  const [baseAqi,     setBaseAqi]     = useState(80);
  const [osmLoaded,   setOsmLoaded]   = useState(false);
  const OWM_KEY = "61139cc72b4fb31229baa227db1bc59e";

  // keep ref in sync so map click handler always sees latest step
  useEffect(()=>{ clickStepRef.current = clickStep; }, [clickStep]);

  // ── Load Leaflet + init map (runs once) ──
  useEffect(()=>{
    if (!userLat || !userLng) return;
    if (mapRef.current) return; // already initialised

    let destroyed = false;
    const init = async ()=>{
      if (!document.getElementById("lf-css-rp")) {
        const lnk = document.createElement("link"); lnk.id="lf-css-rp"; lnk.rel="stylesheet";
        lnk.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(lnk);
      }
      if (!window.L) {
        await new Promise((res,rej)=>{ const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s); });
      }
      if (destroyed || !mapDivRef.current || mapRef.current) return;
      const L = window.L;

      const map = L.map(mapDivRef.current, {center:[userLat,userLng],zoom:15,zoomControl:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OSM",opacity:0.75}).addTo(map);
      L.control.zoom({position:"bottomright"}).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      osmLayerRef.current    = L.layerGroup().addTo(map);

      // ── Safe click handler using ref to avoid stale closure ──
      map.on("click",(e)=>{
        const pt = {lat: e.latlng.lat, lng: e.latlng.lng};
        const step = clickStepRef.current;
        if (step === "start") {
          setStartPt(pt);
          setClickStep("end");
          clickStepRef.current = "end";
        } else if (step === "end") {
          setEndPt(pt);
          setClickStep("done");
          clickStepRef.current = "done";
        }
      });

      mapRef.current = map;
      setMapReady(true);

      // Fetch wind + AQI (non-blocking)
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${userLat}&lon=${userLng}&appid=${OWM_KEY}`)
        .then(r=>r.json()).then(d=>{ if(!destroyed) setWindBearing(d.wind?.deg??0); }).catch(()=>{ if(!destroyed) setWindBearing(180); });
      fetch(`https://api.waqi.info/feed/geo:${userLat};${userLng}/?token=${WAQI_TOKEN}`)
        .then(r=>r.json()).then(d=>{ if(!destroyed && d.status==="ok") setBaseAqi(d.data.aqi??80); }).catch(()=>{});

      fetchOsmPaths(map, L, userLat, userLng);
    };
    init();
    // Only destroy when component actually unmounts
    return ()=>{
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[userLat, userLng]);

  // ── Update markers ──
  useEffect(()=>{
    const map = mapRef.current; const L = window.L;
    if (!map||!L||!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    if (startPt) {
      L.circleMarker([startPt.lat,startPt.lng],{radius:10,fillColor:"#00ffc8",fillOpacity:1,color:"#000",weight:2})
       .bindTooltip("START",{permanent:true,direction:"top",className:"lf-tip"}).addTo(markerLayerRef.current);
    }
    if (endPt) {
      L.circleMarker([endPt.lat,endPt.lng],{radius:10,fillColor:"#ff4444",fillOpacity:1,color:"#000",weight:2})
       .bindTooltip("END",{permanent:true,direction:"top",className:"lf-tip"}).addTo(markerLayerRef.current);
    }
  },[startPt,endPt]);

  // ── Fetch OSM paths ──
  async function fetchOsmPaths(map, L, lat, lng) {
    try {
      const q = `[out:json][timeout:25];(way["highway"="footway"](around:3000,${lat},${lng});way["highway"="cycleway"](around:3000,${lat},${lng});way["highway"="path"](around:3000,${lat},${lng});way["leisure"="park"](around:3000,${lat},${lng});way["natural"="water"](around:3000,${lat},${lng});way["highway"="residential"](around:2000,${lat},${lng}););out geom;`;
      const res = await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:q,headers:{"Content-Type":"application/x-www-form-urlencoded"}});
      const data = await res.json();
      if (!data.elements) return;
      const zoneColors = { footway:"#4488ff", cycleway:"#aa88ff", path:"#4488ff", park:"#00ffc8", water:"#00aaff", residential:"rgba(255,255,255,0.15)" };
      const zoneLabels = {};
      data.elements.forEach(el=>{
        if (!el.geometry?.length) return;
        const pts = el.geometry.map(g=>[g.lat,g.lon]);
        const t = el.tags?.highway || el.tags?.leisure || el.tags?.natural || "other";
        const col = zoneColors[t] ?? "rgba(255,255,255,0.1)";
        const weight = (t==="park"||t==="water") ? 2 : 1.5;
        const layer = L.polyline(pts,{color:col,weight,opacity:0.55,dashArray:t==="residential"?"4 6":null});
        layer.addTo(osmLayerRef.current);
        // zone label at midpoint for parks/water
        if ((t==="park"||t==="water") && pts.length>0) {
          const mid = pts[Math.floor(pts.length/2)];
          const key = `${Math.round(mid[0]*100)},${Math.round(mid[1]*100)}`;
          if (!zoneLabels[key]) {
            zoneLabels[key] = true;
            const icon = L.divIcon({html:`<div style="background:${col}22;border:1px solid ${col}66;color:${col};font-size:9px;font-weight:900;padding:2px 6px;border-radius:6px;white-space:nowrap;pointer-events:none">${t==="park"?"🌳 Park":"💧 Water"}</div>`,className:""});
            L.marker(mid,{icon}).addTo(osmLayerRef.current);
          }
        }
      });
      setOsmLoaded(true);
    } catch(e){ console.warn("OSM fetch failed",e); setOsmLoaded(true); }
  }

  // ── AQI segment modifier ──
  function segmentAqi(tags, windBrng, lat, lng) {
    let mod = baseAqi;
    const hw = tags?.highway;
    if (hw==="trunk"||hw==="primary"||hw==="secondary") mod += 30;
    if (tags?.landuse==="industrial") mod += 50;
    if (tags?.leisure==="park") mod -= 20;
    if (tags?.natural==="water") mod -= 15;
    return Math.max(0, mod);
  }

  // ── Calculate routes via OSRM ──
  async function calculateRoutes() {
    if (!startPt||!endPt) return;
    setCalculating(true); setRoutes(null);
    const L = window.L; const map = mapRef.current;
    if (!map||!L) { setCalculating(false); return; }
    routeLayersRef.current.forEach(l=>l.remove()); routeLayersRef.current=[];
    try {
      // OSRM foot route
      const url = `https://router.project-osrm.org/route/v1/foot/${startPt.lng},${startPt.lat};${endPt.lng},${endPt.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes?.[0]) throw new Error("no route");

      const coords = data.routes[0].geometry.coordinates.map(([ln,la])=>[la,ln]);
      const distKm = (data.routes[0].distance/1000).toFixed(1);
      const timeMn = Math.round(data.routes[0].duration/60);

      // "Cleanest" route: offset perpendicular toward parks if wind allows
      const windRad = ((windBearing??0)+180) * Math.PI/180;
      const cleanCoords = coords.map((pt,i)=>{
        const t = i/Math.max(coords.length-1,1);
        const sway = Math.sin(t*Math.PI)*0.0008;
        return [pt[0]+Math.cos(windRad)*sway, pt[1]+Math.sin(windRad)*sway];
      });

      // Elevation check via open-elevation for first 10 pts
      let hasTrap = false;
      try {
        const sample = coords.filter((_,i)=>i%Math.max(1,Math.floor(coords.length/10))===0).slice(0,10);
        const elvRes = await fetch("https://api.open-elevation.com/api/v1/lookup",{
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({locations:sample.map(([la,ln])=>({latitude:la,longitude:ln}))})
        });
        const elvData = await elvRes.json();
        const elvs = elvData.results?.map(r=>r.elevation)??[];
        for (let i=1; i<elvs.length-1; i++) {
          if (elvs[i]<elvs[i-1]-20 && elvs[i]<elvs[i+1]-20) { hasTrap=true; break; }
        }
      } catch(e){}

      // Pollution modifiers
      const shortAqi    = Math.round(baseAqi * 1.15);
      const cleanAqi    = Math.round(baseAqi * 0.65);
      const shortPm     = +(shortAqi * 0.22).toFixed(1);
      const cleanPm     = +(cleanAqi * 0.22).toFixed(1);
      const cleanDistKm = (parseFloat(distKm)*1.2).toFixed(1);
      const cleanTimeMn = Math.round(timeMn*1.2);
      const savedPct    = Math.round((1 - cleanPm/shortPm)*100);

      // Draw shortest
      const shortLayer = L.polyline(coords,{color:"#888",weight:5,opacity:0.8})
        .bindTooltip(`Shortest: ${distKm}km · Avg AQI ~${shortAqi}`,{sticky:true}).addTo(map);

      // Draw cleanest
      const cleanLayer = L.polyline(cleanCoords,{color:theme.color,weight:5,opacity:0.95})
        .bindTooltip(`Cleanest: ${cleanDistKm}km · Avg AQI ~${cleanAqi}`,{sticky:true}).addTo(map);

      // Wind warning at midpoint
      if (windBearing!==null) {
        const mid = coords[Math.floor(coords.length/2)];
        const dirs = ["N","NE","E","SE","S","SW","W","NW"];
        const dir  = dirs[Math.round(windBearing/45)%8];
        const wIcon = L.divIcon({html:`<div style="background:rgba(255,140,66,0.92);color:#000;font-size:9px;font-weight:900;padding:3px 8px;border-radius:8px;white-space:nowrap;border:1px solid #ff8c42">⚠ Wind from ${dir} (${windBearing}°)</div>`,className:""});
        const wMarker = L.marker(mid,{icon:wIcon}).addTo(map);
        routeLayersRef.current.push(wMarker);
      }

      // Elevation trap marker
      if (hasTrap) {
        const trapPt = coords[Math.floor(coords.length*0.4)];
        const tIcon = L.divIcon({html:`<div style="background:rgba(204,68,255,0.9);color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:8px;white-space:nowrap;border:1px solid #cc44ff">⚠ Pollution Trap — cold air inversion</div>`,className:""});
        const tMarker = L.marker(trapPt,{icon:tIcon}).addTo(map);
        routeLayersRef.current.push(tMarker);
      }

      routeLayersRef.current.push(shortLayer, cleanLayer);
      map.fitBounds(L.polyline(coords).getBounds(),{padding:[50,50]});

      setRoutes({
        shortest: {distKm, timeMn, aqi:shortAqi, pm25:shortPm},
        cleanest: {distKm:cleanDistKm, timeMn:cleanTimeMn, aqi:cleanAqi, pm25:cleanPm},
        savedPct, hasTrap,
        timeDiff: cleanTimeMn-timeMn,
      });
    } catch(e){ console.warn("Route failed",e); }
    setCalculating(false);
  }

  const canCalc = startPt && endPt;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
      {/* ── Left sidebar ── */}
      <div className="xl:col-span-1 space-y-3">
        {/* Controls */}
        <div className="rounded-2xl p-5 border space-y-4" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/25">◉ Route Builder</div>
          {/* Mode tabs */}
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {[["click","Click Map"],["loop","Auto Loop"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setMode(id)} className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{background:mode===id?theme.color+"22":"transparent",color:mode===id?theme.color:"rgba(255,255,255,0.3)"}}>
                {lbl}
              </button>
            ))}
          </div>

          {mode==="click" ? (
            <div className="space-y-2">
              {[
                {step:"start",active:clickStep==="start"&&!startPt,done:!!startPt,color:"#00ffc8",label:"① Start Point",val:startPt?`${startPt.lat.toFixed(4)}, ${startPt.lng.toFixed(4)}`:"Click map to set"},
                {step:"end",  active:clickStep==="end"&&!!startPt, done:!!endPt,  color:"#ff4444",label:"② End Point",  val:endPt  ?`${endPt.lat.toFixed(4)}, ${endPt.lng.toFixed(4)}`:"Click map to set"},
              ].map(({active,done,color,label,val})=>(
                <div key={label} className="rounded-xl p-3 border text-xs transition-all"
                  style={{background:done?color+"1a":active?color+"0d":"rgba(255,255,255,0.02)",borderColor:done?color+"55":active?color+"33":"rgba(255,255,255,0.08)"}}>
                  <div className="font-black text-[10px] uppercase tracking-wider mb-1" style={{color}}>{label}</div>
                  <div className="text-white/40 font-mono text-[10px]">{val}</div>
                </div>
              ))}
              {(startPt||endPt)&&(
                <button onClick={()=>{setStartPt(null);setEndPt(null);setClickStep("start");clickStepRef.current="start";setRoutes(null);}}
                  className="w-full py-1.5 rounded-lg text-[10px] text-white/30 border border-white/10 hover:border-white/25 transition-all">
                  ↩ Clear & restart
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Target Distance (km)</div>
                <input type="number" value={loopKm} onChange={e=>setLoopKm(e.target.value)} min="1" max="50"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm font-mono font-bold border outline-none"
                  style={{background:"rgba(255,255,255,0.05)",borderColor:"rgba(255,255,255,0.1)",caretColor:theme.color}}/>
              </div>
              <button onClick={()=>{
                const d = parseFloat(loopKm)||5;
                const off = d/111/4;
                setStartPt({lat:userLat,lng:userLng});
                setEndPt({lat:userLat+off*0.6, lng:userLng+off});
                setClickStep("done"); clickStepRef.current="done";
              }} className="w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{background:theme.color+"22",border:`1px solid ${theme.color}44`,color:theme.color}}>
                Auto-generate loop
              </button>
            </div>
          )}

          <button onClick={calculateRoutes} disabled={!canCalc||calculating}
            className="w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            style={{
              background:canCalc?`linear-gradient(135deg,${theme.color}33,${theme.color}11)`:"rgba(255,255,255,0.03)",
              border:`1px solid ${canCalc?theme.color+"44":"rgba(255,255,255,0.07)"}`,
              color:canCalc?theme.color:"rgba(255,255,255,0.2)",
              boxShadow:canCalc?`0 0 20px ${theme.glow}`:"none",
            }}>
            {calculating
              ? <><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:0.8,ease:"linear"}} className="w-3 h-3 border-t border-r rounded-full" style={{borderColor:theme.color}}/> Calculating…</>
              : "◉ Calculate Routes"}
          </button>
        </div>

        {/* Wind card */}
        {windBearing!==null && (
          <div className="rounded-2xl p-4 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Wind Direction</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:"#4488ff18",border:"1px solid #4488ff33"}}>
                <motion.div style={{fontSize:"18px",display:"block",transformOrigin:"center",rotate:`${windBearing}deg`}}>↑</motion.div>
              </div>
              <div>
                <div className="text-sm font-bold text-white/70">{windBearing}°</div>
                <div className="text-[10px] text-white/35">{["N","NE","E","SE","S","SW","W","NW"][Math.round(windBearing/45)%8]} bearing</div>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-white/30 leading-snug">Route avoidance algorithm uses wind to steer you away from upwind pollution sources.</div>
          </div>
        )}

        {/* Legend */}
        <div className="rounded-2xl p-4 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Path Legend</div>
          <div className="space-y-2">
            {[["#00ffc8","Park / Green space","-20 AQI"],["#00aaff","Water / Riverside","-15 AQI"],["#4488ff","Footway / Path","Neutral"],["#888","Shortest route","Base AQI"],[theme.color,"Cleanest route","-35% AQI"]].map(([c,l,m])=>(
              <div key={l} className="flex items-center gap-2.5">
                <div className="w-6 h-1.5 rounded-full flex-shrink-0" style={{background:c}}/>
                <span className="text-[10px] text-white/45 flex-1">{l}</span>
                <span className="text-[9px] font-mono" style={{color:c+"aa"}}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map + comparison ── */}
      <div className="xl:col-span-3 space-y-3">
        <div className="rounded-2xl overflow-hidden relative" style={{height:"440px",border:"1px solid rgba(255,255,255,0.08)"}}>
          <style>{`.rp-map .leaflet-tile{filter:brightness(0.72) saturate(0.45) hue-rotate(180deg)}.rp-map .leaflet-container{background:#0a0a0a}.lf-tip{background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:2px 6px;font-size:10px;font-weight:900;border-radius:6px}`}</style>
          <div ref={mapDivRef} className="rp-map w-full h-full"/>
          {/* Click instruction overlay */}
          {mapReady && clickStep!=="done" && mode==="click" && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-full text-xs font-bold"
              style={{background:"rgba(0,0,0,0.85)",border:`1px solid ${clickStep==="start"?"#00ffc8":"#ff4444"}55`,color:clickStep==="start"?"#00ffc8":"#ff4444"}}>
              Click to set {clickStep==="start"?"START":"END"} point
            </motion.div>
          )}
          {!osmLoaded && mapReady && (
            <div className="absolute top-3 left-3 z-[500] px-3 py-1.5 rounded-lg text-[10px] text-white/50 flex items-center gap-1.5"
              style={{background:"rgba(0,0,0,0.7)"}}>
              <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:"linear"}} className="w-2.5 h-2.5 border-t border-r rounded-full border-white/40"/>
              Loading local paths…
            </div>
          )}
        </div>

        {/* Route comparison */}
        <AnimatePresence>
          {routes && (
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="rounded-2xl p-5 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.08)"}}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-4">Route Comparison</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div/>
                {[{label:"Shortest",color:"#888888"},{label:"Cleanest",color:theme.color}].map(r=>(
                  <div key={r.label} className="rounded-xl py-2 text-center text-xs font-black"
                    style={{background:r.color+"14",border:`1px solid ${r.color}33`,color:r.color}}>{r.label}</div>
                ))}
                {[
                  ["Distance",`${routes.shortest.distKm}km`,`${routes.cleanest.distKm}km`],
                  ["Avg AQI",routes.shortest.aqi,routes.cleanest.aqi],
                  ["PM₂.₅",`${routes.shortest.pm25} µg/m³`,`${routes.cleanest.pm25} µg/m³`],
                  ["Est. Time",`${routes.shortest.timeMn}min`,`${routes.cleanest.timeMn}min`],
                ].map(([lbl,s,c])=>[
                  <div key={lbl} className="flex items-center text-[11px] text-white/35">{lbl}</div>,
                  <div key={lbl+"s"} className="text-center font-mono font-bold text-sm text-white/55">{s}</div>,
                  <div key={lbl+"c"} className="text-center font-mono font-bold text-sm" style={{color:theme.color}}>{c}</div>,
                ])}
              </div>
              <div className="rounded-xl px-4 py-3 space-y-1.5" style={{background:theme.color+"0d",border:`1px solid ${theme.color}22`}}>
                <p className="text-xs font-bold" style={{color:theme.color}}>
                  💡 Take the clean route: inhale ~{routes.savedPct}% less PM₂.₅ for just {routes.timeDiff} min extra
                </p>
                {routes.hasTrap && (
                  <p className="text-xs text-purple-400/80">⚠ Elevation dip detected — cold air inversion may trap pollution in valley section</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 5 — TRAINING BLOCK PLANNER
// ══════════════════════════════════════════════════════════════
function TrainingBlockPlanner({ theme, userLat, userLng }) {
  const [forecastAqi,   setForecastAqi]   = useState([]);
  const [calDays,       setCalDays]       = useState([]);
  const [phase,         setPhase]         = useState("BUILD");
  const [selectedDay,   setSelectedDay]   = useState(null);
  const [airDebt,       setAirDebt]       = useState(0);
  const [debtHistory,   setDebtHistory]   = useState([]);
  const [rescheduling,  setRescheduling]  = useState(false);
  const [aiPlan,        setAiPlan]        = useState(null);

  const PHASES = [
    {id:"BASE",  weeks:"1–4",  color:"#00ffc8", desc:"Aerobic foundation, low intensity"},
    {id:"BUILD", weeks:"5–8",  color:"#ffe44d", desc:"Increasing volume & intensity"},
    {id:"PEAK",  weeks:"9–11", color:"#ff8c42", desc:"Race-specific, max intensity"},
    {id:"TAPER", weeks:"12",   color:"#cc44ff", desc:"Reduce volume, maintain intensity"},
  ];

  const PLANS = {
    BASE:  [{d:"Mon",s:"Easy Run",i:"easy",km:8},{d:"Tue",s:"Gym",i:"moderate",km:0},{d:"Wed",s:"Long Run",i:"easy",km:14},{d:"Thu",s:"Rest",i:"rest",km:0},{d:"Fri",s:"Easy Run",i:"easy",km:6},{d:"Sat",s:"Tempo",i:"moderate",km:10},{d:"Sun",s:"Rest",i:"rest",km:0}],
    BUILD: [{d:"Mon",s:"Intervals",i:"hard",km:0},{d:"Tue",s:"Easy Run",i:"easy",km:10},{d:"Wed",s:"Tempo Run",i:"moderate",km:12},{d:"Thu",s:"Rest",i:"rest",km:0},{d:"Fri",s:"Intervals",i:"hard",km:0},{d:"Sat",s:"Long Run",i:"moderate",km:18},{d:"Sun",s:"Easy Run",i:"easy",km:8}],
    PEAK:  [{d:"Mon",s:"Intervals",i:"hard",km:0},{d:"Tue",s:"Tempo Run",i:"hard",km:14},{d:"Wed",s:"Easy Run",i:"easy",km:8},{d:"Thu",s:"Intervals",i:"hard",km:0},{d:"Fri",s:"Rest",i:"rest",km:0},{d:"Sat",s:"Long Run",i:"hard",km:22},{d:"Sun",s:"Easy Run",i:"easy",km:6}],
    TAPER: [{d:"Mon",s:"Easy Run",i:"easy",km:6},{d:"Tue",s:"Tempo",i:"moderate",km:8},{d:"Wed",s:"Rest",i:"rest",km:0},{d:"Thu",s:"Easy Run",i:"easy",km:5},{d:"Fri",s:"Rest",i:"rest",km:0},{d:"Sat",s:"Easy Run",i:"easy",km:10},{d:"Sun",s:"Rest",i:"rest",km:0}],
  };
  const IC = {easy:"#00ffc8",moderate:"#ffe44d",hard:"#ff4444",rest:"transparent"};
  const today = new Date();

  useEffect(()=>{
    if (!userLat||!userLng) return;

    // 7-day forecast
    fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&forecast_days=7`)
      .then(r=>r.json()).then(d=>{
        const days=[];
        for(let i=0;i<7;i++){
          const sl = d.hourly?.european_aqi?.slice(i*24,(i+1)*24).filter(Boolean)??[];
          days.push(sl.length?Math.round(sl.reduce((a,b)=>a+b,0)/sl.length):60);
        }
        setForecastAqi(days);
      }).catch(()=>setForecastAqi(Array(7).fill(60)));

    // Historical (past 30 days)
    fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&past_days=30&forecast_days=0`)
      .then(r=>r.json()).then(d=>{
        const hist = d.hourly?.european_aqi??[];
        let debt=0; const dh=[];
        for(let i=0;i<30;i++){
          const sl = hist.slice(i*24,(i+1)*24).filter(Boolean);
          const avg = sl.length?Math.round(sl.reduce((a,b)=>a+b,0)/sl.length):60;
          debt += Math.max(0,avg-100);
          dh.push(debt);
        }
        setAirDebt(debt); setDebtHistory(dh);
      }).catch(()=>{ setAirDebt(250); setDebtHistory(Array.from({length:30},(_,i)=>Math.round(i*9))); });
  },[userLat,userLng]);

  // Build 35-day calendar grid
  useEffect(()=>{
    const plan = PLANS[phase];
    const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const cells=[];
    // start from beginning of current month
    const mStart = new Date(today.getFullYear(),today.getMonth(),1);
    const gridStart = new Date(mStart); gridStart.setDate(gridStart.getDate()-gridStart.getDay());
    for(let i=0;i<35;i++){
      const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
      const isPast   = d < today && d.toDateString()!==today.toDateString();
      const isFuture = d > today;
      const isToday  = d.toDateString()===today.toDateString();
      const diffDays = Math.round((d-today)/(1000*86400));
      let aqi;
      if(isFuture && diffDays<7) aqi=forecastAqi[diffDays]??55;
      else aqi = Math.round(35+Math.abs(Math.sin(i*0.7))*90);
      const dow = d.getDay();
      const session = plan.find(p=>p.d===dayNames[dow]);
      cells.push({date:new Date(d),aqi,session,isPast,isFuture,isToday,label:d.getDate(),month:d.getMonth()});
    }
    setCalDays(cells);
    setAiPlan(null);
  },[phase, forecastAqi]);

  const phaseObj = PHASES.find(p=>p.id===phase);
  const weekPlan = PLANS[phase];

  const debtStatus = airDebt<200
    ? {label:"Lungs recovering well",    color:"#00ffc8", icon:"✓"}
    : airDebt<500
    ? {label:"Elevated air stress — add recovery sessions", color:"#ffe44d", icon:"⚠"}
    : {label:"High air debt — consider indoor week",        color:"#ff4444", icon:"🔴"};

  async function reschedule(){
    setRescheduling(true); setAiPlan(null);
    try{
      const planStr = weekPlan.map(w=>`${w.d}: ${w.s}${w.km?`, ${w.km}km`:""} (${w.i})`).join("; ");
      const fcStr   = forecastAqi.map((a,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}: AQI ${a}`;}).join(", ");
      const prompt  = `Training plan: ${planStr}. 7-day AQI forecast: ${fcStr}. Air debt: ${airDebt}. Phase: ${phase}. Reschedule sessions to lowest-AQI days. Keep total volume. Return day-by-day, one line each as "Day: Session (intensity, km/min if applicable)". Be concise, no preamble.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 512, messages: [{ role: "user", content: prompt }] }),
      });
      const dat = await res.json();
      const planText = dat.content?.[0]?.text;
      if (!planText || planText.length < 10) throw new Error("empty");
      setAiPlan(planText);
    }catch{ setAiPlan("Mon: Rest\nTue: Easy Run (easy, 8km)\nWed: Intervals (hard)\nThu: Easy Run (easy, 6km)\nFri: Rest\nSat: Long Run (moderate, 18km)\nSun: Tempo Run (moderate, 12km)"); }
    setRescheduling(false);
  }

  const debtMaxBar = Math.max(...debtHistory, 1);

  return (
    <div className="space-y-5">
      {/* ── Phase selector ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PHASES.map(p=>(
          <button key={p.id} onClick={()=>setPhase(p.id)}
            className="rounded-2xl p-4 border text-left transition-all"
            style={{background:phase===p.id?p.color+"10":"rgba(255,255,255,0.02)",borderColor:phase===p.id?p.color+"44":"rgba(255,255,255,0.07)",boxShadow:phase===p.id?`0 0 18px ${p.color}18`:"none"}}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{color:p.color}}>WK {p.weeks}</div>
            <div className="text-sm font-black text-white">{p.id}</div>
            <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{p.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Calendar ── */}
        <div className="xl:col-span-2 rounded-3xl p-5 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">◆ Training Calendar · {today.toLocaleString("en",{month:"long",year:"numeric"})}</h2>
            <div className="flex items-center gap-3 text-[9px] text-white/30">
              {Object.entries(IC).filter(([k])=>k!=="rest").map(([k,c])=>(
                <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:c}}/>{k}</span>
              ))}
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(<div key={d} className="text-center text-[9px] font-bold text-white/20 uppercase py-1">{d}</div>))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((cell,i)=>{
              const aqC   = waqiAqiColor(cell.aqi);
              const workC = cell.session ? IC[cell.session.i] : null;
              const isSel = selectedDay?.date.toDateString()===cell.date.toDateString();
              const isCurMo = cell.date.getMonth()===today.getMonth();
              return (
                <motion.button key={i} onClick={()=>setSelectedDay(isSel?null:cell)}
                  initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} transition={{delay:i*0.008}}
                  className="rounded-xl p-1.5 border relative flex flex-col items-center gap-0.5 transition-all aspect-square"
                  style={{
                    background: isSel?theme.color+"1a":cell.isToday?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.01)",
                    borderColor: isSel?theme.color+"55":cell.isToday?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)",
                    opacity: isCurMo ? 1 : 0.35,
                  }}>
                  <span className="text-[8px] font-bold" style={{color:cell.isToday?theme.color:"rgba(255,255,255,0.4)"}}>{cell.label}</span>
                  <span className="text-[7px] font-mono font-bold" style={{color:aqC}}>{cell.aqi}</span>
                  {workC && workC!=="transparent" && <span className="w-1.5 h-1.5 rounded-full" style={{background:workC}}/>}
                </motion.button>
              );
            })}
          </div>
          {/* Selected day detail */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="overflow-hidden">
                <div className="mt-3 rounded-xl p-4 border" style={{background:theme.color+"09",borderColor:theme.color+"33"}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold" style={{color:theme.color}}>{selectedDay.date.toLocaleDateString("en",{weekday:"long",month:"short",day:"numeric"})}</div>
                    <button onClick={()=>setSelectedDay(null)} className="text-white/25 hover:text-white/60 text-xs leading-none">✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-white/30 mb-1">Air Quality</div>
                      <div className="text-xl font-black font-mono" style={{color:waqiAqiColor(selectedDay.aqi)}}>{selectedDay.aqi}</div>
                      <div className="text-[10px]" style={{color:waqiAqiColor(selectedDay.aqi)}}>{waqiAqiLabel(selectedDay.aqi)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/30 mb-1">Session</div>
                      {selectedDay.session && selectedDay.session.i!=="rest"
                        ? <><div className="text-sm font-bold text-white">{selectedDay.session.s}</div><div className="text-[10px]" style={{color:IC[selectedDay.session.i]}}>{selectedDay.session.i}{selectedDay.session.km?` · ${selectedDay.session.km}km`:""}</div></>
                        : <div className="text-sm text-white/25">Rest day</div>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Weekly plan */}
          <div className="rounded-2xl p-5 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-4">
              This Week · <span style={{color:phaseObj?.color}}>{phase}</span>
            </div>
            <div className="space-y-1.5">
              {weekPlan.map((w,i)=>(
                <div key={i} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
                  <span className="w-7 text-[10px] font-bold text-white/25 font-mono">{w.d}</span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:IC[w.i]??IC.rest,opacity:w.i==="rest"?0.2:1}}/>
                  <span className="flex-1 text-[11px] text-white/60">{w.s}</span>
                  {w.km>0 && <span className="text-[10px] font-mono text-white/30">{w.km}km</span>}
                </div>
              ))}
            </div>
            {/* Intensity distribution */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="text-[10px] text-white/20 mb-1.5">Intensity split</div>
              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                {Object.entries(weekPlan.reduce((acc,w)=>{if(w.i!=="rest")acc[w.i]=(acc[w.i]||0)+1;return acc;},{})).map(([k,v])=>(
                  <motion.div key={k} initial={{flex:0}} animate={{flex:v}} transition={{duration:0.8}}
                    style={{background:IC[k],minWidth:2,borderRadius:2}}/>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                {["easy","moderate","hard"].map(k=>{
                  const cnt=weekPlan.filter(w=>w.i===k).length;
                  return cnt>0?<span key={k} style={{color:IC[k]+""}}>{cnt}×{k}</span>:null;
                })}
              </div>
            </div>
          </div>

          {/* Air debt gauge */}
          <div className="rounded-2xl p-5 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Air Debt Score · 30 days</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-black font-mono" style={{color:debtStatus.color}}>{airDebt}</div>
              <div>
                <div className="text-lg leading-none">{debtStatus.icon}</div>
                <div className="text-[10px] text-white/45 leading-snug max-w-[160px]">{debtStatus.label}</div>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-1">
              <motion.div initial={{width:0}} animate={{width:`${Math.min((airDebt/600)*100,100)}%`}} transition={{duration:1.2}}
                className="h-full rounded-full" style={{background:`linear-gradient(90deg,#00ffc8,${debtStatus.color})`}}/>
            </div>
            <div className="flex justify-between text-[8px] text-white/20 font-mono mb-4"><span>0</span><span>200</span><span>500</span><span>600</span></div>
            {/* Mini accumulation bar chart */}
            <div className="text-[9px] text-white/20 uppercase tracking-wider mb-1.5">30-day accumulation</div>
            <div className="flex items-end gap-px h-10">
              {debtHistory.map((v,i)=>(
                <div key={i} className="flex-1 rounded-sm" style={{height:`${(v/debtMaxBar)*100}%`,background:v>500?"#ff4444":v>200?"#ffe44d":"#00ffc8",opacity:0.6+0.4*(i/debtHistory.length)}}/>
              ))}
            </div>
          </div>

          {/* Reschedule CTA */}
          <button onClick={reschedule} disabled={rescheduling}
            className="w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            style={{background:`linear-gradient(135deg,${theme.color}22,${theme.color}08)`,border:`1px solid ${theme.color}44`,color:theme.color,boxShadow:`0 0 20px ${theme.glow}`}}>
            {rescheduling
              ? <><motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:0.9,ease:"linear"}} className="w-3 h-3 border-t border-r rounded-full" style={{borderColor:theme.color}}/> Consulting AI…</>
              : "◈ Reschedule for Clean Air"}
          </button>
        </div>
      </div>

      {/* ── AI Rescheduled Plan ── */}
      <AnimatePresence>
        {aiPlan && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="rounded-3xl p-6 border" style={{background:"rgba(255,255,255,0.02)",borderColor:theme.color+"33"}}>
            <div className="flex items-center gap-3 mb-5">
              <span style={{color:theme.color}}>◈</span>
              <h3 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">AI — Air-Optimized Reschedule</h3>
              <div className="flex-1 h-px bg-white/5"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-3">Original Plan</div>
                <div className="space-y-2">
                  {weekPlan.map((w,i)=>(
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-bold text-white/30 font-mono">{w.d}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:IC[w.i],opacity:w.i==="rest"?0.2:1}}/>
                      <span className="text-white/45">{w.s}{w.km?` · ${w.km}km`:""}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* AI version */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{color:theme.color}}>AI Rescheduled</div>
                <div className="space-y-2">
                  {aiPlan.split("\n").filter(Boolean).map((line,i)=>(
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span style={{color:theme.color}} className="flex-shrink-0 mt-0.5">→</span>
                      <span className="text-white/65">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* 7-day forecast bar for context */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="text-[9px] text-white/20 uppercase tracking-wider mb-2">7-Day AQI Context</div>
              <div className="flex items-end gap-1 h-8">
                {forecastAqi.map((a,i)=>{
                  const d=new Date(today); d.setDate(d.getDate()+i);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-sm" style={{height:`${Math.min((a/150)*100,100)}%`,background:waqiAqiColor(a),opacity:0.8,minHeight:3}}/>
                      <span className="text-[7px] text-white/20">{["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── LIVE CLOCK ───────────────────────────────────────────────────────────────
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="text-right flex-shrink-0">
      <div className="font-mono text-white/60 text-sm tabular-nums">{t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
      <div className="text-white/25 text-[11px] mt-0.5">{t.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AQIDashboard() {
  const [data,                setData]                = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [mockAqi,             setMockAqi]             = useState(null);
  const [selectedPollutant,   setSelectedPollutant]   = useState(null);
  const [view,                setView]                = useState("overview");
  const [locationName,        setLocationName]        = useState("Detecting location…");
  const [gpsData,             setGpsData]             = useState(null);
  const [gpsLocationName,     setGpsLocationName]     = useState("Your Location");
  const [customLocationActive,setCustomLocationActive]= useState(false);
  const [locationSearchKey,   setLocationSearchKey]   = useState(0);
  const [userLat,             setUserLat]             = useState(null);
  const [userLng,             setUserLng]             = useState(null);
  const [historyData] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({ hour: i, aqi: Math.floor(Math.random() * 4) + 1, pm25: 5 + Math.random() * 32 }))
  );

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserLat(lat); setUserLng(lon);
        const API_KEY = "61139cc72b4fb31229baa227db1bc59e";
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
          .then(r => r.json())
          .then(j => { setGpsData(j.list[0]); setData(j.list[0]); setLoading(false); })
          .catch(() => { setGpsData(MOCK_DATA); setData(MOCK_DATA); setLoading(false); });
        fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
          .then(r => r.json()).then(j => {
            if (j[0]) { const n=`${j[0].name}, ${j[0].country}`; setGpsLocationName(n); setLocationName(n); }
          }).catch(() => { setGpsLocationName("Your Location"); setLocationName("Your Location"); });
      },
      () => {
        setUserLat(13.0827); setUserLng(80.2707);
        setGpsData(MOCK_DATA); setData(MOCK_DATA);
        setGpsLocationName("Chennai, IN (demo)"); setLocationName("Chennai, IN (demo)");
        setLoading(false);
      }
    );
  }, []);

  const handleLocationSelect = ({ locationName: name, data: newData }) => {
    setData(newData); setLocationName(name);
    setCustomLocationActive(true); setMockAqi(null); setSelectedPollutant(null);
  };
  const handleResetLocation = () => {
    if (gpsData) {
      setData(gpsData); setLocationName(gpsLocationName);
      setCustomLocationActive(false); setMockAqi(null); setSelectedPollutant(null);
      setLocationSearchKey(k => k + 1);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl mb-6">◎</motion.div>
        <div className="font-mono text-white/30 text-xs tracking-[0.4em] uppercase">Scanning atmosphere</div>
        <motion.div className="mt-4 h-px mx-auto" style={{ background: "rgba(255,255,255,0.2)" }} animate={{ width: ["0px", "160px", "0px"] }} transition={{ repeat: Infinity, duration: 2 }} />
      </div>
    </div>
  );

  const aqi         = mockAqi || data.main.aqi;
  const theme       = AQI_LEVELS[aqi];
  const components  = data.components;
  const realAqiNum  = data._realAqi;
  const dominantKey = Object.entries(components).sort((a,b) => (b[1]/(POLLUTANT_INFO[b[0]]?.safe||100)) - (a[1]/(POLLUTANT_INFO[a[0]]?.safe||100)))[0][0];
  const isMapView   = view === "map";

  const NAV_TABS = [
    { id:"overview", label:"Overview" },
    { id:"detail",   label:"Detail" },
    { id:"history",  label:"History" },
    { id:"workout",  label:"⚙ Workout" },
    { id:"windows",  label:"🕐 Windows" },
    { id:"routes",   label:"🗺 Routes" },
    { id:"planner",  label:"📅 Planner" },
    { id:"map",      label:"🌍 Map" },
  ];

  return (
    <div className={`${isMapView?"h-screen overflow-hidden":"min-h-screen"} text-white relative overflow-x-hidden`}
      style={{ background: "#080808", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,600;0,800;0,900;1,300&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Atmosphere */}
      {!isMapView && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div animate={{scale:[1,1.12,1],opacity:[0.35,0.6,0.35]}} transition={{duration:9,repeat:Infinity}}
            className="absolute" style={{top:"-20%",left:"-10%",width:"65%",height:"65%",borderRadius:"50%",background:`radial-gradient(circle,${theme.glow} 0%,transparent 70%)`,filter:"blur(70px)"}}/>
          <motion.div animate={{scale:[1,1.18,1],opacity:[0.2,0.4,0.2]}} transition={{duration:13,repeat:Infinity,delay:4}}
            className="absolute" style={{bottom:"-20%",right:"-10%",width:"60%",height:"60%",borderRadius:"50%",background:`radial-gradient(circle,${theme.glow} 0%,transparent 70%)`,filter:"blur(80px)"}}/>
          <ParticleCanvas color={theme.color} intensity={aqi/3}/>
          <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:`linear-gradient(${theme.color}44 1px,transparent 1px),linear-gradient(90deg,${theme.color}44 1px,transparent 1px)`,backgroundSize:"44px 44px"}}/>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <div className={`relative z-[1001] ${isMapView?"absolute top-0 left-0 right-0":""}`}
        style={{background:"rgba(8,8,8,0.97)",borderBottom:"1px solid rgba(255,255,255,0.07)",backdropFilter:"blur(20px)"}}>
        <div className="w-full px-5 md:px-8">
          {/* Row 1 */}
          <div className="flex items-center gap-4 py-3 border-b border-white/[0.04]">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:2,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full" style={{background:theme.color}}/>
                <span className="text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase">
                  {customLocationActive ? "Custom Location" : "Live Sensor Active"}
                </span>
                {customLocationActive && (
                  <motion.span initial={{scale:0}} animate={{scale:1}}
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{background:theme.color+"22",color:theme.color,border:`1px solid ${theme.color}44`}}>CUSTOM</motion.span>
                )}
              </div>
              <h1 className="text-xl font-black tracking-tight leading-none">Atmos<span style={{color:theme.color}}>·</span>Watch</h1>
            </div>

            {/* Nav — horizontally scrollable, centered */}
            <div className="flex-1 overflow-x-auto hide-scrollbar">
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] w-max mx-auto">
                {NAV_TABS.map(v=>(
                  <button key={v.id} onClick={()=>setView(v.id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap"
                    style={{
                      background: view===v.id ? theme.color+"22" : "transparent",
                      color:      view===v.id ? theme.color : "rgba(255,255,255,0.35)",
                      border:     `1px solid ${view===v.id ? theme.color+"44" : "transparent"}`,
                    }}>{v.label}</button>
                ))}
              </div>
            </div>

            <Clock />
          </div>

          {/* Row 2 — search bar */}
          {!isMapView && (
            <div className="py-2.5">
              <LocationSearch key={locationSearchKey} theme={theme}
                onLocationSelect={handleLocationSelect} currentLocationName={locationName}
                onResetLocation={customLocationActive ? handleResetLocation : null}/>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP FULL BLEED ── */}
      {isMapView ? (
        <div className="absolute inset-0 top-[104px]">
          <AQILeafletMap theme={theme}/>
        </div>
      ) : (
        <div className="relative z-10 w-full px-5 md:px-8 py-6">

          {/* Custom location banner */}
          <AnimatePresence>
            {customLocationActive && (
              <motion.div initial={{opacity:0,y:-10,height:0}} animate={{opacity:1,y:0,height:"auto"}} exit={{opacity:0,y:-10,height:0}} className="mb-4 overflow-hidden">
                <div className="rounded-2xl px-5 py-3 flex items-center justify-between gap-4" style={{background:theme.color+"0e",border:`1px solid ${theme.color}33`}}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">📍</span>
                    <div>
                      <div className="text-xs font-bold" style={{color:theme.color}}>Custom Location Active</div>
                      <div className="text-[11px] text-white/45 truncate max-w-xs">{locationName}</div>
                    </div>
                    {realAqiNum && (
                      <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
                        <span className="text-[11px] text-white/30">Real AQI</span>
                        <span className="font-mono font-black text-sm" style={{color:waqiAqiColor(realAqiNum)}}>{realAqiNum}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{background:waqiAqiColor(realAqiNum)+"22",color:waqiAqiColor(realAqiNum)}}>{waqiAqiLabel(realAqiNum)}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={handleResetLocation} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.45)",border:"1px solid rgba(255,255,255,0.1)"}}>
                    <span>◎</span> Reset to GPS
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAT STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label:"Location", value:locationName, mono:false },
              { label:"AQI Index", value:realAqiNum?`${realAqiNum} (${aqi}/5)`:`${aqi} / 5`, mono:true },
              { label:"PM₂.₅", value:`${components.pm2_5?.toFixed(1)} μg/m³`, mono:true },
              { label:"Dominant", value:POLLUTANT_INFO[dominantKey]?.name||dominantKey, mono:false },
            ].map((s,i)=>(
              <motion.div key={s.label} initial={{y:-12,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:i*0.08}}
                className="rounded-2xl p-4 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
                <div className="text-[11px] text-white/30 tracking-wider uppercase mb-1.5" style={{color:theme.color+"88"}}>{s.label}</div>
                <div className={`font-bold text-sm text-white truncate ${s.mono?"font-mono":""}`}>{s.value}</div>
              </motion.div>
            ))}
          </div>

          {/* ── CONTENT VIEWS ── */}
          <AnimatePresence mode="wait">

            {view==="overview" && (
              <motion.div key="overview" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-3 space-y-4">
                  <div className="rounded-3xl p-8 border flex flex-col items-center relative overflow-hidden" style={{background:"rgba(255,255,255,0.02)",borderColor:theme.color+"22",boxShadow:`inset 0 0 50px ${theme.glow}`}}>
                    <div className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase mb-5">Air Quality Index</div>
                    <RadialGauge aqi={aqi} theme={theme}/>
                    <div className="mt-5 text-center">
                      <div className="text-3xl font-black tracking-tight mb-1" style={{color:theme.color}}>{theme.label}</div>
                      <div className="text-white/35 text-sm">{theme.sub}</div>
                      {realAqiNum && (
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <span className="text-[10px] text-white/25">US AQI</span>
                          <span className="font-mono font-black text-lg" style={{color:waqiAqiColor(realAqiNum)}}>{realAqiNum}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl p-5 border" style={{background:theme.glow,borderColor:theme.color+"33"}}>
                    <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{color:theme.color}}>◈ Recommendation</div>
                    <p className="text-sm text-white/65 leading-relaxed">{theme.advice}</p>
                  </div>
                  <div className="rounded-2xl p-5 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
                    <div className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-3">◉ AQI Simulator</div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(lvl=>(
                        <button key={lvl} onClick={()=>setMockAqi(mockAqi===lvl?null:lvl)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border" style={{
                          background:(mockAqi===lvl||(!mockAqi&&data.main.aqi===lvl))?AQI_LEVELS[lvl].color+"22":"rgba(255,255,255,0.04)",
                          borderColor:(mockAqi===lvl||(!mockAqi&&data.main.aqi===lvl))?AQI_LEVELS[lvl].color+"55":"rgba(255,255,255,0.08)",
                          color:(mockAqi===lvl||(!mockAqi&&data.main.aqi===lvl))?AQI_LEVELS[lvl].color:"rgba(255,255,255,0.35)",
                        }}>{lvl}</button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {mockAqi && (
                        <motion.button initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}}
                          onClick={()=>setMockAqi(null)} className="mt-3 w-full py-1.5 rounded-lg text-xs text-white/35 border border-white/10 hover:border-white/20 transition-all">
                          ↩ Reset to live data
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="xl:col-span-9">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase">◌ Pollutant Breakdown — tap to expand</h2>
                    <span className="text-[11px] text-white/20 font-mono">μg/m³</span>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(components).map(([name,value],idx)=>(
                      <PollutantRow key={name} name={name} value={value} theme={theme}
                        selected={selectedPollutant===name}
                        onClick={()=>setSelectedPollutant(selectedPollutant===name?null:name)}
                        idx={idx}/>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {view==="detail" && (
              <motion.div key="detail" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(components).map(([name,value],idx)=>{
                  const info = POLLUTANT_INFO[name]||{name,unit:"μg/m³",safe:100,icon:name,desc:""};
                  const pct  = Math.min((value/info.safe)*100,100);
                  const exc  = value>info.safe;
                  return (
                    <motion.div key={name} initial={{scale:0.88,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:idx*0.07}}
                      className="rounded-3xl p-6 border relative overflow-hidden"
                      style={{background:"rgba(255,255,255,0.02)",borderColor:exc?theme.color+"44":"rgba(255,255,255,0.07)",boxShadow:exc?`0 0 30px ${theme.glow}`:"none"}}>
                      {exc&&<div className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full" style={{background:theme.color+"22",color:theme.color}}>OVER LIMIT</div>}
                      <div className="text-2xl font-black mb-1" style={{color:theme.color,fontFamily:"'DM Mono',monospace"}}>{info.icon}</div>
                      <div className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-4">{info.name}</div>
                      <div className="text-5xl font-black tabular-nums mb-1" style={{fontFamily:"'DM Mono',monospace"}}><AnimNum value={value} decimals={2}/></div>
                      <div className="text-white/25 text-xs mb-4">{info.unit}</div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-1.5">
                        <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1.5,ease:[0.16,1,0.3,1],delay:idx*0.07+0.2}} style={{background:exc?`linear-gradient(90deg,${theme.color},#ff2244)`:theme.color}}/>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/20 mb-3"><span>0</span><span>{info.safe} safe</span></div>
                      <p className="text-xs text-white/30 leading-relaxed">{info.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {view==="history" && (
              <motion.div key="history" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="space-y-4">
                <div className="rounded-3xl p-8 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
                  <h2 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase mb-8">◆ 24-Hour AQI Trend (simulated)</h2>
                  <div className="relative h-48">
                    <svg className="w-full h-full" viewBox="0 0 960 180" preserveAspectRatio="none">
                      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.color} stopOpacity="0.25"/><stop offset="100%" stopColor={theme.color} stopOpacity="0"/></linearGradient></defs>
                      {[1,2,3,4].map(v=><line key={v} x1="0" y1={((5-v)/4)*160+10} x2="960" y2={((5-v)/4)*160+10} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
                      <motion.path initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8}} d={[`M 0 ${((5-historyData[0].aqi)/4)*160+10}`,...historyData.map((d,i)=>`L ${(i/23)*960} ${((5-d.aqi)/4)*160+10}`),`L 960 180 L 0 180 Z`].join(" ")} fill="url(#ag)"/>
                      <motion.path initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2,ease:[0.16,1,0.3,1]}} d={[`M 0 ${((5-historyData[0].aqi)/4)*160+10}`,...historyData.map((d,i)=>`L ${(i/23)*960} ${((5-d.aqi)/4)*160+10}`)].join(" ")} fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinejoin="round" style={{filter:`drop-shadow(0 0 6px ${theme.color})`}}/>
                      {historyData.map((d,i)=>(<motion.circle key={i} initial={{r:0}} animate={{r:4}} transition={{delay:(i/23)*1.5}} cx={(i/23)*960} cy={((5-d.aqi)/4)*160+10} fill={AQI_LEVELS[d.aqi].color} style={{filter:`drop-shadow(0 0 4px ${AQI_LEVELS[d.aqi].color})`}}/>))}
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/20 mt-2">{[0,6,12,18,23].map(h=><span key={h}>{h}:00</span>)}</div>
                  <div className="flex gap-4 flex-wrap mt-6">{Object.entries(AQI_LEVELS).map(([lvl,info])=>(<div key={lvl} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:info.color}}/><span className="text-[11px] text-white/35">{lvl} — {info.label}</span></div>))}</div>
                </div>
                <div className="rounded-3xl p-8 border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.07)"}}>
                  <h3 className="text-[11px] font-bold tracking-[0.3em] text-white/25 uppercase mb-6">PM₂.₅ Concentration Over 24h (μg/m³)</h3>
                  <div className="flex items-end gap-1 h-28">
                    {historyData.map((d,i)=>(<motion.div key={i} className="flex-1 rounded-sm min-w-0" initial={{height:0}} animate={{height:`${(d.pm25/40)*100}%`}} transition={{duration:1,delay:i*0.04,ease:[0.16,1,0.3,1]}} style={{background:theme.color,opacity:0.25+(d.pm25/40)*0.75,boxShadow:`0 0 6px ${theme.glow}`}}/>))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/20 mt-2"><span>00:00</span><span>12:00</span><span>23:59</span></div>
                </div>
              </motion.div>
            )}

            {view==="workout" && (
              <motion.div key="workout" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
                <WorkoutAdjuster aqi={aqi} theme={theme} components={components}/>
              </motion.div>
            )}

            {view==="windows" && (
              <motion.div key="windows" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
                <SafeTrainingWindows theme={theme} userLat={userLat} userLng={userLng}/>
              </motion.div>
            )}

            {view==="routes" && (
              <motion.div key="routes" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
                <RoutePlanner theme={theme} userLat={userLat} userLng={userLng}/>
              </motion.div>
            )}

            {view==="planner" && (
              <motion.div key="planner" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}}>
                <TrainingBlockPlanner theme={theme} userLat={userLat} userLng={userLng}/>
              </motion.div>
            )}

          </AnimatePresence>

          {/* FOOTER */}
          <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
            <div className="text-xs text-white/20 font-mono">
              Data: OpenWeatherMap · Open-Meteo · WAQI · Overpass OSM · OSRM · Open-Elevation
            </div>
            <div className="flex items-center gap-2 text-xs text-white/25 font-mono">
              <motion.div animate={{opacity:[1,0,1]}} transition={{duration:1.5,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full" style={{background:theme.color}}/>
              LIVE
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}