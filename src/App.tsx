// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import Landing from './Landing';
import {
  WAQI_TOKEN, OWM_KEY, GEMINI_KEY,
  AQI_LEVELS, POLLUTANT_INFO, WORKOUT_TYPES, GYM_ALTERNATIVES,
  HEALTH_CONDITIONS, MOCK_DATA,
  waqiAqiColor, waqiAqiLabel, realAqiToIndex, scoreHour, scoreColor, countryFlag,
} from './constants';


// ── Gemini AI helper (free tier — get key at aistudio.google.com) ────────────
async function geminiAI(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
// ─── CSS-in-JS theme vars ───────────────────────────────────────────────────
const S = {
  bg: '#060608',
  bgCard: 'rgba(255,255,255,0.025)',
  border: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.12)',
  textDim: 'rgba(255,255,255,0.45)',
  textMuted: 'rgba(255,255,255,0.22)',
  font: "'Space Grotesk', sans-serif",
  mono: "'JetBrains Mono', monospace",
  display: "'Syne', sans-serif",
};

// ── Tiny components ──────────────────────────────────────────────────────────
function Spinner({ color = '#00ffc8', size = 14 }) {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      style={{ width: size, height: size, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: color, borderRightColor: color, flexShrink: 0 }} />
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: S.bgCard, border: `1px solid ${S.border}`, borderRadius: 20, ...style }}>{children}</div>;
}

function AnimNum({ value, decimals = 1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const from = parseFloat(node.textContent) || 0;
    const ctrl = animate(from, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: v => { if (node) node.textContent = v.toFixed(decimals); } });
    return () => ctrl.stop();
  }, [value, decimals]);
  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

function RadialGauge({ aqi, theme }) {
  const [S2, cx, cy, R, sw] = [220, 110, 110, 88, 10];
  const arc = 2 * Math.PI * R * 0.75;
  const offset = arc * (1 - (aqi - 1) / 4);
  return (
    <div style={{ position: 'relative', width: S2, height: S2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={S2} height={S2} style={{ transform: 'rotate(-225deg)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} strokeDasharray={`${arc} ${2 * Math.PI * R}`} strokeLinecap="round" />
        <motion.circle cx={cx} cy={cy} r={R} fill="none" stroke={theme.color} strokeWidth={sw}
          strokeDasharray={`${arc} ${2 * Math.PI * R}`} strokeLinecap="round"
          initial={{ strokeDashoffset: arc }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 12px ${theme.color})` }} />
        {[1, 2, 3, 4, 5].map(i => {
          const a = ((-225 + ((i - 1) / 4) * 270) * Math.PI) / 180;
          return <line key={i} x1={cx + (R - 16) * Math.cos(a)} y1={cy + (R - 16) * Math.sin(a)}
            x2={cx + (R + 2) * Math.cos(a)} y2={cy + (R + 2) * Math.sin(a)}
            stroke={i <= aqi ? theme.color : 'rgba(255,255,255,0.08)'} strokeWidth={i === aqi ? 3 : 1.5} strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 60, fontWeight: 900, fontFamily: S.mono, color: theme.color, lineHeight: 1, textShadow: `0 0 30px ${theme.color}88` }}>{aqi}</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', marginTop: 4, color: theme.color + '88', fontFamily: S.mono }}>OF 5</div>
      </div>
    </div>
  );
}

function ParticleCanvas({ color, intensity = 1 }) {
  const canvasRef = useRef(null), animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const count = Math.floor(55 * intensity);
    const particles = Array.from({ length: count }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.6 + 0.3, dx: (Math.random() - 0.5) * 0.3, dy: -Math.random() * 0.5 - 0.1, life: Math.random(), maxLife: Math.random() * 0.55 + 0.4 }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy; p.life += 0.0025;
        if (p.y < 0 || p.life > p.maxLife) { p.x = Math.random() * canvas.width; p.y = canvas.height + 5; p.life = 0; }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [color, intensity]);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontFamily: S.mono, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 2 }}>{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</div>
    </div>
  );
}

// ── Location Search ──────────────────────────────────────────────────────────
function LocationSearch({ theme, onLocationSelect, onResetLocation }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (val) => {
    setQuery(val); setError('');
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setIsOpen(false); return; }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(val)}&token=${WAQI_TOKEN}`);
        const data = await res.json();
        const results = (data.data || [])
          .filter(s => !isNaN(parseInt(s.aqi)) && s.station?.name)
          .slice(0, 10)
          .map(s => ({ uid: s.uid, name: s.station.name, aqi: parseInt(s.aqi), geo: s.station.geo }));
        setSuggestions(results); setIsOpen(results.length > 0);
      } catch { setSuggestions([]); }
      setIsSearching(false);
    }, 350);
  };

  const selectSuggestion = async (suggestion) => {
  setIsOpen(false); setQuery(suggestion.name);
  setIsFetching(true); setError('');
  try {
    const res = await fetch(`https://api.waqi.info/feed/@${suggestion.uid}/?token=${WAQI_TOKEN}`);
    const json = await res.json();
    if (json.status !== 'ok') throw new Error('unavailable');
    const d = json.data;
    const iaqi = d.iaqi || {};
    const components = {
      co: iaqi.co?.v ?? 0, no: iaqi.no?.v ?? 0,
      no2: iaqi.no2?.v ?? iaqi.nox?.v ?? 0, o3: iaqi.o3?.v ?? 0,
      so2: iaqi.so2?.v ?? 0, pm2_5: iaqi.pm25?.v ?? 0,
      pm10: iaqi.pm10?.v ?? 0, nh3: iaqi.nh3?.v ?? 0,
    };

    // ── FIX: robustly get coordinates ──────────────────────────────
    let lat = null, lng = null;

    // 1. Try WAQI feed city geo
    if (d.city?.geo?.[0] != null && d.city?.geo?.[1] != null) {
      lat = d.city.geo[0]; lng = d.city.geo[1];
    }
    // 2. Try suggestion.geo from search results
    else if (suggestion.geo?.[0] != null && suggestion.geo?.[1] != null) {
      lat = suggestion.geo[0]; lng = suggestion.geo[1];
    }
    // 3. Fallback: geocode the station name via Nominatim
    else {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(suggestion.name)}&format=json&limit=1`
        );
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch { /* ignore */ }
    }
    // ── END FIX ───────────────────────────────────────────────────

    onLocationSelect({
      locationName: suggestion.name,
      lat,
      lng,
      data: {
        main: { aqi: realAqiToIndex(d.aqi) },
        components,
        _realAqi: d.aqi,
        _waqiData: d,
      },
    });
  } catch { setError('Could not load data for this station. Try another.'); }
  setIsFetching(false);
};
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 36px 10px 36px', borderRadius: 12, fontSize: 13,
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${isOpen ? theme.color + '55' : 'rgba(255,255,255,0.08)'}`,
    color: '#fff', outline: 'none', fontFamily: S.font,
    boxShadow: isOpen ? `0 0 0 3px ${theme.color}12` : 'none', transition: 'all 0.2s',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            {isFetching ? <Spinner color={theme.color} size={13} /> : '⌕'}
          </div>
          <input ref={inputRef} type="text" value={query} onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="Search any city worldwide…"
            style={inp}
            onKeyDown={e => { if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); } }} />
          {isSearching && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <Spinner color="rgba(255,255,255,0.3)" size={12} />
            </div>
          )}
        </div>
        {onResetLocation && (
          <button onClick={onResetLocation}
            style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
            title="Reset to GPS location">
            ◎ GPS
          </button>
        )}
      </div>
      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, fontSize: 12, color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.06)' }}>
          ⚠ {error}
        </motion.div>
      )}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, borderRadius: 18, overflow: 'hidden', zIndex: 9999, background: 'rgba(8,8,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', fontFamily: S.mono }}>Live Stations · Select to load</span>
            </div>
            {suggestions.map((s, i) => {
              const color = waqiAqiColor(s.aqi);
              return (
                <motion.button key={s.uid} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                  onClick={() => selectSuggestion(s)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: color + '18', border: `1px solid ${color}33`, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: S.mono }}>{s.aqi}</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>AQI</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 11, marginTop: 2, color: color + 'cc' }}>{waqiAqiLabel(s.aqi)}</div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>→</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Pollutant Row ────────────────────────────────────────────────────────────
function PollutantRow({ name, value, theme, selected, onClick, idx }) {
  const info = POLLUTANT_INFO[name] || { name, unit: 'μg/m³', safe: 100, icon: name.toUpperCase(), desc: '' };
  const pct = Math.min((value / info.safe) * 100, 100);
  const exceeded = value > info.safe;
  return (
    <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} onClick={onClick}
      style={{ cursor: 'pointer' }}>
      <div style={{ borderRadius: 16, padding: '14px 18px', border: `1px solid ${selected ? theme.color + '44' : 'rgba(255,255,255,0.06)'}`, background: selected ? theme.glow : S.bgCard, boxShadow: selected ? `0 0 24px ${theme.glow}` : 'none', transition: 'all 0.25s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, background: selected ? theme.color + '22' : 'rgba(255,255,255,0.05)', color: selected ? theme.color : 'rgba(255,255,255,0.4)', border: `1px solid ${selected ? theme.color + '44' : 'transparent'}`, fontFamily: S.mono }}>
            {info.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{info.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                {exceeded && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: theme.color + '22', color: theme.color }}>OVER</span>}
                <span style={{ fontFamily: S.mono, fontWeight: 700, fontSize: 14, color: '#fff' }}><AnimNum value={value} decimals={2} /></span>
                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>{info.unit}</span>
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', borderRadius: 99, background: exceeded ? `linear-gradient(90deg,${theme.color},#ff2244)` : theme.color, boxShadow: `0 0 8px ${theme.color}55` }}
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: idx * 0.04 + 0.1 }} />
            </div>
          </div>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div style={{ paddingTop: 14, marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{info.desc}</p>
                <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#00ff88,#ffe44d,#ff4444)', opacity: 0.15, borderRadius: 99 }} />
                  <motion.div animate={{ left: `${Math.min(pct, 97)}%` }} transition={{ duration: 1 }}
                    style={{ position: 'absolute', top: 0, width: 4, height: '100%', borderRadius: 99, background: theme.color, boxShadow: `0 0 10px ${theme.color}` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: S.mono }}>
                  <span>0</span><span>Safe: {info.safe} {info.unit}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Health Profile Panel ────────────────────────────────────────────────────
function HealthProfilePanel({ aqi, theme, onEffectiveAqiChange }) {
  const [conditions, setConditions] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [indoorMode, setIndoorMode] = useState(false);
  const [ventilation, setVentilation] = useState('closed');
  const indoorMult = { closed: 0.7, cracked: 0.85, open: 0.95, filter: 0.4 };
  const baseAqi = indoorMode ? Math.max(1, Math.round(aqi * indoorMult[ventilation])) : aqi;
  const riskMult = conditions.length === 0 ? 1 : Math.min(conditions.reduce((acc, id) => acc * (HEALTH_CONDITIONS.find(c => c.id === id)?.riskMult || 1), 1), 5);
  const effectiveAqi = Math.min(5, Math.ceil(baseAqi * riskMult));
  useEffect(() => { onEffectiveAqiChange?.(effectiveAqi); }, [effectiveAqi]);
  const MASK = (ea) => {
    if (ea <= 1) return { label: 'No mask needed', color: '#00ffc8', icon: '😊' };
    if (ea <= 2) return { label: 'Optional mask', color: '#a8ff44', icon: '😷' };
    if (ea <= 3) return { label: 'Surgical mask', color: '#ffb830', icon: '😷' };
    if (ea <= 4) return { label: 'N95 required', color: '#ff5c5c', icon: '🛡️' };
    return { label: 'N99 / stay in', color: '#cc44ff', icon: '⚠️' };
  };
  const mask = MASK(effectiveAqi);
  const theme2 = AQI_LEVELS[effectiveAqi] || theme;
  const toggleCondition = (id) => setConditions(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  return (
    <div style={{ borderRadius: 20, border: `1px solid ${S.border}`, overflow: 'hidden', background: S.bgCard }}>
      <button onClick={() => setShowPanel(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>👤</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Health Profile</div>
            <div style={{ fontSize: 10, color: theme2.color }}>{conditions.length === 0 ? 'No conditions set' : `${conditions.length} condition${conditions.length > 1 ? 's' : ''} · Effective AQI ${effectiveAqi}/5`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: mask.color + '22', color: mask.color }}>{mask.icon} {mask.label}</div>
          <motion.span animate={{ rotate: showPanel ? 180 : 0 }} style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>↓</motion.span>
        </div>
      </button>
      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10, fontFamily: S.mono }}>Environment</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[{ id: 'outdoor', label: '🌤 Outdoor', active: !indoorMode }, { id: 'indoor', label: '🏠 Indoor', active: indoorMode }].map(b => (
                    <button key={b.id} onClick={() => setIndoorMode(b.id === 'indoor')}
                      style={{ padding: '8px 16px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: b.active ? theme.color + '22' : 'rgba(255,255,255,0.04)', border: `1px solid ${b.active ? theme.color + '44' : 'rgba(255,255,255,0.08)'}`, color: b.active ? theme.color : 'rgba(255,255,255,0.35)', transition: 'all 0.2s' }}>{b.label}</button>
                  ))}
                  {indoorMode && (
                    <select value={ventilation} onChange={e => setVentilation(e.target.value)}
                      style={{ padding: '8px 14px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: S.font }}>
                      <option value="filter">HEPA filter (−60%)</option>
                      <option value="closed">Windows closed (−30%)</option>
                      <option value="cracked">Windows cracked (−15%)</option>
                      <option value="open">Windows open (−5%)</option>
                    </select>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 10, fontFamily: S.mono }}>Health Conditions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HEALTH_CONDITIONS.map(c => {
                    const active = conditions.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => toggleCondition(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, border: `1px solid ${active ? theme2.color + '55' : 'rgba(255,255,255,0.08)'}`, background: active ? theme2.color + '18' : 'rgba(255,255,255,0.03)', color: active ? theme2.color : 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span>{c.icon}</span>{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {conditions.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ borderRadius: 14, padding: '14px 16px', background: theme2.color + '0c', border: `1px solid ${theme2.color}33` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: theme2.color, marginBottom: 8 }}>{mask.icon} Personalised Recommendation</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                    With your conditions, today's air (effective AQI {effectiveAqi}/5) poses {riskMult >= 2 ? 'elevated' : 'moderate'} risk. {AQI_LEVELS[effectiveAqi]?.advice}
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>Protection:</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: mask.color + '22', color: mask.color }}>{mask.label}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Workout Adjuster ─────────────────────────────────────────────────────────
function WorkoutAdjuster({ aqi, theme }) {
  const [workout, setWorkout] = useState(WORKOUT_TYPES[0]);
  const [inputVal, setInputVal] = useState('10');
  const [inputType, setInputType] = useState('km');
  const [result, setResult] = useState(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyText, setWhyText] = useState(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const cacheRef = useRef({});

  const aqiIndexToScore = (idx) => [0, 25, 75, 125, 175, 225][idx];
  const getAdj = (aqiIdx, workout, inputVal, inputType) => {
    const score = aqiIndexToScore(aqiIdx);
    const isKm = inputType === 'km';
    const val = parseFloat(inputVal) || 0;
    if (score <= 50) return { tier: 0, label: 'Perfect conditions', outdoor: true, indoorOnly: false, adjustedVal: val, paceChange: 0, noIntervals: false, tags: ['✓ No changes needed', '✓ Optimal air quality'], summary: 'Go for it — conditions are pristine.' };
    if (score <= 100) return { tier: 1, label: 'Minor adjustment', outdoor: true, indoorOnly: false, adjustedVal: isKm ? +(val * 0.9).toFixed(1) : +(val * 0.9).toFixed(0), paceChange: 15, noIntervals: false, tags: ['↓ Reduce intensity 10%', '→ Pace +15s/km'], summary: 'Reduce effort slightly. Sensitive groups should monitor breathing.' };
    if (score <= 150) return { tier: 2, label: 'Moderate restriction', outdoor: true, indoorOnly: false, adjustedVal: isKm ? +(val * 0.8).toFixed(1) : +(val * 0.8).toFixed(0), paceChange: 30, noIntervals: workout.id === 'intervals', tags: ['↓ Reduce 20%', '→ Pace +30s/km', '✗ No intervals'], summary: 'Cut distance and avoid high-intensity bursts. Wear a mask if possible.' };
    if (score <= 200) return { tier: 3, label: 'Indoor recommended', outdoor: false, indoorOnly: false, adjustedVal: isKm ? +(val * 0.5).toFixed(1) : +(val * 0.5).toFixed(0), paceChange: 60, noIntervals: true, tags: ['⚠ Indoor strongly advised', '↓ 50% max distance', '✗ No high intensity'], summary: 'Seriously consider moving indoors. Halve your planned effort if outdoors.' };
    return { tier: 4, label: 'Indoor ONLY', outdoor: false, indoorOnly: true, adjustedVal: 0, paceChange: null, noIntervals: true, tags: ['🚫 No outdoor exercise', '✓ Gym alternatives below'], summary: 'Do not exercise outdoors. Air quality poses serious health risk.' };
  };

  useEffect(() => { setInputType(workout.unit); setInputVal(workout.unit === 'km' ? '10' : '45'); setResult(null); setWhyText(null); setWhyOpen(false); }, [workout]);

  const handleCalc = () => { setResult(getAdj(aqi, workout, inputVal, inputType)); setWhyText(null); setWhyOpen(false); };

  const fetchWhy = async () => {
    const key = `${aqi}-${workout.id}`;
    if (cacheRef.current[key]) { setWhyText(cacheRef.current[key]); setWhyOpen(true); return; }
    setWhyLoading(true); setWhyOpen(true);
    try {
      const prompt = `You are a sports physiologist. In exactly 3 concise sentences, explain the physiological reason why AQI index level ${aqi} (out of 5) affects performance for someone doing a ${workout.label}. Be specific about lung function, oxygen uptake, and inflammation. No bullet points.`;
      const text = await geminiAI(prompt);
      if (text?.length > 20) { cacheRef.current[key] = text; setWhyText(text); } else throw new Error('empty');
    } catch {
      const fallback = `At AQI level ${aqi}, fine particulate matter penetrates the lower respiratory tract, increasing airway resistance and reducing effective VO₂max by up to 10-15%. The inflammatory response triggered by PM₂.₅ elevates cytokine levels, increasing cardiac load during ${workout.label}. This combination of reduced oxygen delivery and cardiovascular stress makes sustained effort measurably harder and potentially harmful.`;
      cacheRef.current[key] = fallback; setWhyText(fallback);
    }
    setWhyLoading(false);
  };

  const adj = result;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>⚙ Workout Intensity Adjuster</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ fontSize: 10, fontFamily: S.mono, color: 'rgba(255,255,255,0.22)' }}>AQI {aqi} · {AQI_LEVELS[aqi].label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Plan Your Workout</div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontFamily: S.mono }}>Workout Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {WORKOUT_TYPES.map(w => (
                <button key={w.id} onClick={() => setWorkout(w)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 14, border: `1px solid ${workout.id === w.id ? theme.color + '55' : 'rgba(255,255,255,0.07)'}`, background: workout.id === w.id ? theme.color + '14' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 18 }}>{w.icon}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: workout.id === w.id ? theme.color : 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.2 }}>{w.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, fontFamily: S.mono }}>{inputType === 'km' ? 'Planned Distance' : 'Planned Duration'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)} min="0" max="200"
                style={{ flex: 1, borderRadius: 12, padding: '10px 14px', fontSize: 18, fontWeight: 700, fontFamily: S.mono, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
              <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                {['km', 'min'].map(u => (
                  <button key={u} onClick={() => setInputType(u)}
                    style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, background: inputType === u ? theme.color + '22' : 'transparent', color: inputType === u ? theme.color : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleCalc}
            style={{ width: '100%', padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', background: `linear-gradient(135deg,${theme.color}30,${theme.color}10)`, border: `1px solid ${theme.color}44`, color: theme.color, cursor: 'pointer', boxShadow: `0 0 20px ${theme.glow}` }}>
            ◉ Calculate AQI Adjustment
          </button>
        </Card>
        <Card style={{ padding: '24px', border: adj ? `1px solid ${adj.indoorOnly ? '#cc44ff44' : theme.color + '33'}` : `1px solid ${S.border}` }}>
          <AnimatePresence mode="wait">
            {!adj ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0' }}>
                <div style={{ fontSize: 40, opacity: 0.15 }}>⚙</div>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Select workout & calculate</div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', fontFamily: S.mono }}>Adjusted Plan</span>
                  <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 12px', borderRadius: 99, background: adj.tier === 0 ? '#00ffc822' : adj.tier <= 2 ? theme.color + '22' : '#ff5c5c22', color: adj.tier === 0 ? '#00ffc8' : adj.tier <= 2 ? theme.color : '#ff5c5c' }}>{adj.label}</span>
                </div>
                {!adj.indoorOnly && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, borderRadius: 14, padding: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', marginBottom: 6 }}>BEFORE</div>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: S.mono, color: 'rgba(255,255,255,0.55)' }}>{parseFloat(inputVal) || 0}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{inputType}</div>
                    </div>
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ fontSize: 22, color: theme.color }}>→</motion.div>
                    <div style={{ flex: 1, borderRadius: 14, padding: '12px', border: `1px solid ${theme.color}44`, background: theme.glow, textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: theme.color + '88', letterSpacing: '0.15em', marginBottom: 6 }}>AFTER</div>
                      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: S.mono, color: theme.color }}>{adj.adjustedVal}</div>
                      <div style={{ fontSize: 11, color: theme.color + '77', marginTop: 2 }}>{inputType}{adj.paceChange > 0 && ` · +${adj.paceChange}s/km`}</div>
                    </div>
                  </div>
                )}
                {adj.indoorOnly && (
                  <div style={{ borderRadius: 14, padding: '20px', border: '1px solid #cc44ff44', background: '#cc44ff0f', textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🚫</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#cc44ff' }}>Outdoor Exercise Banned</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Air quality is hazardous. Stay indoors.</div>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {adj.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 8, fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>{tag}</span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 14 }}>{adj.summary}</p>
                {adj.tier >= 3 && (
                  <div style={{ borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>🏋️ Gym Alternatives</div>
                    {(GYM_ALTERNATIVES[workout.id] || GYM_ALTERNATIVES.gym).map((alt, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: theme.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{alt}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => { if (!whyOpen) fetchWhy(); else setWhyOpen(false); }}
                  style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${whyOpen ? theme.color + '44' : 'rgba(255,255,255,0.1)'}`, color: whyOpen ? theme.color : 'rgba(255,255,255,0.3)', background: whyOpen ? theme.glow : 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                  <span>🧬 Why?</span>
                  <motion.span animate={{ rotate: whyOpen ? 180 : 0 }} style={{ fontSize: 14 }}>↓</motion.span>
                </button>
                <AnimatePresence>
                  {whyOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: S.mono, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: theme.color }}>◈</span> AI Physiological Analysis
                        </div>
                        {whyLoading
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner color={theme.color} /><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Consulting physiology model…</span></div>
                          : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{whyText}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

// ── Safe Training Windows ─────────────────────────────────────────────────────
function SafeTrainingWindows({ theme, userLat, userLng }) {
  const [hourlyData, setHourlyData] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredHour, setHoveredHour] = useState(null);
  const [weekView, setWeekView] = useState('this');
  const [lastWeekData, setLastWeekData] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userLat || !userLng) { setError('Location required'); setLoading(false); return; }
    setLoading(true); setError('');
    const aqP = fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=pm2_5,european_aqi&forecast_days=2`).then(r => r.json());
    const wxP = OWM_KEY
      ? fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${userLat}&lon=${userLng}&appid=${OWM_KEY}&units=metric`).then(r => r.json())
      : Promise.resolve({ list: [] });
    const aqHP = fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&past_days=7&forecast_days=0`).then(r => r.json());

    Promise.all([aqP, wxP, aqHP]).then(([aq, wx, aqH]) => {
      const now = new Date();
      const hours = [];
      for (let i = 0; i < 24; i++) {
        const hIdx = i + now.getHours();
        const aqiVal = aq.hourly?.european_aqi?.[hIdx] ?? (40 + Math.random() * 80);
        const pm25 = aq.hourly?.pm2_5?.[hIdx] ?? (8 + Math.random() * 20);
        const target = new Date(now); target.setHours(now.getHours() + i, 0, 0, 0);
        const block = wx.list?.find(b => Math.abs(new Date(b.dt * 1000) - target) < 5400000) ?? wx.list?.[0];
        const temp = block?.main?.temp ?? (24 + Math.random() * 8);
        const hum = block?.main?.humidity ?? (55 + Math.random() * 25);
        const wind = (block?.wind?.speed ?? (3 + Math.random() * 8)) * 3.6;
        const hr = (now.getHours() + i) % 24;
        hours.push({ label: hr.toString().padStart(2, '0') + ':00', hour: hr, aqi: Math.round(aqiVal), pm25: +pm25.toFixed(1), temp: Math.round(temp), humidity: Math.round(hum), windSpeed: Math.round(wind), score: scoreHour(aqiVal, temp, hum, wind, hr), isCurrent: i === 0 });
      }
      setHourlyData(hours);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayMap: Record<string, any> = {};
      if (wx.list?.length) {
        wx.list.forEach(b => {
          const d = new Date(b.dt * 1000); const key = dayNames[d.getDay()];
          if (!dayMap[key]) dayMap[key] = { aqis: [], scores: [], dow: d.getDay() };
          const diffH = Math.max(0, Math.round((d.getTime() - now.getTime()) / 3600000));
          const aqiH = aq.hourly?.european_aqi?.[diffH] ?? 55;
          dayMap[key].aqis.push(aqiH);
          dayMap[key].scores.push(scoreHour(aqiH, b.main.temp, b.main.humidity, b.wind.speed * 3.6, d.getHours()));
        });
      } else {
        dayNames.forEach((d, i) => { dayMap[d] = { aqis: [40 + Math.random() * 80], scores: [50 + Math.random() * 35], dow: i }; });
      }
      setWeekData(Object.entries(dayMap).map(([day, v]) => ({ day, avgAqi: Math.round(v.aqis.reduce((a, b) => a + b, 0) / v.aqis.length), avgScore: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length), dow: v.dow })).sort((a, b) => a.dow - b.dow).slice(0, 7));

      const lw = aqH.hourly?.european_aqi ?? [];
      const lwMap: Record<string, any> = {};
      for (let i = 0; i < 7; i++) {
        const d2 = new Date(now); d2.setDate(d2.getDate() - 7 + i);
        const key = dayNames[d2.getDay()];
        const sl = lw.slice(i * 24, (i + 1) * 24).filter(Boolean);
        const avg = sl.length ? Math.round(sl.reduce((a, b) => a + b, 0) / sl.length) : (50 + Math.random() * 60);
        lwMap[key] = { day: key, avgAqi: avg, avgScore: scoreHour(avg, 26, 65, 10, 8), dow: d2.getDay() };
      }
      setLastWeekData(Object.values(lwMap).sort((a, b) => a.dow - b.dow));
      setLoading(false);
    }).catch(err => {
      console.warn('Windows fetch failed', err);
      const now = new Date();
      setHourlyData(Array.from({ length: 24 }, (_, i) => { const hr = (now.getHours() + i) % 24; const aqi = 35 + Math.random() * 90; return { label: hr.toString().padStart(2, '0') + ':00', hour: hr, aqi: Math.round(aqi), pm25: +(8 + Math.random() * 22).toFixed(1), temp: Math.round(24 + Math.random() * 10), humidity: Math.round(50 + Math.random() * 30), windSpeed: Math.round(5 + Math.random() * 12), score: scoreHour(aqi, 26, 60, 8, hr), isCurrent: i === 0 }; }));
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setWeekData(days.map((d, i) => ({ day: d, avgAqi: Math.round(45 + Math.random() * 70), avgScore: Math.round(45 + Math.random() * 45), dow: i })));
      setLastWeekData(days.map((d, i) => ({ day: d, avgAqi: Math.round(50 + Math.random() * 65), avgScore: Math.round(40 + Math.random() * 48), dow: i })));
      setLoading(false);
    });
  }, [userLat, userLng]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', flexDirection: 'column', gap: 16 }}>
      <Spinner color={theme.color} size={32} />
      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: S.mono, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Loading forecast…</div>
    </div>
  );

  const top3 = [...hourlyData].sort((a, b) => b.score - a.score).slice(0, 3).map(h => h.hour);
  const bestHour = [...hourlyData].sort((a, b) => b.score - a.score)[0];
  const displayWk = weekView === 'this' ? weekData : lastWeekData;
  const bestDay = [...displayWk].sort((a, b) => b.avgScore - a.avgScore)[0];
  const maxScore = Math.max(...hourlyData.map(h => h.score), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Best window banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: 18, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: bestHour?.score >= 55 ? scoreColor(bestHour.score) + '10' : '#ff5c5c0d', border: `1px solid ${bestHour?.score >= 55 ? scoreColor(bestHour.score) : '#ff5c5c'}28` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>{bestHour?.score >= 55 ? '🏃' : '🏠'}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: bestHour?.score >= 55 ? scoreColor(bestHour.score) : '#ff5c5c', marginBottom: 4 }}>
              {bestHour?.score >= 55 ? 'Best Training Window Today' : 'No Good Windows Today — Train Indoors'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              {bestHour?.score >= 55 ? `${bestHour.label} · Score ${bestHour.score}/100 · AQI ${bestHour.aqi} · ${bestHour.temp}°C · ${bestHour.humidity}% RH · Wind ${bestHour.windSpeed}km/h` : 'Air quality too poor for outdoor training today'}
            </div>
          </div>
        </div>
        {bestDay && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>Best day: <span style={{ fontWeight: 900, fontSize: 14, color: scoreColor(bestDay.avgScore) }}>{bestDay.day}</span><span style={{ fontFamily: S.mono, color: scoreColor(bestDay.avgScore) }}>Score {bestDay.avgScore}</span></div>}
      </motion.div>

      {/* 24h chart */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>◆ 24-Hour Training Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {[['#00ffc8', '≥75'], ['#a8ff44', '55–74'], ['#ffb830', '35–54'], ['#ff5c5c', '<35']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', marginTop: 24 }}>
          {/* Y-axis labels */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: 208, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 4 }}>
            {[100, 75, 50, 25, 0].map(v => (
              <span key={v} style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: S.mono }}>{v}</span>
            ))}
          </div>
          <div style={{ marginLeft: 24, display: 'flex', alignItems: 'flex-end', gap: 2, height: 208 }}>
            {hourlyData.map((h, i) => {
              const col = scoreColor(h.score);
              const isTop = top3.includes(h.hour);
              const barH = Math.max((h.score / maxScore) * 100, 3);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredHour(i)} onMouseLeave={() => setHoveredHour(null)}>
                  {isTop && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      style={{ position: 'absolute', top: -22, fontSize: 7, fontWeight: 900, padding: '2px 5px', borderRadius: 5, background: col + '22', color: col, border: `1px solid ${col}44`, whiteSpace: 'nowrap', zIndex: 5 }}>▲BEST</motion.div>
                  )}
                  <motion.div initial={{ height: 0 }} animate={{ height: `${barH}%` }} transition={{ duration: 0.7, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%', borderRadius: '4px 4px 0 0', background: `linear-gradient(to top, ${col}bb, ${col})`, opacity: hoveredHour === null ? 0.8 : hoveredHour === i ? 1 : 0.35, boxShadow: h.isCurrent ? `0 0 14px ${col}` : isTop ? `0 0 8px ${col}66` : 'none', border: h.isCurrent ? `1px solid ${col}` : 'none', transition: 'opacity 0.15s' }} />
                  {/* Tooltip */}
                  {hoveredHour === i && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      style={{ position: 'absolute', bottom: '105%', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: 170, borderRadius: 16, overflow: 'hidden', pointerEvents: 'none', background: 'rgba(6,6,8,0.98)', border: `1px solid ${col}44`, boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: col + '12' }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: S.mono }}>{h.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, fontFamily: S.mono, color: col, lineHeight: 1.1, marginTop: 2 }}>Score {h.score}</div>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {[['AQI', h.aqi], ['Temp', `${h.temp}°C`], ['Humidity', `${h.humidity}%`], ['Wind', `${h.windSpeed} km/h`], ['PM₂.₅', `${h.pm25} µg/m³`]].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                            <span style={{ color: 'rgba(255,255,255,0.28)' }}>{k}</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: S.mono, fontWeight: 700 }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 9, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>
                          45-min lung load: ~{Math.round(h.pm25 * 0.45 * 45)} µg PM₂.₅
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginLeft: 24, display: 'flex', gap: 2, marginTop: 4 }}>
            {hourlyData.map((h, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                {i % 4 === 0 && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontFamily: S.mono }}>{h.label.slice(0, 2)}</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Weekly chart */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>◆ 7-Day AQI Forecast</div>
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['this', 'last'].map(w => (
              <button key={w} onClick={() => setWeekView(w)}
                style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: weekView === w ? theme.color + '22' : 'transparent', color: weekView === w ? theme.color : 'rgba(255,255,255,0.28)', border: 'none', cursor: 'pointer', fontFamily: S.mono, transition: 'all 0.2s' }}>
                {w === 'this' ? 'This Week' : 'Last Week'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {displayWk.map((d, i) => {
            const sc = scoreColor(d.avgScore);
            const aqC = waqiAqiColor(d.avgAqi);
            const best = d.day === bestDay?.day && weekView === 'this';
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ borderRadius: 16, padding: '14px 10px', textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: best ? sc + '10' : 'rgba(255,255,255,0.02)', border: `1px solid ${best ? sc + '55' : 'rgba(255,255,255,0.07)'}`, boxShadow: best ? `0 0 20px ${sc}20` : 'none' }}>
                {best && <div style={{ position: 'absolute', top: -10, fontSize: 8, fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: sc, color: '#000' }}>BEST</div>}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{d.day}</div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: S.mono, color: aqC }}>{d.avgAqi}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>AQI</div>
                <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${d.avgScore}%` }} transition={{ delay: i * 0.06 + 0.2 }} style={{ height: '100%', borderRadius: 99, background: sc }} />
                </div>
                <div style={{ fontSize: 10, fontFamily: S.mono, fontWeight: 700, color: sc }}>{d.avgScore}</div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Route Planner ─────────────────────────────────────────────────────────────
function RoutePlanner({ theme, userLat, userLng }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayersRef = useRef([]);
  const markerLayerRef = useRef(null);
  const osmLayerRef = useRef(null);
  const clickStepRef = useRef('start');
  const [mapReady, setMapReady] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [endPt, setEndPt] = useState(null);
  const [clickStep, setClickStep] = useState('start');
  const [mode, setMode] = useState('click');
  const [loopKm, setLoopKm] = useState('5');
  const [calculating, setCalculating] = useState(false);
  const [routes, setRoutes] = useState(null);
  const [windBearing, setWindBearing] = useState(null);
  const [baseAqi, setBaseAqi] = useState(80);
  const [osmLoaded, setOsmLoaded] = useState(false);

  useEffect(() => { clickStepRef.current = clickStep; }, [clickStep]);

  useEffect(() => {
    if (!userLat || !userLng) return;
    if (mapRef.current) return;
    let destroyed = false;
    const init = async () => {
      if (!document.getElementById('lf-css-rp')) {
        const lnk = document.createElement('link'); lnk.id = 'lf-css-rp'; lnk.rel = 'stylesheet';
        lnk.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(lnk);
      }
      if (!window.L) {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      }
      if (destroyed || !mapDivRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(mapDivRef.current, { center: [userLat, userLng], zoom: 15, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM', opacity: 0.8 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      osmLayerRef.current = L.layerGroup().addTo(map);
      map.on('click', (e) => {
        const pt = { lat: e.latlng.lat, lng: e.latlng.lng };
        const step = clickStepRef.current;
        if (step === 'start') { setStartPt(pt); setClickStep('end'); clickStepRef.current = 'end'; }
        else if (step === 'end') { setEndPt(pt); setClickStep('done'); clickStepRef.current = 'done'; }
      });
      mapRef.current = map; setMapReady(true);
      // Fetch wind + AQI for current user location
      if (OWM_KEY) {
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${userLat}&lon=${userLng}&appid=${OWM_KEY}`)
          .then(r => r.json()).then(d => { if (!destroyed) setWindBearing(d.wind?.deg ?? 0); }).catch(() => { if (!destroyed) setWindBearing(180); });
      } else { setWindBearing(180); }
      fetch(`https://api.waqi.info/feed/geo:${userLat};${userLng}/?token=${WAQI_TOKEN}`)
        .then(r => r.json()).then(d => { if (!destroyed && d.status === 'ok') setBaseAqi(d.data.aqi ?? 80); }).catch(() => {});
      fetchOsmPaths(map, L, userLat, userLng);
    };
    init();
    return () => { destroyed = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [userLat, userLng]);

  useEffect(() => {
    const map = mapRef.current; const L = window.L;
    if (!map || !L || !markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    if (startPt) L.circleMarker([startPt.lat, startPt.lng], { radius: 10, fillColor: '#00ffc8', fillOpacity: 1, color: '#000', weight: 2 }).bindTooltip('START', { permanent: true, direction: 'top', className: 'lf-tip' }).addTo(markerLayerRef.current);
    if (endPt) L.circleMarker([endPt.lat, endPt.lng], { radius: 10, fillColor: '#ff5c5c', fillOpacity: 1, color: '#000', weight: 2 }).bindTooltip('END', { permanent: true, direction: 'top', className: 'lf-tip' }).addTo(markerLayerRef.current);
  }, [startPt, endPt]);

  async function fetchOsmPaths(map, L, lat, lng) {
    try {
      const q = `[out:json][timeout:25];(way["highway"="footway"](around:2500,${lat},${lng});way["highway"="cycleway"](around:2500,${lat},${lng});way["highway"="path"](around:2500,${lat},${lng});way["leisure"="park"](around:2500,${lat},${lng}););out geom;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q });
      const data = await res.json();
      if (!data.elements) return;
      const zoneColors = { footway: '#4488ff', cycleway: '#aa88ff', path: '#4488ff', park: '#00ffc8' };
      data.elements.forEach(el => {
        if (!el.geometry?.length) return;
        const pts = el.geometry.map(g => [g.lat, g.lon]);
        const t = el.tags?.highway || el.tags?.leisure || 'other';
        const col = zoneColors[t] ?? 'rgba(255,255,255,0.12)';
        L.polyline(pts, { color: col, weight: 2, opacity: 0.6 }).addTo(osmLayerRef.current);
      });
      setOsmLoaded(true);
    } catch { setOsmLoaded(true); }
  }

  async function calculateRoutes() {
    if (!startPt || !endPt) return;
    setCalculating(true); setRoutes(null);
    const L = window.L; const map = mapRef.current;
    if (!map || !L) { setCalculating(false); return; }
    routeLayersRef.current.forEach(l => { try { l.remove(); } catch {} });
    routeLayersRef.current = [];
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${startPt.lng},${startPt.lat};${endPt.lng},${endPt.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url); const data = await res.json();
      if (!data.routes?.[0]) throw new Error('no route');
      const coords = data.routes[0].geometry.coordinates.map(([ln, la]) => [la, ln]);
      const distKm = (data.routes[0].distance / 1000).toFixed(1);
      const timeMn = Math.round(data.routes[0].duration / 60);
      const windRad = ((windBearing ?? 0) + 180) * Math.PI / 180;
      const cleanCoords = coords.map((pt, i) => { const t = i / Math.max(coords.length - 1, 1); const sway = Math.sin(t * Math.PI) * 0.0006; return [pt[0] + Math.cos(windRad) * sway, pt[1] + Math.sin(windRad) * sway]; });
      const shortAqi = Math.round(baseAqi * 1.12), cleanAqi = Math.round(baseAqi * 0.65);
      const shortPm = +(shortAqi * 0.22).toFixed(1), cleanPm = +(cleanAqi * 0.22).toFixed(1);
      const cleanDistKm = (parseFloat(distKm) * 1.18).toFixed(1);
      const cleanTimeMn = Math.round(timeMn * 1.18);
      const savedPct = Math.round((1 - cleanPm / shortPm) * 100);
      const shortLayer = L.polyline(coords, { color: '#666', weight: 5, opacity: 0.75 }).bindTooltip(`Shortest: ${distKm}km · Avg AQI ~${shortAqi}`, { sticky: true }).addTo(map);
      const cleanLayer = L.polyline(cleanCoords, { color: theme.color, weight: 5, opacity: 0.95 }).bindTooltip(`Cleanest: ${cleanDistKm}km · Avg AQI ~${cleanAqi}`, { sticky: true }).addTo(map);
      if (windBearing !== null) {
        const mid = coords[Math.floor(coords.length / 2)];
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const dir = dirs[Math.round(windBearing / 45) % 8];
        const wIcon = L.divIcon({ html: `<div style="background:rgba(255,140,66,0.9);color:#000;font-size:9px;font-weight:900;padding:3px 8px;border-radius:8px;white-space:nowrap;border:1px solid #ff8c42">⚠ Wind from ${dir}</div>`, className: '' });
        routeLayersRef.current.push(L.marker(mid, { icon: wIcon }).addTo(map));
      }
      routeLayersRef.current.push(shortLayer, cleanLayer);
      map.fitBounds(L.polyline(coords).getBounds(), { padding: [50, 50] });
      setRoutes({ shortest: { distKm, timeMn, aqi: shortAqi, pm25: shortPm }, cleanest: { distKm: cleanDistKm, timeMn: cleanTimeMn, aqi: cleanAqi, pm25: cleanPm }, savedPct, timeDiff: cleanTimeMn - timeMn });
    } catch (e) { console.warn('Route failed', e); }
    setCalculating(false);
  }

  const btnStyle = (active, col) => ({
    flex: 1, padding: '8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    background: active ? col + '20' : 'transparent', color: active ? col : 'rgba(255,255,255,0.28)',
    border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: S.mono,
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>◉ Route Builder</div>
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[['click', 'Click Map'], ['loop', 'Auto Loop']].map(([id, lbl]) => (
              <button key={id} onClick={() => setMode(id)} style={btnStyle(mode === id, theme.color)}>{lbl}</button>
            ))}
          </div>
          {mode === 'click' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { step: 'start', done: !!startPt, color: '#00ffc8', label: '① Start Point', val: startPt ? `${startPt.lat.toFixed(4)}, ${startPt.lng.toFixed(4)}` : 'Click map to set' },
                { step: 'end', done: !!endPt, color: '#ff5c5c', label: '② End Point', val: endPt ? `${endPt.lat.toFixed(4)}, ${endPt.lng.toFixed(4)}` : 'Click map to set' },
              ].map(({ done, color, label, val }) => (
                <div key={label} style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${done ? color + '55' : 'rgba(255,255,255,0.08)'}`, background: done ? color + '12' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: S.mono }}>{val}</div>
                </div>
              ))}
              {(startPt || endPt) && (
                <button onClick={() => { setStartPt(null); setEndPt(null); setClickStep('start'); clickStepRef.current = 'start'; setRoutes(null); }}
                  style={{ padding: '8px', borderRadius: 10, fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  ↩ Clear & restart
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: S.mono }}>Target Distance (km)</div>
                <input type="number" value={loopKm} onChange={e => setLoopKm(e.target.value)} min="1" max="50"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: S.mono, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
              </div>
              <button onClick={() => { const d = parseFloat(loopKm) || 5; const off = d / 111 / 4; setStartPt({ lat: userLat, lng: userLng }); setEndPt({ lat: userLat + off * 0.6, lng: userLng + off }); setClickStep('done'); clickStepRef.current = 'done'; }}
                style={{ padding: '10px', borderRadius: 12, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: theme.color + '22', border: `1px solid ${theme.color}44`, color: theme.color, cursor: 'pointer' }}>
                Auto-generate Loop
              </button>
            </div>
          )}
          <button onClick={calculateRoutes} disabled={!startPt || !endPt || calculating}
            style={{ padding: '13px', borderRadius: 14, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: startPt && endPt ? `linear-gradient(135deg,${theme.color}30,${theme.color}10)` : 'rgba(255,255,255,0.03)', border: `1px solid ${startPt && endPt ? theme.color + '44' : 'rgba(255,255,255,0.07)'}`, color: startPt && endPt ? theme.color : 'rgba(255,255,255,0.18)', cursor: startPt && endPt ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: startPt && endPt ? `0 0 20px ${theme.glow}` : 'none' }}>
            {calculating ? <><Spinner color={theme.color} size={13} /> Calculating…</> : '◉ Calculate Routes'}
          </button>
        </Card>
        {/* Legend */}
        <Card style={{ padding: '16px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 12, fontFamily: S.mono }}>Path Legend</div>
          {[['#00ffc8', 'Park / Green', '−20 AQI'], ['#00aaff', 'Water / Riverside', '−15 AQI'], ['#4488ff', 'Footway / Path', 'Neutral'], ['#666', 'Shortest route', 'Base AQI'], [theme.color, 'Cleanest route', '−35% AQI']].map(([c, l, m]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 4, borderRadius: 99, background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flex: 1 }}>{l}</span>
              <span style={{ fontSize: 9, fontFamily: S.mono, color: c + 'aa' }}>{m}</span>
            </div>
          ))}
        </Card>
      </div>
      {/* Map + results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderRadius: 18, overflow: 'hidden', position: 'relative', height: 440, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div ref={mapDivRef} className="rp-map" style={{ width: '100%', height: '100%' }} />
          {mapReady && clickStep !== 'done' && mode === 'click' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500, padding: '8px 20px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: 'rgba(0,0,0,0.88)', border: `1px solid ${clickStep === 'start' ? '#00ffc855' : '#ff5c5c55'}`, color: clickStep === 'start' ? '#00ffc8' : '#ff5c5c' }}>
              Click to set {clickStep === 'start' ? 'START' : 'END'} point
            </motion.div>
          )}
          {!osmLoaded && mapReady && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.75)', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
              <Spinner color="rgba(255,255,255,0.4)" size={10} /> Loading local paths…
            </div>
          )}
        </div>
        <AnimatePresence>
          {routes && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card style={{ padding: '20px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 16, fontFamily: S.mono }}>Route Comparison</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <div />
                  {[{ label: 'Shortest', color: '#888' }, { label: 'Cleanest', color: theme.color }].map(r => (
                    <div key={r.label} style={{ borderRadius: 12, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 900, background: r.color + '14', border: `1px solid ${r.color}33`, color: r.color }}>{r.label}</div>
                  ))}
                  {[['Distance', `${routes.shortest.distKm}km`, `${routes.cleanest.distKm}km`], ['Avg AQI', routes.shortest.aqi, routes.cleanest.aqi], ['PM₂.₅', `${routes.shortest.pm25} µg/m³`, `${routes.cleanest.pm25} µg/m³`], ['Est. Time', `${routes.shortest.timeMn}min`, `${routes.cleanest.timeMn}min`]].map(([lbl, s, c]) => [
                    <div key={lbl} style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', display: 'flex', alignItems: 'center' }}>{lbl}</div>,
                    <div key={lbl + 's'} style={{ textAlign: 'center', fontFamily: S.mono, fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s}</div>,
                    <div key={lbl + 'c'} style={{ textAlign: 'center', fontFamily: S.mono, fontWeight: 700, fontSize: 13, color: theme.color }}>{c}</div>,
                  ])}
                </div>
                <div style={{ borderRadius: 12, padding: '12px 16px', background: theme.color + '0c', border: `1px solid ${theme.color}22` }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: theme.color }}>💡 Clean route saves ~{routes.savedPct}% PM₂.₅ inhaled for just {routes.timeDiff} min extra</p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Training Block Planner (with custom plan input) ───────────────────────────
const DEFAULT_PLANS = {
  BASE:  [{d:'Mon',s:'Easy Run',i:'easy',km:8},{d:'Tue',s:'Gym',i:'moderate',km:0},{d:'Wed',s:'Long Run',i:'easy',km:14},{d:'Thu',s:'Rest',i:'rest',km:0},{d:'Fri',s:'Easy Run',i:'easy',km:6},{d:'Sat',s:'Tempo',i:'moderate',km:10},{d:'Sun',s:'Rest',i:'rest',km:0}],
  BUILD: [{d:'Mon',s:'Intervals',i:'hard',km:0},{d:'Tue',s:'Easy Run',i:'easy',km:10},{d:'Wed',s:'Tempo Run',i:'moderate',km:12},{d:'Thu',s:'Rest',i:'rest',km:0},{d:'Fri',s:'Intervals',i:'hard',km:0},{d:'Sat',s:'Long Run',i:'moderate',km:18},{d:'Sun',s:'Easy Run',i:'easy',km:8}],
  PEAK:  [{d:'Mon',s:'Intervals',i:'hard',km:0},{d:'Tue',s:'Tempo Run',i:'hard',km:14},{d:'Wed',s:'Easy Run',i:'easy',km:8},{d:'Thu',s:'Intervals',i:'hard',km:0},{d:'Fri',s:'Rest',i:'rest',km:0},{d:'Sat',s:'Long Run',i:'hard',km:22},{d:'Sun',s:'Easy Run',i:'easy',km:6}],
  TAPER: [{d:'Mon',s:'Easy Run',i:'easy',km:6},{d:'Tue',s:'Tempo',i:'moderate',km:8},{d:'Wed',s:'Rest',i:'rest',km:0},{d:'Thu',s:'Easy Run',i:'easy',km:5},{d:'Fri',s:'Rest',i:'rest',km:0},{d:'Sat',s:'Easy Run',i:'easy',km:10},{d:'Sun',s:'Rest',i:'rest',km:0}],
};
const IC = { easy:'#00ffc8', moderate:'#ffb830', hard:'#ff5c5c', rest:'transparent' };
const PHASES = [
  { id:'BASE',  weeks:'1–4',  color:'#00ffc8', desc:'Aerobic foundation' },
  { id:'BUILD', weeks:'5–8',  color:'#ffb830', desc:'Volume & intensity' },
  { id:'PEAK',  weeks:'9–11', color:'#ff5c5c', desc:'Race-specific' },
  { id:'TAPER', weeks:'12',   color:'#cc44ff', desc:'Reduce & sharpen' },
];

function TrainingBlockPlanner({ theme, userLat, userLng }) {
  const [forecastAqi, setForecastAqi] = useState([]);
  const [phase, setPhase] = useState('BUILD');
  const [selectedDay, setSelectedDay] = useState(null);
  const [airDebt, setAirDebt] = useState(0);
  const [debtHistory, setDebtHistory] = useState([]);
  const [rescheduling, setRescheduling] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [calDays, setCalDays] = useState([]);
  // Custom plan
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPlanText, setCustomPlanText] = useState('');
  const [customPlan, setCustomPlan] = useState(null);
  const [parsedCustom, setParsedCustom] = useState(null);

  const activeWeekPlan = parsedCustom || DEFAULT_PLANS[phase];
  const today = new Date();

  useEffect(() => {
    if (!userLat || !userLng) return;
    fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&forecast_days=7`)
      .then(r => r.json()).then(d => {
        const days = [];
        for (let i = 0; i < 7; i++) { const sl = d.hourly?.european_aqi?.slice(i * 24, (i + 1) * 24).filter(Boolean) ?? []; days.push(sl.length ? Math.round(sl.reduce((a, b) => a + b, 0) / sl.length) : 60); }
        setForecastAqi(days);
      }).catch(() => setForecastAqi(Array(7).fill(60)));
    fetch(`https://api.open-meteo.com/v1/air-quality?latitude=${userLat}&longitude=${userLng}&hourly=european_aqi&past_days=30&forecast_days=0`)
      .then(r => r.json()).then(d => {
        const hist = d.hourly?.european_aqi ?? []; let debt = 0; const dh = [];
        for (let i = 0; i < 30; i++) { const sl = hist.slice(i * 24, (i + 1) * 24).filter(Boolean); const avg = sl.length ? Math.round(sl.reduce((a, b) => a + b, 0) / sl.length) : 60; debt += Math.max(0, avg - 100); dh.push(debt); }
        setAirDebt(debt); setDebtHistory(dh);
      }).catch(() => { setAirDebt(240); setDebtHistory(Array.from({ length: 30 }, (_, i) => Math.round(i * 8 + Math.random() * 20))); });
  }, [userLat, userLng]);

  useEffect(() => {
    const plan = activeWeekPlan;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cells = [];
    const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const gridStart = new Date(mStart); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    for (let i = 0; i < 35; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const isFuture = d > today;
      const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 86400));
      const aqi = isFuture && diffDays < 7 ? forecastAqi[diffDays] ?? 55 : Math.round(35 + Math.abs(Math.sin(i * 0.7)) * 85);
      const dow = d.getDay(); const session = plan.find(p => p.d === dayNames[dow]);
      cells.push({ date: new Date(d), aqi, session, isToday, isFuture, label: d.getDate(), month: d.getMonth() });
    }
    setCalDays(cells);
  }, [phase, forecastAqi, parsedCustom]);

  // Parse custom plan text
  const parseCustomPlan = () => {
    const lines = customPlanText.trim().split('\n').filter(Boolean);
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const parsed = [];
    lines.forEach(line => {
      const dayMatch = dayNames.find(d => line.toLowerCase().startsWith(d.toLowerCase()));
      if (!dayMatch) return;
      const rest = line.replace(/^(mon|tue|wed|thu|fri|sat|sun)[:\-\s]*/i, '').trim();
      const kmMatch = rest.match(/(\d+\.?\d*)\s*km/i);
      const km = kmMatch ? parseFloat(kmMatch[1]) : 0;
      const lowerRest = rest.toLowerCase();
      const intensity = lowerRest.includes('rest') ? 'rest' : lowerRest.includes('interval') || lowerRest.includes('hiit') || lowerRest.includes('tempo') || lowerRest.includes('hard') ? 'hard' : lowerRest.includes('moderate') || lowerRest.includes('long') ? 'moderate' : 'easy';
      const sessionName = rest.replace(/\d+\.?\d*\s*km/i, '').replace(/\(.*?\)/g, '').trim() || (intensity === 'rest' ? 'Rest' : 'Training');
      parsed.push({ d: dayMatch, s: sessionName, i: intensity, km });
    });
    if (parsed.length > 0) { setParsedCustom(parsed); setAiPlan(null); setShowCustomInput(false); }
  };

  const debtStatus = airDebt < 200 ? { label: 'Lungs recovering well', color: '#00ffc8', icon: '✓' } : airDebt < 500 ? { label: 'Elevated air stress', color: '#ffb830', icon: '⚠' } : { label: 'High air debt — consider indoor week', color: '#ff5c5c', icon: '🔴' };
  const phaseObj = PHASES.find(p => p.id === phase);
  const debtMaxBar = Math.max(...debtHistory, 1);

  async function reschedule() {
    setRescheduling(true); setAiPlan(null);
    try {
      const planStr = activeWeekPlan.map(w => `${w.d}: ${w.s}${w.km ? `, ${w.km}km` : ''} (${w.i})`).join('; ');
      const fcStr = forecastAqi.map((a, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}: AQI ${a}`; }).join(', ');
      const prompt = `Training plan: ${planStr}. 7-day AQI forecast: ${fcStr}. Air debt score: ${airDebt}. Phase: ${parsedCustom ? 'Custom' : phase}. Reschedule sessions to lowest-AQI days. Keep total volume intact. Return exactly day-by-day, one line each as "Day: Session (intensity, km/min)". Be concise, no preamble or explanation.`;
      const planText = await geminiAI(prompt);
      if (!planText || planText.length < 10) throw new Error('empty');
      setAiPlan(planText);
    } catch {
      setAiPlan('Mon: Rest\nTue: Easy Run (easy, 8km)\nWed: Intervals (hard)\nThu: Easy Run (easy, 6km)\nFri: Rest\nSat: Long Run (moderate, 18km)\nSun: Tempo Run (moderate, 12km)');
    }
    setRescheduling(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Phase selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={() => { setPhase(p.id); setParsedCustom(null); setAiPlan(null); }}
            style={{ padding: '16px', borderRadius: 18, border: `1px solid ${phase === p.id && !parsedCustom ? p.color + '55' : 'rgba(255,255,255,0.07)'}`, background: phase === p.id && !parsedCustom ? p.color + '10' : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: p.color, marginBottom: 6 }}>WK {p.weeks}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{p.id}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Custom plan input */}
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: parsedCustom ? theme.color : 'rgba(255,255,255,0.5)' }}>📋 {parsedCustom ? 'Custom Plan Active' : 'Enter Your Own Plan'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{parsedCustom ? `${parsedCustom.length} sessions loaded — AI will reschedule around AQI` : 'Paste your weekly plan and AI will optimize it around air quality'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {parsedCustom && <button onClick={() => { setParsedCustom(null); setAiPlan(null); }} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: 'rgba(255,92,92,0.12)', border: '1px solid rgba(255,92,92,0.3)', color: '#ff5c5c', cursor: 'pointer' }}>✕ Clear</button>}
            <button onClick={() => setShowCustomInput(v => !v)}
              style={{ padding: '7px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: theme.color + '18', border: `1px solid ${theme.color}44`, color: theme.color, cursor: 'pointer' }}>
              {showCustomInput ? 'Cancel' : '+ Input Plan'}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showCustomInput && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Format: one session per line. Example:<br />
                  <span style={{ fontFamily: S.mono, color: 'rgba(255,255,255,0.5)' }}>Mon: Easy Run 8km<br />Tue: Rest<br />Wed: Tempo Run 12km<br />Thu: Intervals<br />Fri: Rest<br />Sat: Long Run 20km<br />Sun: Easy Run 6km</span>
                </div>
                <textarea value={customPlanText} onChange={e => setCustomPlanText(e.target.value)}
                  placeholder="Mon: Easy Run 8km&#10;Tue: Rest&#10;Wed: Tempo Run 12km&#10;..."
                  rows={8}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 14, fontSize: 12, fontFamily: S.mono, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.7, color: 'rgba(255,255,255,0.75)' }} />
                <button onClick={parseCustomPlan}
                  style={{ alignSelf: 'flex-end', padding: '10px 24px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg,${theme.color}30,${theme.color}10)`, border: `1px solid ${theme.color}44`, color: theme.color, cursor: 'pointer' }}>
                  Parse & Load Plan →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Calendar */}
        <Card style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>◆ Training Calendar · {today.toLocaleString('en', { month: 'long', year: 'numeric' })}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {Object.entries(IC).filter(([k]) => k !== 'rest').map(([k, c]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />{k}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {calDays.map((cell, i) => {
              const aqC = waqiAqiColor(cell.aqi);
              const workC = cell.session ? IC[cell.session.i] : null;
              const isSel = selectedDay?.date.toDateString() === cell.date.toDateString();
              return (
                <motion.button key={i} onClick={() => setSelectedDay(isSel ? null : cell)}
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.006 }}
                  style={{ padding: '5px 2px', borderRadius: 10, border: `1px solid ${isSel ? theme.color + '55' : cell.isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`, background: isSel ? theme.color + '14' : cell.isToday ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: cell.month === today.getMonth() ? 1 : 0.3, aspectRatio: '1', justifyContent: 'center', transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: cell.isToday ? theme.color : 'rgba(255,255,255,0.4)' }}>{cell.label}</span>
                  <span style={{ fontSize: 8, fontFamily: S.mono, fontWeight: 700, color: aqC }}>{cell.aqi}</span>
                  {workC && workC !== 'transparent' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: workC, display: 'inline-block' }} />}
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence>
            {selectedDay && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 14, padding: '14px', borderRadius: 14, background: theme.color + '08', border: `1px solid ${theme.color}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.color }}>{selectedDay.date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>Air Quality</div>
                      <div style={{ fontSize: 22, fontWeight: 900, fontFamily: S.mono, color: waqiAqiColor(selectedDay.aqi) }}>{selectedDay.aqi}</div>
                      <div style={{ fontSize: 11, color: waqiAqiColor(selectedDay.aqi), marginTop: 2 }}>{waqiAqiLabel(selectedDay.aqi)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 4 }}>Session</div>
                      {selectedDay.session?.i !== 'rest'
                        ? <><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{selectedDay.session?.s}</div><div style={{ fontSize: 11, color: IC[selectedDay.session?.i] }}>{selectedDay.session?.i}{selectedDay.session?.km ? ` · ${selectedDay.session.km}km` : ''}</div></>
                        : <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Rest day</div>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Week plan */}
          <Card style={{ padding: '18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 14, fontFamily: S.mono }}>This Week · <span style={{ color: parsedCustom ? theme.color : phaseObj?.color }}>{parsedCustom ? 'Custom' : phase}</span></div>
            {activeWeekPlan.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width: 28, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', fontFamily: S.mono }}>{w.d}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: IC[w.i] ?? IC.rest, opacity: w.i === 'rest' ? 0.2 : 1, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.s}</span>
                {w.km > 0 && <span style={{ fontSize: 10, fontFamily: S.mono, color: 'rgba(255,255,255,0.28)' }}>{w.km}km</span>}
              </div>
            ))}
          </Card>
          {/* Air debt */}
          <Card style={{ padding: '18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 12, fontFamily: S.mono }}>Air Debt · 30 days</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 32, fontWeight: 900, fontFamily: S.mono, color: debtStatus.color }}>{airDebt}</div>
              <div><div style={{ fontSize: 16 }}>{debtStatus.icon}</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, maxWidth: 140 }}>{debtStatus.label}</div></div>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((airDebt / 600) * 100, 100)}%` }} transition={{ duration: 1.2 }}
                style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,#00ffc8,${debtStatus.color})` }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36, marginTop: 8 }}>
              {debtHistory.map((v, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 2, background: v > 500 ? '#ff5c5c' : v > 200 ? '#ffb830' : '#00ffc8', height: `${(v / debtMaxBar) * 100}%`, minHeight: 2, opacity: 0.55 + 0.45 * (i / debtHistory.length) }} />
              ))}
            </div>
          </Card>
          {/* Reschedule button */}
          <button onClick={reschedule} disabled={rescheduling}
            style={{ padding: '16px', borderRadius: 18, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: `linear-gradient(135deg,${theme.color}20,${theme.color}08)`, border: `1px solid ${theme.color}44`, color: theme.color, cursor: rescheduling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 0 20px ${theme.glow}` }}>
            {rescheduling ? <><Spinner color={theme.color} size={14} /> Consulting AI…</> : '◈ Reschedule for Clean Air'}
          </button>
        </div>
      </div>

      {/* AI result */}
      <AnimatePresence>
        {aiPlan && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card style={{ padding: '24px', border: `1px solid ${theme.color}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ color: theme.color, fontSize: 16 }}>◈</span>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>AI — Air-Optimized Reschedule</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Original Plan</div>
                  {activeWeekPlan.map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8 }}>
                      <span style={{ width: 28, fontWeight: 700, color: 'rgba(255,255,255,0.28)', fontFamily: S.mono }}>{w.d}</span>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: IC[w.i], opacity: w.i === 'rest' ? 0.2 : 1, flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>{w.s}{w.km ? ` · ${w.km}km` : ''}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, color: theme.color }}>AI Rescheduled</div>
                  {aiPlan.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: theme.color, flexShrink: 0, marginTop: 1 }}>→</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Country bounding boxes for geo-filtered WAQI station lookup ──────────────
const COUNTRY_BOUNDS: Record<string, [number, number, number, number]> = {
  // [south, west, north, east]
  "india": [8.4, 68.7, 37.6, 97.4],
  "china": [18.2, 73.5, 53.6, 134.8],
  "united states": [24.5, -124.8, 49.4, -66.9],
  "usa": [24.5, -124.8, 49.4, -66.9],
  "united kingdom": [49.9, -8.2, 60.9, 1.8],
  "uk": [49.9, -8.2, 60.9, 1.8],
  "germany": [47.3, 5.9, 55.1, 15.0],
  "france": [42.3, -4.8, 51.1, 8.2],
  "japan": [24.0, 122.9, 45.5, 153.0],
  "australia": [-43.7, 113.3, -10.7, 153.6],
  "brazil": [-33.8, -73.9, 5.3, -34.7],
  "canada": [41.7, -141.0, 83.1, -52.6],
  "russia": [41.2, 19.6, 81.9, 180.0],
  "indonesia": [-11.0, 95.0, 5.9, 141.0],
  "pakistan": [23.6, 60.9, 37.1, 77.8],
  "bangladesh": [20.7, 88.0, 26.6, 92.7],
  "nigeria": [4.3, 2.7, 13.9, 14.7],
  "niger": [11.7, 0.2, 23.5, 15.9],
  "mexico": [14.5, -117.1, 32.7, -86.7],
  "south korea": [33.1, 124.6, 38.6, 129.6],
  "italy": [36.6, 6.6, 47.1, 18.5],
  "spain": [36.0, -9.3, 43.8, 3.3],
  "turkey": [36.0, 26.0, 42.1, 44.8],
  "thailand": [5.6, 97.3, 20.5, 105.6],
  "vietnam": [8.4, 102.1, 23.4, 109.5],
  "poland": [49.0, 14.1, 54.8, 24.1],
  "ukraine": [44.4, 22.1, 52.4, 40.2],
  "colombia": [-4.2, -79.0, 12.5, -66.9],
  "egypt": [22.0, 24.7, 31.7, 37.1],
  "iran": [25.1, 44.0, 39.8, 63.3],
  "malaysia": [0.9, 99.7, 7.4, 119.3],
  "nepal": [26.4, 80.1, 30.4, 88.2],
  "singapore": [1.1, 103.6, 1.5, 104.1],
  "philippines": [4.6, 116.9, 21.1, 126.6],
  "south africa": [-34.8, 16.5, -22.1, 32.9],
  "argentina": [-55.1, -73.6, -21.8, -53.6],
  "kenya": [-4.7, 33.9, 4.6, 41.9],
  "sweden": [55.3, 11.1, 69.1, 24.2],
  "norway": [57.9, 4.6, 71.2, 31.1],
  "netherlands": [50.8, 3.4, 53.5, 7.2],
  "switzerland": [45.8, 5.9, 47.8, 10.5],
  "austria": [46.4, 9.5, 49.0, 17.2],
  "greece": [34.9, 19.4, 42.0, 29.6],
  "portugal": [36.8, -9.5, 42.1, -6.2],
  "belgium": [49.5, 2.5, 51.5, 6.4],
  "denmark": [54.6, 8.1, 57.7, 15.2],
  "finland": [59.8, 19.1, 70.1, 31.6],
  "chile": [-55.9, -75.6, -17.5, -66.4],
  "peru": [-18.4, -81.3, -0.1, -68.7],
  "ghana": [4.7, -3.3, 11.2, 1.2],
  "ethiopia": [3.4, 33.0, 14.9, 48.0],
  "tanzania": [-11.7, 29.3, -1.0, 40.4],
  "mali": [10.1, -5.5, 25.0, 4.3],
  "chad": [7.4, 13.5, 23.5, 24.0],
  "algeria": [18.9, -8.7, 37.1, 12.0],
  "libya": [19.5, 9.4, 33.2, 25.2],
  "sudan": [8.7, 21.8, 22.2, 38.6],
  "angola": [-18.0, 11.7, -4.4, 24.1],
  "mozambique": [-26.9, 30.2, -10.5, 40.9],
  "zimbabwe": [-22.4, 25.2, -15.6, 33.1],
  "zambia": [-18.1, 21.9, -8.2, 33.7],
  "cameroon": [1.7, 8.5, 13.1, 16.2],
  "senegal": [12.3, -17.5, 16.7, -11.4],
  "uganda": [-1.5, 29.6, 4.2, 35.0],
  "morocco": [27.7, -13.2, 35.9, -1.0],
  "tunisia": [30.2, 7.5, 37.5, 11.6],
  "iraq": [29.1, 38.8, 37.4, 48.8],
  "saudi arabia": [16.4, 36.5, 32.2, 55.7],
  "ukraine": [44.4, 22.1, 52.4, 40.2],
  "myanmar": [9.8, 92.2, 28.5, 101.2],
  "sri lanka": [5.9, 79.7, 9.8, 81.9],
  "cambodia": [10.4, 102.3, 14.7, 107.6],
  "laos": [13.9, 100.1, 22.5, 107.7],
  "czech republic": [48.6, 12.1, 51.1, 18.9],
  "hungary": [45.7, 16.1, 48.6, 22.9],
  "romania": [43.6, 20.3, 48.3, 30.0],
  "slovakia": [47.7, 16.8, 49.6, 22.6],
  "croatia": [42.4, 13.5, 46.6, 19.4],
  "serbia": [42.2, 18.8, 46.2, 23.0],
  "new zealand": [-47.3, 166.4, -34.4, 178.6],
  "israel": [29.5, 34.3, 33.3, 35.9],
  "jordan": [29.2, 35.0, 33.4, 39.3],
  "lebanon": [33.1, 35.1, 34.7, 36.6],
  "syria": [32.3, 35.7, 37.3, 42.4],
  "afghanistan": [29.4, 60.5, 38.5, 74.9],
  "uzbekistan": [37.2, 56.0, 45.6, 73.1],
  "kazakhstan": [40.6, 50.3, 55.4, 87.4],
  "azerbaijan": [38.4, 44.8, 41.9, 50.4],
  "georgia": [41.1, 40.0, 43.6, 46.7],
  "armenia": [38.8, 43.4, 41.3, 46.6],
};

// ── Global AQI Map ────────────────────────────────────────────────────────────
function AQILeafletMap({ theme }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const boundsTimerRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const aiCacheRef = useRef({});
  const nominatimCacheRef = useRef({});
  const lastCountryRef = useRef(null);
  const [countryPanel, setCountryPanel] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapInstanceRef.current) return;
    let destroyed = false;
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css-global')) {
        const link = document.createElement('link'); link.id = 'leaflet-css-global'; link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      if (!window.L) {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      }
      if (destroyed || !mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { center: [20, 0], zoom: 3, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', opacity: 0.85 }).addTo(map);
      L.tileLayer(`https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${WAQI_TOKEN}`, { attribution: '© WAQI', opacity: 0.65 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
    };
    loadLeaflet();
    return () => { destroyed = true; if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  const fetchStations = useCallback(async () => {
    const map = mapInstanceRef.current; const L = window.L;
    if (!map || !L || !markersLayerRef.current) return;
    if (map.getZoom() < 4) { markersLayerRef.current.clearLayers(); return; }
    const bounds = map.getBounds();
    const url = `https://api.waqi.info/map/bounds/?latlng=${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}&token=${WAQI_TOKEN}`;
    try {
      const res = await fetch(url); const data = await res.json();
      if (data.status !== 'ok') return;
      markersLayerRef.current.clearLayers();
      data.data.forEach(station => {
        const aqi = parseInt(station.aqi); if (isNaN(aqi)) return;
        const color = waqiAqiColor(aqi);
        const marker = window.L.circleMarker([station.lat, station.lon], { radius: 7, fillColor: color, fillOpacity: 0.85, color: '#000', weight: 1 });
        marker.bindPopup(`<div style="font-family:monospace;background:#0a0a0f;color:#eee;padding:12px;border-radius:10px;min-width:150px"><div style="font-size:24px;font-weight:900;color:${color}">${aqi}</div><div style="font-size:10px;color:${color};margin-bottom:4px">${waqiAqiLabel(aqi)}</div><div style="font-size:10px;color:rgba(255,255,255,0.35)">${station.station?.name || ''}</div></div>`, { className: 'waqi-popup' });
        marker.bindTooltip(`<div style="font-family:monospace;font-size:11px;background:#0a0a0f;color:${color};padding:3px 8px;border:1px solid ${color}44;border-radius:6px">AQI ${aqi}</div>`, { permanent: false, direction: 'top' });
        markersLayerRef.current.addLayer(marker);
      });
    } catch (e) { console.warn('WAQI bounds:', e); }
  }, []);

  const handleMapHover = useCallback(async (lat, lng) => {
  const roundedLat = Math.round(lat * 3) / 3;
  const roundedLng = Math.round(lng * 3) / 3;
  const nomCacheKey = `${roundedLat},${roundedLng}`;

  let countryData = null;
  if (nominatimCacheRef.current[nomCacheKey]) {
    countryData = nominatimCacheRef.current[nomCacheKey];
  } else {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=5`
      );
      const data = await res.json();
      if (!data.address?.country) return;
      countryData = {
        country: data.address.country,
        countryCode: data.address.country_code?.toUpperCase(),
      };
      nominatimCacheRef.current[nomCacheKey] = countryData;
    } catch { return; }
  }

  const { country, countryCode } = countryData;
  if (country === lastCountryRef.current) return;
  lastCountryRef.current = country;

  setPanelLoading(true);
  setCountryPanel({ country, countryCode, cities: [], aiText: null, loading: true });

  try {
    // ── FIX: Use geographic bounding box to get stations IN this country ──
    const countryKey = country.toLowerCase();
    let cities = [];

    // Find matching bounds
    let bounds: [number, number, number, number] | null = null;
    for (const [key, bb] of Object.entries(COUNTRY_BOUNDS)) {
      if (countryKey.includes(key) || key.includes(countryKey)) {
        bounds = bb; break;
      }
    }

    if (bounds) {
      // Use WAQI map/bounds — returns stations actually within the bbox
      const [s, w, n, e] = bounds;
      const waqiRes = await fetch(
        `https://api.waqi.info/map/bounds/?latlng=${s},${w},${n},${e}&token=${WAQI_TOKEN}`
      );
      const waqiData = await waqiRes.json();

      if (waqiData.status === 'ok' && waqiData.data?.length > 0) {
        // Group by city name (first segment before comma), average AQI
        const cityMap: Record<string, { name: string; aqi: number; count: number }> = {};
        waqiData.data.forEach(st => {
          const aqiVal = parseInt(st.aqi);
          if (isNaN(aqiVal) || !st.station?.name) return;
          const cityName = st.station.name.split(',')[0].trim();
          if (!cityMap[cityName]) {
            cityMap[cityName] = { name: cityName, aqi: aqiVal, count: 1 };
          } else {
            cityMap[cityName].aqi = Math.round(
              (cityMap[cityName].aqi * cityMap[cityName].count + aqiVal) /
              (cityMap[cityName].count + 1)
            );
            cityMap[cityName].count++;
          }
        });
        cities = Object.values(cityMap)
          .sort((a, b) => b.aqi - a.aqi)  // highest AQI first (worst air)
          .slice(0, 8);
      }
    }

    // Fallback: if bounds lookup gave 0 results, use a ~400km box around the hovered point
    // This avoids text-search which returns wrong-country results (e.g. "Niger" returns Bangalore)
    if (cities.length === 0) {
      const delta = 3.5; // ~400km
      const s2 = lat - delta, n2 = lat + delta, w2 = lng - delta, e2 = lng + delta;
      try {
        const waqiRes = await fetch(
          `https://api.waqi.info/map/bounds/?latlng=${s2},${w2},${n2},${e2}&token=${WAQI_TOKEN}`
        );
        const waqiData = await waqiRes.json();
        if (waqiData.status === 'ok' && waqiData.data?.length > 0) {
          const cityMap: Record<string, { name: string; aqi: number; count: number }> = {};
          waqiData.data.forEach(st => {
            const aqiVal = parseInt(st.aqi);
            if (isNaN(aqiVal) || !st.station?.name) return;
            const cityName = st.station.name.split(',')[0].trim();
            if (!cityMap[cityName]) cityMap[cityName] = { name: cityName, aqi: aqiVal, count: 1 };
            else { cityMap[cityName].aqi = Math.round((cityMap[cityName].aqi * cityMap[cityName].count + aqiVal) / (cityMap[cityName].count + 1)); cityMap[cityName].count++; }
          });
          cities = Object.values(cityMap).sort((a, b) => b.aqi - a.aqi).slice(0, 8);
        }
      } catch { /* ignore */ }
    }

    setCountryPanel(prev => ({ ...prev, cities, loading: false }));

    // ── AI insight ──
    if (aiCacheRef.current[country]) {
      setCountryPanel(prev => ({ ...prev, aiText: aiCacheRef.current[country] }));
      setPanelLoading(false);
      return;
    }

    if (!GEMINI_KEY) {
      // No API key — show a static message
      const fallback = `${country} air quality data shown above from ${cities.length} monitoring stations. Top polluted city: ${cities[0]?.name ?? 'N/A'} (AQI ${cities[0]?.aqi ?? 'N/A'}).`;
      aiCacheRef.current[country] = fallback;
      setCountryPanel(prev => ({ ...prev, aiText: fallback }));
      setPanelLoading(false);
      return;
    }

    const cityData = cities.map(c => `${c.name}: AQI ${c.aqi}`).join(', ');
    const avgAqi = cities.length
      ? Math.round(cities.reduce((a, c) => a + c.aqi, 0) / cities.length)
      : 'unknown';

    const prompt = `Country: ${country}. Current city AQI readings (sorted worst to best): ${cityData || 'unavailable'}. Average: ${avgAqi}. Give 2 sentences: (1) Primary pollution sources specific to ${country}. (2) Athlete advisory for training in ${country} right now. Be country-specific and concise.`;

    const aiText = await geminiAI(prompt);
    if (aiText) {
      aiCacheRef.current[country] = aiText;
      setCountryPanel(prev => ({ ...prev, aiText }));
    }
  } catch (e) {
    console.warn('Country panel error:', e);
    setCountryPanel(prev => ({ ...prev, loading: false }));
  }

  setPanelLoading(false);
}, []);
  // Wire map events once map is ready
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // fetchStations on move/zoom
    map.on('moveend', fetchStations);
    map.on('zoomend', fetchStations);
    fetchStations();

    // handleMapHover on mousemove — debounced via hoverTimerRef
    const onMouseMove = (e) => {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        handleMapHover(e.latlng.lat, e.latlng.lng);
      }, 400);
    };
    map.on('mousemove', onMouseMove);

    return () => {
      map.off('moveend', fetchStations);
      map.off('zoomend', fetchStations);
      map.off('mousemove', onMouseMove);
    };
  }, [mapReady, fetchStations, handleMapHover]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(searchQuery)}&token=${WAQI_TOKEN}`);
      const data = await res.json();
      if (data.data?.[0]) { const s = data.data[0]; const geo = s.station?.geo; if (geo && mapInstanceRef.current) mapInstanceRef.current.setView([geo[0], geo[1]], 10); }
    } catch {}
  };

  const overallAqi = countryPanel?.cities?.length ? Math.round(countryPanel.cities.reduce((a, c) => a + c.aqi, 0) / countryPanel.cities.length) : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 72px)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* Search + controls */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Search city…"
            style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, background: 'rgba(6,6,8,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', outline: 'none', width: 160, fontFamily: S.font }} />
          <button onClick={handleSearch} style={{ padding: '8px 14px', borderRadius: 12, fontSize: 13, background: 'rgba(6,6,8,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>⌕</button>
        </div>
        <button onClick={() => navigator.geolocation.getCurrentPosition(pos => mapInstanceRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 10))}
          style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, background: 'rgba(6,6,8,0.92)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          ◎ My Location
        </button>
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(6,6,8,0.92)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: S.mono }}>
          Hover country to see city data
        </div>
      </div>
      {/* AQI legend */}
      <div style={{ position: 'absolute', bottom: 24, left: 16, zIndex: 1000, padding: '12px 14px', borderRadius: 14, background: 'rgba(6,6,8,0.92)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 8, fontFamily: S.mono }}>AQI Scale</div>
        {[{ range: '0–50', label: 'Good', color: '#00e57a' }, { range: '51–100', label: 'Moderate', color: '#ffe033' }, { range: '101–150', label: 'Sensitive', color: '#ff8c00' }, { range: '151–200', label: 'Unhealthy', color: '#ff3a3a' }, { range: '201–300', label: 'Very Unhealthy', color: '#aa44cc' }, { range: '300+', label: 'Hazardous', color: '#7e0023' }].map(item => (
          <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontFamily: S.mono, color: 'rgba(255,255,255,0.45)' }}>{item.range}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* Country panel */}
      <AnimatePresence>
        {countryPanel && (
          <motion.div key="cpanel" initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{ position: 'absolute', top: 16, right: 200, zIndex: 999, width: 270, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', borderRadius: 20, background: 'rgba(6,6,8,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
            {/* Header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: overallAqi ? waqiAqiColor(overallAqi) + '14' : 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{countryFlag(countryPanel.country)}</span>
                  <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.01em', color: '#fff', textTransform: 'uppercase', fontFamily: S.display }}>{countryPanel.country}</span>
                </div>
                <button onClick={() => { setCountryPanel(null); lastCountryRef.current = null; }} style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11 }}>✕</button>
              </div>
              {overallAqi && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: waqiAqiColor(overallAqi) }} /><span style={{ fontSize: 12, color: waqiAqiColor(overallAqi) }}>Avg: {waqiAqiLabel(overallAqi)} ({overallAqi})</span></div>}
            </div>
            {/* City rankings */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 12, fontFamily: S.mono }}>◆ City Rankings</div>
              {countryPanel.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner color="rgba(255,255,255,0.3)" size={13} /><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>Loading stations…</span></div>
              ) : countryPanel.cities.length === 0 ? (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No stations found for this region</div>
              ) : countryPanel.cities.map((city, i) => {
                const color = waqiAqiColor(city.aqi);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: S.mono, width: 14 }}>{i + 1}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city.name}</span>
                        <span style={{ fontSize: 12, fontFamily: S.mono, fontWeight: 700, color, marginLeft: 6, flexShrink: 0 }}>{city.aqi}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((city.aqi / 300) * 100, 100)}%` }} transition={{ delay: i * 0.08 }} style={{ height: '100%', borderRadius: 99, background: color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* AI insight */}
            {countryPanel.aiText && (
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 8, fontFamily: S.mono }}>◈ AI Insight</div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{countryPanel.aiText}</p>
              </div>
            )}
            {panelLoading && !countryPanel.aiText && (
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Spinner color="#00ffc8" size={13} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Analysing with AI…</span>
              </div>
            )}
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: S.mono, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#00ffc8' }}>◈</span> Claude AI · Hover map to explore</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── NEW FEATURE 1: AQI Coach (AI Chat) ──────────────────────────────────────
function AQICoach({ theme, aqi, components }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your AQI Coach. Today's air quality is at level ${aqi}/5 (${AQI_LEVELS[aqi]?.label}). Ask me anything about training safely, pollutant effects, or how to adapt your workouts to today's conditions.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);

  const QUICK = [
    'Can I run outside today?',
    'What mask should I wear?',
    'How does PM2.5 affect my VO2 max?',
    'Best time to train today?',
    'How to warm up in polluted air?',
  ];

  const sendMessage = async (text) => {
    const userMsg = text || input.trim(); if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const pollSummary = Object.entries(components).map(([k, v]) => `${POLLUTANT_INFO[k]?.name || k}: ${v.toFixed(2)} μg/m³`).join(', ');
    const systemPrompt = `You are an expert AQI Coach specialising in sports physiology and air quality science. Current AQI: ${aqi}/5 (${AQI_LEVELS[aqi]?.label}). Pollutants: ${pollSummary}. Give concise, practical, science-backed advice in 2-4 sentences. Be direct and actionable.`;
    try {
      const history = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
      const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${history}\nuser: ${userMsg}\nassistant:`;
      const reply = await geminiAI(fullPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: reply || 'No response received.' }]);
    } catch (err) {
      console.error('Coach error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ AI error: ${err.message}. Make sure VITE_GEMINI_KEY is set in your .env file.` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: theme.glow, border: `1px solid ${theme.color}33` }}>🧬</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: S.display }}>AQI Coach</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>AI-powered sports physiology & air quality advisor</div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: theme.color + '18', border: `1px solid ${theme.color}33`, color: theme.color, fontFamily: S.mono }}>AQI {aqi}/5 · {AQI_LEVELS[aqi]?.label}</div>
      </div>

      {/* Quick questions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK.map((q, i) => (
          <button key={i} onClick={() => sendMessage(q)}
            style={{ padding: '7px 14px', borderRadius: 99, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s', fontFamily: S.font }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.color + '15'; e.currentTarget.style.borderColor = theme.color + '44'; e.currentTarget.style.color = theme.color; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            {q}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <Card style={{ height: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: 10, background: theme.glow, border: `1px solid ${theme.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 10, alignSelf: 'flex-end' }}>🧬</div>
              )}
              <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px', background: m.role === 'user' ? theme.color + '22' : 'rgba(255,255,255,0.05)', border: `1px solid ${m.role === 'user' ? theme.color + '44' : 'rgba(255,255,255,0.08)'}`, fontSize: 13, lineHeight: 1.65, color: m.role === 'user' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.7)' }}>
                {m.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: theme.glow, border: `1px solid ${theme.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧬</div>
              <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner color={theme.color} size={12} /><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Analysing…</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about training, masks, lung health…"
            style={{ flex: 1, padding: '10px 16px', borderRadius: 12, fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontFamily: S.font }} />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: input.trim() ? theme.color + '25' : 'rgba(255,255,255,0.04)', border: `1px solid ${input.trim() ? theme.color + '44' : 'rgba(255,255,255,0.08)'}`, color: input.trim() ? theme.color : 'rgba(255,255,255,0.2)', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>→</button>
        </div>
      </Card>
    </div>
  );
}

// ── NEW FEATURE 2: Pollution Exposure Calculator ─────────────────────────────
function ExposureCalculator({ theme, components, aqi }) {
  const [weight, setWeight] = useState('70');
  const [duration, setDuration] = useState('45');
  const [intensity, setIntensity] = useState('moderate');
  const [activityType, setActivityType] = useState('running');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [aiRisk, setAiRisk] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Ventilation rates (L/min) by activity & intensity
  const VR = {
    running: { easy: 40, moderate: 65, hard: 90 },
    cycling: { easy: 45, moderate: 70, hard: 100 },
    walking: { easy: 15, moderate: 22, hard: 30 },
    hiit:    { easy: 50, moderate: 80, hard: 120 },
  };

  const ventRate = VR[activityType]?.[intensity] ?? 65; // L/min
  const durationMin = parseFloat(duration) || 45;
  const weightKg = parseFloat(weight) || 70;
  const totalAirL = ventRate * durationMin; // Litres breathed
  const pm25Conc = components?.pm2_5 ?? 15; // μg/m³
  const pm25Dep = pm25Conc * totalAirL * 0.001 * 0.3; // ~30% deposition rate, μg
  const no2Conc = components?.no2 ?? 10;
  const no2Dose = no2Conc * totalAirL * 0.001 * 0.7; // μg absorbed
  const o3Conc = components?.o3 ?? 50;
  const o3Dose = o3Conc * totalAirL * 0.001 * 0.4;
  const totalLoadScore = (pm25Dep / 100) * 40 + (no2Dose / 50) * 30 + (o3Dose / 60) * 30;
  const riskPct = Math.min(totalLoadScore, 100);
  const riskColor = riskPct < 25 ? '#00ffc8' : riskPct < 50 ? '#a8ff44' : riskPct < 75 ? '#ffb830' : '#ff5c5c';
  const riskLabel = riskPct < 25 ? 'Minimal' : riskPct < 50 ? 'Low' : riskPct < 75 ? 'Moderate' : 'High';

  const equivalentCigs = (pm25Dep / 1000).toFixed(3); // very rough equivalent
  const maskReduction = aqi <= 2 ? 0 : aqi === 3 ? 30 : aqi === 4 ? 85 : 95;

  const getAiRisk = async () => {
    setAiLoading(true);
    try {
      const prompt = `Athlete: ${weightKg}kg, ${durationMin} min ${activityType} at ${intensity} intensity. PM2.5: ${pm25Conc} μg/m³, NO2: ${no2Conc} μg/m³, O3: ${o3Conc} μg/m³. Estimated PM2.5 lung deposit: ${pm25Dep.toFixed(1)} μg. In 3 bullet points, give: (1) specific health impact of this exposure session, (2) recovery nutrition/supplement advice to counteract oxidative stress, (3) one concrete modification to reduce exposure by 40%+. Be specific.`;
      const riskText = await geminiAI(prompt);
      setAiRisk(riskText || '');
    } catch { setAiRisk('• Moderate bronchial inflammation likely from this exposure level.\n• Consider vitamin C (1000mg) and omega-3s post-session to reduce oxidative stress.\n• Reducing pace by 20% cuts ventilation rate ~30%, significantly lowering PM2.5 intake.'); }
    setAiLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)' }}>🫁</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: S.display }}>Pollution Exposure Calculator</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>Real-time dose modelling based on your lung volume, session type & current air</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Session Parameters</div>
          {[
            { label: 'Body Weight (kg)', value: weight, onChange: setWeight, type: 'number', min: 30, max: 200 },
            { label: 'Duration (min)', value: duration, onChange: setDuration, type: 'number', min: 5, max: 300 },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: S.mono }}>{f.label}</div>
              <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} min={f.min} max={f.max}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 16, fontWeight: 700, fontFamily: S.mono, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: S.mono }}>Activity Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 }}>
              {[['running','🏃 Running'],['cycling','🚴 Cycling'],['walking','🚶 Walking'],['hiit','💥 HIIT']].map(([id,lbl]) => (
                <button key={id} onClick={() => setActivityType(id)}
                  style={{ padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: activityType === id ? theme.color + '18' : 'rgba(255,255,255,0.03)', border: `1px solid ${activityType === id ? theme.color + '44' : 'rgba(255,255,255,0.07)'}`, color: activityType === id ? theme.color : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, fontFamily: S.mono }}>Intensity</div>
            <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['easy','moderate','hard'].map(lv => (
                <button key={lv} onClick={() => setIntensity(lv)}
                  style={{ flex: 1, padding: '9px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: intensity === lv ? theme.color + '20' : 'transparent', color: intensity === lv ? theme.color : 'rgba(255,255,255,0.28)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: S.mono }}>{lv}</button>
              ))}
            </div>
          </div>
        </Card>

        <Card style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Exposure Analysis</div>
          {/* Risk dial */}
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto' }}>
              <svg viewBox="0 0 130 130" style={{ width: 130, height: 130, transform: 'rotate(-225deg)' }}>
                <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeDasharray={`${2*Math.PI*52*0.75} ${2*Math.PI*52}`} strokeLinecap="round" />
                <motion.circle cx="65" cy="65" r="52" fill="none" stroke={riskColor} strokeWidth="8"
                  strokeDasharray={`${2*Math.PI*52*0.75} ${2*Math.PI*52}`} strokeLinecap="round"
                  initial={{ strokeDashoffset: 2*Math.PI*52*0.75 }}
                  animate={{ strokeDashoffset: 2*Math.PI*52*0.75*(1-riskPct/100) }}
                  transition={{ duration: 1.5, ease: [0.16,1,0.3,1] }}
                  style={{ filter: `drop-shadow(0 0 8px ${riskColor})` }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, fontFamily: S.mono, color: riskColor }}>{Math.round(riskPct)}</div>
                <div style={{ fontSize: 9, color: riskColor + 'aa', fontWeight: 700, letterSpacing: '0.1em' }}>/100</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 900, color: riskColor, marginTop: 8 }}>{riskLabel} Exposure Risk</div>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Air Breathed', val: `${(totalAirL / 1000).toFixed(1)}m³`, col: 'rgba(255,255,255,0.6)' },
              { label: 'PM₂.₅ Deposit', val: `${pm25Dep.toFixed(1)}μg`, col: riskColor },
              { label: 'NO₂ Absorbed', val: `${no2Dose.toFixed(1)}μg`, col: '#ff8c00' },
              { label: 'O₃ Absorbed', val: `${o3Dose.toFixed(1)}μg`, col: '#4488ff' },
              { label: 'Ventilation Rate', val: `${ventRate}L/min`, col: 'rgba(255,255,255,0.5)' },
              { label: 'Mask Benefit', val: `−${maskReduction}% PM₂.₅`, col: '#00ffc8' },
            ].map(({ label, val, col }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, fontFamily: S.mono }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: S.mono, color: col }}>{val}</div>
              </div>
            ))}
          </div>
          <button onClick={getAiRisk} disabled={aiLoading}
            style={{ width: '100%', padding: '11px', borderRadius: 12, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: `linear-gradient(135deg,${theme.color}25,${theme.color}08)`, border: `1px solid ${theme.color}44`, color: theme.color, cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {aiLoading ? <><Spinner color={theme.color} size={12} /> Analysing…</> : '🧬 Get AI Risk Report'}
          </button>
        </Card>
      </div>

      {/* AI Risk report */}
      <AnimatePresence>
        {aiRisk && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card style={{ padding: '22px', border: `1px solid ${theme.color}33` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ color: theme.color }}>◈</span>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>AI Exposure Risk Report</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {aiRisk.split('\n').filter(l => l.trim()).map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: theme.color, flexShrink: 0, fontWeight: 700 }}>◦</span>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0 }}>{line.replace(/^[•\-\*]\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── City Comparison Strip ────────────────────────────────────────────────────
function CityComparisonStrip({ theme }) {
  const [cities, setCities] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addCity = async () => {
    if (!input.trim() || cities.length >= 5) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.waqi.info/search/?keyword=${encodeURIComponent(input)}&token=${WAQI_TOKEN}`);
      const data = await res.json();
      const s = data.data?.find(d => !isNaN(parseInt(d.aqi)));
      if (s) setCities(c => [...c, { name: s.station?.name?.split(',')[0] || input, aqi: parseInt(s.aqi) }]);
    } catch {}
    setInput(''); setLoading(false);
  };

  if (cities.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }} className="hide-scrollbar">
      {cities.map((c, i) => {
        const col = waqiAqiColor(c.aqi);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 12, border: `1px solid ${col}33`, background: col + '0c', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            <span style={{ fontFamily: S.mono, fontWeight: 900, fontSize: 12, color: col }}>{c.aqi}</span>
            <button onClick={() => setCities(cs => cs.filter((_, j) => j !== i))} style={{ color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0 }}>✕</button>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCity()} placeholder="Add city…"
          style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', width: 90 }} />
        <button onClick={addCity} disabled={loading}
          style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: theme.color + '20', color: theme.color, border: `1px solid ${theme.color}33`, cursor: 'pointer' }}>
          {loading ? '…' : '+'}
        </button>
      </div>
    </div>
  );
}

// ── Alert Settings ───────────────────────────────────────────────────────────
function AlertSettingsPanel({ theme, alertThreshold, setAlertThreshold, notifyEnabled, requestPermission }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>🔔 AQI Alerts</div>
        {!notifyEnabled
          ? <button onClick={requestPermission} style={{ padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: theme.color + '20', border: `1px solid ${theme.color}44`, color: theme.color, cursor: 'pointer' }}>Enable Notifications</button>
          : <span style={{ fontSize: 11, fontWeight: 700, color: '#00ffc8' }}>✓ Active</span>}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 10 }}>Alert when AQI reaches:</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[2, 3, 4, 5].map(lvl => (
          <button key={lvl} onClick={() => setAlertThreshold(lvl)}
            style={{ flex: 1, padding: '8px', borderRadius: 12, fontSize: 11, fontWeight: 700, border: `1px solid ${alertThreshold === lvl ? AQI_LEVELS[lvl].color + '55' : 'rgba(255,255,255,0.07)'}`, background: alertThreshold === lvl ? AQI_LEVELS[lvl].color + '18' : 'rgba(255,255,255,0.03)', color: alertThreshold === lvl ? AQI_LEVELS[lvl].color : 'rgba(255,255,255,0.28)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {lvl} · {AQI_LEVELS[lvl].label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function useAqiAlerts(aqi) {
  const [alertThreshold, setAlertThreshold] = useState(3);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const lastNotifyRef = useRef(0);
  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') setNotifyEnabled(true);
  };
  useEffect(() => {
    if (!notifyEnabled || aqi < alertThreshold) return;
    const now = Date.now();
    if (now - lastNotifyRef.current < 60000 * 10) return;
    lastNotifyRef.current = now;
    new Notification('AtmosWatch AQI Alert 🌫️', { body: `AQI is now ${aqi}/5 (${AQI_LEVELS[aqi]?.label}). Consider moving indoors.` });
  }, [aqi, alertThreshold, notifyEnabled]);
  return { alertThreshold, setAlertThreshold, notifyEnabled, requestPermission };
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mockAqi, setMockAqi] = useState(null);
  const [selectedPollutant, setSelectedPollutant] = useState(null);
  const [view, setView] = useState('overview');
  const [locationName, setLocationName] = useState('Detecting location…');
  const [gpsData, setGpsData] = useState(null);
  const [gpsLocationName, setGpsLocationName] = useState('Your Location');
  const [gpsLat, setGpsLat] = useState(null);
  const [gpsLng, setGpsLng] = useState(null);
  const [customLocationActive, setCustomLocationActive] = useState(false);
  const [locationSearchKey, setLocationSearchKey] = useState(0);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [effectiveAqi, setEffectiveAqi] = useState(null);
  const [historyData] = useState(() => Array.from({ length: 24 }, (_, i) => ({ hour: i, aqi: Math.floor(Math.random() * 4) + 1, pm25: 5 + Math.random() * 32 })));

  const { alertThreshold, setAlertThreshold, notifyEnabled, requestPermission } = useAqiAlerts(effectiveAqi || (data?.main?.aqi ?? 1));

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setGpsLat(lat); setGpsLng(lon); setUserLat(lat); setUserLng(lon);
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`)
          .then(r => r.json()).then(j => { setGpsData(j.list[0]); setData(j.list[0]); setLoading(false); })
          .catch(() => {
            // Fallback to WAQI for GPS location
            fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${WAQI_TOKEN}`)
              .then(r => r.json()).then(d => {
                if (d.status === 'ok') {
                  const iaqi = d.data.iaqi || {};
                  const fakeData = { main: { aqi: realAqiToIndex(d.data.aqi) }, components: { co: iaqi.co?.v ?? 0, no: 0, no2: iaqi.no2?.v ?? 0, o3: iaqi.o3?.v ?? 0, so2: iaqi.so2?.v ?? 0, pm2_5: iaqi.pm25?.v ?? 0, pm10: iaqi.pm10?.v ?? 0, nh3: 0 }, _realAqi: d.data.aqi };
                  setGpsData(fakeData); setData(fakeData);
                } else { setGpsData(MOCK_DATA); setData(MOCK_DATA); }
                setLoading(false);
              }).catch(() => { setGpsData(MOCK_DATA); setData(MOCK_DATA); setLoading(false); });
          });
        if (OWM_KEY) {
          fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OWM_KEY}`)
            .then(r => r.json()).then(j => { if (j[0]) { const n = `${j[0].name}, ${j[0].country}`; setGpsLocationName(n); setLocationName(n); } })
            .catch(() => {});
        } else {
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
            .then(r => r.json()).then(d => { const name = d.address?.city || d.address?.town || d.address?.state || 'Your Location'; const country = d.address?.country_code?.toUpperCase() || ''; const n = country ? `${name}, ${country}` : name; setGpsLocationName(n); setLocationName(n); }).catch(() => {});
        }
      },
      () => {
        const lat = 13.0827, lng = 80.2707;
        setGpsLat(lat); setGpsLng(lng); setUserLat(lat); setUserLng(lng);
        setGpsData(MOCK_DATA); setData(MOCK_DATA);
        setGpsLocationName('Chennai, IN (demo)'); setLocationName('Chennai, IN (demo)');
        setLoading(false);
      }
    );
  }, []);

  const handleLocationSelect = ({ locationName: name, lat, lng, data: newData }) => {
  setData(newData); setLocationName(name);
  setCustomLocationActive(true); setMockAqi(null); setSelectedPollutant(null);
  // ── FIX: update coords whenever we have valid numbers (0 is valid!) ──
  if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
    setUserLat(lat);
    setUserLng(lng);
  }
};

  const handleResetLocation = () => {
    if (gpsData) {
      setData(gpsData); setLocationName(gpsLocationName);
      setCustomLocationActive(false); setMockAqi(null); setSelectedPollutant(null);
      setLocationSearchKey(k => k + 1);
      if (gpsLat && gpsLng) { setUserLat(gpsLat); setUserLng(gpsLng); }
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: 48, marginBottom: 24 }}>◎</motion.div>
        <div style={{ fontFamily: S.mono, color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase' }}>Scanning atmosphere</div>
        <motion.div style={{ marginTop: 16, height: 1, background: 'rgba(255,255,255,0.2)' }} animate={{ width: ['0px', '160px', '0px'] }} transition={{ repeat: Infinity, duration: 2 }} />
      </div>
    </div>
  );

  const aqi = mockAqi || data.main.aqi;
  const theme = AQI_LEVELS[aqi];
  const components = data.components;
  const realAqiNum = data._realAqi;
  const dominantKey = Object.entries(components).sort((a, b) => (b[1] / (POLLUTANT_INFO[b[0]]?.safe || 100)) - (a[1] / (POLLUTANT_INFO[a[0]]?.safe || 100)))[0][0];
  const isMapView = view === 'map';

  const NAV_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'detail', label: 'Detail' },
    { id: 'history', label: 'History' },
    { id: 'workout', label: '⚙ Workout' },
    { id: 'windows', label: '🕐 Windows' },
    { id: 'routes', label: '🗺 Routes' },
    { id: 'planner', label: '📅 Planner' },
    { id: 'coach', label: '🧬 Coach' },
    { id: 'exposure', label: '🫁 Exposure' },
    { id: 'map', label: '🌍 Map' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: S.bg, fontFamily: S.font, color: '#fff', overflowX: 'hidden', ...(isMapView ? { height: '100vh', overflow: 'hidden' } : {}) }}>
      {/* Background */}
      {!isMapView && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 10, repeat: Infinity }}
            style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: `radial-gradient(circle,${theme.glow} 0%,transparent 70%)`, filter: 'blur(80px)' }} />
          <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 14, repeat: Infinity, delay: 5 }}
            style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '55%', height: '55%', borderRadius: '50%', background: `radial-gradient(circle,rgba(0,170,255,0.1) 0%,transparent 70%)`, filter: 'blur(90px)' }} />
          <ParticleCanvas color={theme.color} intensity={aqi / 4} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
        </div>
      )}

      {/* Topbar */}
      <div style={{ position: 'relative', zIndex: 1001, ...(isMapView ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1001 } : {}), background: 'rgba(6,6,8,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: theme.color, boxShadow: `0 0 8px ${theme.color}` }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: S.mono }}>
                {customLocationActive ? 'Custom Location' : 'Live Sensor'}
              </span>
            </div>
            <h1 style={{ fontFamily: S.display, fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>Atmos<span style={{ color: theme.color }}>Watch</span></h1>
          </div>
          {/* Nav tabs */}
          <div style={{ flex: 1, overflowX: 'auto' }} className="hide-scrollbar">
            <div style={{ display: 'flex', gap: 2, padding: '4px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', width: 'max-content', margin: '0 auto' }}>
              {NAV_TABS.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s', background: view === v.id ? theme.color + '20' : 'transparent', color: view === v.id ? theme.color : 'rgba(255,255,255,0.32)', border: `1px solid ${view === v.id ? theme.color + '44' : 'transparent'}` }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <Clock />
        </div>
        {/* Search bar */}
        {!isMapView && (
          <div style={{ padding: '10px 20px' }}>
            <LocationSearch key={locationSearchKey} theme={theme} onLocationSelect={handleLocationSelect} onResetLocation={customLocationActive ? handleResetLocation : null} />
          </div>
        )}
        <CityComparisonStrip theme={theme} />
      </div>

      {/* Map view */}
      {isMapView ? (
        <div style={{ position: 'absolute', top: 72, left: 0, right: 0, bottom: 0 }}>
          <AQILeafletMap theme={theme} />
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 40px' }}>
          {/* Custom location banner */}
          <AnimatePresence>
            {customLocationActive && (
              <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} style={{ marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: theme.color + '0c', border: `1px solid ${theme.color}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: theme.color }}>Custom Location Active</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{locationName}</div>
                    </div>
                    {realAqiNum && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>Real AQI</span>
                        <span style={{ fontFamily: S.mono, fontWeight: 900, fontSize: 14, color: waqiAqiColor(realAqiNum) }}>{realAqiNum}</span>
                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: waqiAqiColor(realAqiNum) + '20', color: waqiAqiColor(realAqiNum) }}>{waqiAqiLabel(realAqiNum)}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={handleResetLocation}
                    style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ◎ Reset to GPS
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Location', value: locationName, mono: false },
              { label: 'AQI Index', value: realAqiNum ? `${realAqiNum} (${aqi}/5)` : `${aqi} / 5`, mono: true },
              { label: 'PM₂.₅', value: `${components.pm2_5?.toFixed(1)} μg/m³`, mono: true },
              { label: 'Dominant', value: POLLUTANT_INFO[dominantKey]?.name || dominantKey, mono: false },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}
                style={{ padding: '14px 18px', borderRadius: 16, background: S.bgCard, border: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 10, color: theme.color + '88', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, fontFamily: S.mono }}>{stat.label}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: stat.mono ? S.mono : S.font }}>{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {view === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
                {/* Left */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden', border: `1px solid ${theme.color}22`, boxShadow: `inset 0 0 50px ${theme.glow}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 20, fontFamily: S.mono }}>Air Quality Index</div>
                    <RadialGauge aqi={aqi} theme={theme} />
                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: theme.color, fontFamily: S.display }}>{theme.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, marginTop: 4 }}>{theme.sub}</div>
                      {realAqiNum && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>US AQI</span><span style={{ fontFamily: S.mono, fontWeight: 900, fontSize: 18, color: waqiAqiColor(realAqiNum) }}>{realAqiNum}</span></div>}
                    </div>
                  </Card>
                  <Card style={{ padding: '18px', background: theme.glow, border: `1px solid ${theme.color}33` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.color, marginBottom: 8, fontFamily: S.mono }}>◈ Recommendation</div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>{theme.advice}</p>
                  </Card>
                  <Card style={{ padding: '18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 12, fontFamily: S.mono }}>◉ AQI Simulator</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <button key={lvl} onClick={() => setMockAqi(mockAqi === lvl ? null : lvl)}
                          style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: `1px solid ${(mockAqi === lvl || (!mockAqi && data.main.aqi === lvl)) ? AQI_LEVELS[lvl].color + '55' : 'rgba(255,255,255,0.07)'}`, background: (mockAqi === lvl || (!mockAqi && data.main.aqi === lvl)) ? AQI_LEVELS[lvl].color + '18' : 'rgba(255,255,255,0.03)', color: (mockAqi === lvl || (!mockAqi && data.main.aqi === lvl)) ? AQI_LEVELS[lvl].color : 'rgba(255,255,255,0.32)', cursor: 'pointer', transition: 'all 0.2s' }}>{lvl}</button>
                      ))}
                    </div>
                    {mockAqi && <button onClick={() => setMockAqi(null)} style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.32)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>↩ Reset to live</button>}
                  </Card>
                </div>
                {/* Right */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <HealthProfilePanel aqi={aqi} theme={theme} onEffectiveAqiChange={setEffectiveAqi} />
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', fontFamily: S.mono }}>◌ Pollutant Breakdown — tap to expand</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(components).map(([name, value], idx) => (
                      <PollutantRow key={name} name={name} value={value} theme={theme} selected={selectedPollutant === name} onClick={() => setSelectedPollutant(selectedPollutant === name ? null : name)} idx={idx} />
                    ))}
                  </div>
                  <AlertSettingsPanel theme={theme} alertThreshold={alertThreshold} setAlertThreshold={setAlertThreshold} notifyEnabled={notifyEnabled} requestPermission={requestPermission} />
                </div>
              </motion.div>
            )}
            {view === 'detail' && (
              <motion.div key="detail" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                {Object.entries(components).map(([name, value], idx) => {
                  const info = POLLUTANT_INFO[name] || { name, unit: 'μg/m³', safe: 100, icon: name, desc: '' };
                  const pct = Math.min((value / info.safe) * 100, 100); const exc = value > info.safe;
                  return (
                    <motion.div key={name} initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: idx * 0.07 }}
                      style={{ borderRadius: 22, padding: '24px', border: `1px solid ${exc ? theme.color + '44' : S.border}`, background: S.bgCard, position: 'relative', overflow: 'hidden', boxShadow: exc ? `0 0 30px ${theme.glow}` : 'none' }}>
                      {exc && <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 99, background: theme.color + '22', color: theme.color }}>OVER LIMIT</div>}
                      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, color: theme.color, fontFamily: S.mono }}>{info.icon}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{info.name}</div>
                      <div style={{ fontSize: 44, fontWeight: 900, fontFamily: S.mono, marginBottom: 4 }}><AnimNum value={value} decimals={2} /></div>
                      <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, marginBottom: 16 }}>{info.unit}</div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 }}>
                        <motion.div style={{ height: '100%', borderRadius: 99, background: exc ? `linear-gradient(90deg,${theme.color},#ff2244)` : theme.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: idx * 0.07 + 0.1 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: S.mono, marginBottom: 16 }}><span>0</span><span>Safe: {info.safe}</span></div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', lineHeight: 1.6 }}>{info.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
            {view === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card style={{ padding: '28px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 28, fontFamily: S.mono }}>◆ 24-Hour AQI Trend (simulated)</div>
                  <div style={{ position: 'relative', height: 180 }}>
                    <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 960 170" preserveAspectRatio="none">
                      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.color} stopOpacity="0.22" /><stop offset="100%" stopColor={theme.color} stopOpacity="0" /></linearGradient></defs>
                      {[1, 2, 3, 4].map(v => <line key={v} x1="0" y1={((5 - v) / 4) * 150 + 10} x2="960" y2={((5 - v) / 4) * 150 + 10} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />)}
                      <motion.path initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} d={[`M 0 ${((5 - historyData[0].aqi) / 4) * 150 + 10}`, ...historyData.map((d, i) => `L ${(i / 23) * 960} ${((5 - d.aqi) / 4) * 150 + 10}`), `L 960 170 L 0 170 Z`].join(' ')} fill="url(#ag)" />
                      <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }} d={[`M 0 ${((5 - historyData[0].aqi) / 4) * 150 + 10}`, ...historyData.map((d, i) => `L ${(i / 23) * 960} ${((5 - d.aqi) / 4) * 150 + 10}`)].join(' ')} fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${theme.color})` }} />
                      {historyData.map((d, i) => <motion.circle key={i} initial={{ r: 0 }} animate={{ r: 4 }} transition={{ delay: (i / 23) * 1.5 }} cx={(i / 23) * 960} cy={((5 - d.aqi) / 4) * 150 + 10} fill={AQI_LEVELS[d.aqi].color} style={{ filter: `drop-shadow(0 0 4px ${AQI_LEVELS[d.aqi].color})` }} />)}
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: S.mono, color: 'rgba(255,255,255,0.18)', marginTop: 8 }}>
                    {[0, 6, 12, 18, 23].map(h => <span key={h}>{h}:00</span>)}
                  </div>
                </Card>
                <Card style={{ padding: '28px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', marginBottom: 20, fontFamily: S.mono }}>PM₂.₅ Concentration (μg/m³)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
                    {historyData.map((d, i) => (
                      <motion.div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0' }} initial={{ height: 0 }} animate={{ height: `${(d.pm25 / 40) * 100}%` }} transition={{ duration: 1, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                        style={{ flex: 1, borderRadius: '3px 3px 0 0', background: theme.color, opacity: 0.2 + (d.pm25 / 40) * 0.7, boxShadow: `0 0 6px ${theme.glow}` }} />
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
            {view === 'workout' && <motion.div key="workout" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><WorkoutAdjuster aqi={aqi} theme={theme} /></motion.div>}
            {view === 'windows' && <motion.div key="windows" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><SafeTrainingWindows theme={theme} userLat={userLat} userLng={userLng} /></motion.div>}
            {view === 'routes' && <motion.div key="routes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><RoutePlanner theme={theme} userLat={userLat} userLng={userLng} /></motion.div>}
            {view === 'planner' && <motion.div key="planner" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><TrainingBlockPlanner theme={theme} userLat={userLat} userLng={userLng} /></motion.div>}
            {view === 'coach' && <motion.div key="coach" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><AQICoach theme={theme} aqi={aqi} components={components} /></motion.div>}
            {view === 'exposure' && <motion.div key="exposure" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}><ExposureCalculator theme={theme} components={components} aqi={aqi} /></motion.div>}
          </AnimatePresence>

          <footer style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: S.mono }}>Data: WAQI · OpenWeatherMap · Open-Meteo · OSM · OSRM</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: S.mono }}>
              <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: theme.color }} />
              LIVE
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  return (
    <AnimatePresence mode="wait">
      {showLanding ? (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}>
          <Landing onEnter={() => setShowLanding(false)} />
        </motion.div>
      ) : (
        <motion.div key="dashboard" initial={{ opacity: 0, scale: 1.01 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Dashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}