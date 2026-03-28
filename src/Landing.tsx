// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { AQI_LEVELS, waqiAqiColor } from './constants';

function GlitchText({ text }: { text: string }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block" style={{ fontFamily: "'Syne', sans-serif" }}>
      <span style={{ opacity: glitch ? 0 : 1, transition: 'opacity 0.05s' }}>{text}</span>
      {glitch && (
        <>
          <span className="absolute inset-0" style={{ color: '#ff5c5c', left: '2px', opacity: 0.7 }}>{text}</span>
          <span className="absolute inset-0" style={{ color: '#00ffc8', left: '-2px', opacity: 0.7 }}>{text}</span>
        </>
      )}
    </span>
  );
}

function ParticleField({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, dx: (Math.random() - 0.5) * 0.3,
      dy: -Math.random() * 0.5 - 0.1, life: Math.random(), maxLife: Math.random() * 0.6 + 0.4,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy; p.life += 0.002;
        if (p.y < 0 || p.life > p.maxLife) {
          p.x = Math.random() * canvas.width; p.y = canvas.height + 5; p.life = 0;
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current!); window.removeEventListener('resize', resize); };
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

const DEMO_READINGS = [
  { city: 'Chennai', aqi: 72, idx: 2 },
  { city: 'Delhi', aqi: 187, idx: 4 },
  { city: 'London', aqi: 34, idx: 1 },
  { city: 'Beijing', aqi: 245, idx: 5 },
  { city: 'Sydney', aqi: 18, idx: 1 },
];

const FEATURE_CARDS = [
  { icon: '◎', title: 'Real-Time AQI', desc: 'Live data from WAQI network — 10,000+ stations worldwide with per-second updates.', color: '#00ffc8' },
  { icon: '⚙', title: 'Workout Adjuster', desc: 'AI-powered training load reduction based on pollutant composition and your physiology.', color: '#a8ff44' },
  { icon: '🕐', title: 'Safe Windows', desc: '24-hour training score chart blending AQI, temperature, humidity, and wind data.', color: '#ffb830' },
  { icon: '🗺', title: 'Clean Routes', desc: 'Map routes avoiding high-pollution corridors using real street-level air quality data.', color: '#00aaff' },
  { icon: '📅', title: 'Block Planner', desc: 'AI reschedules your training block around AQI forecasts to minimize total pollution load.', color: '#cc44ff' },
  { icon: '🧬', title: 'Body Score', desc: 'Cumulative air-debt tracking — see how 30 days of breathing affects your lung capacity.', color: '#ff5c5c' },
  { icon: '💬', title: 'AQI Coach', desc: 'Chat with an AI coach trained on sports physiology and air quality science.', color: '#ff8c00' },
  { icon: '🌡', title: 'Pollution Forecast', desc: 'Machine-learned 7-day AQI predictions with hourly resolution for your exact location.', color: '#00ffc8' },
];

interface LandingProps { onEnter: () => void; }

export default function Landing({ onEnter }: LandingProps) {
  const [hoveredCity, setHoveredCity] = useState<number | null>(null);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTicker(t => (t + 1) % DEMO_READINGS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const demoAqi = DEMO_READINGS[ticker];
  const theme = AQI_LEVELS[demoAqi.idx];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#060608', fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* ── Background Orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          style={{
            position: 'absolute', top: '-15%', left: '-10%',
            width: '55%', height: '55%', borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 14, repeat: Infinity, delay: 5 }}
          style={{
            position: 'absolute', bottom: '-20%', right: '-5%',
            width: '50%', height: '50%', borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,170,255,0.12) 0%, transparent 70%)`,
            filter: 'blur(90px)',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
        <ParticleField color={theme.color} />
      </div>

      {/* ── NAV ── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,6,8,0.7)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: theme.color, boxShadow: `0 0 10px ${theme.color}` }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            Atmos<span style={{ color: theme.color }}>Watch</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: `${theme.color}15`, border: `1px solid ${theme.color}33`, color: theme.color,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
            LIVE · {demoAqi.city} AQI {demoAqi.aqi}
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            style={{
              padding: '8px 22px', borderRadius: 99, fontSize: 13, fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.color}33, ${theme.color}15)`,
              border: `1px solid ${theme.color}55`, color: theme.color, cursor: 'pointer',
            }}>
            Launch App →
          </motion.button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 5, padding: '80px 40px 60px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            borderRadius: 99, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)', marginBottom: 32, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffc8', display: 'inline-block' }} />
            AQI INTELLIGENCE FOR ATHLETES
          </div>

          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 'clamp(48px, 8vw, 88px)', lineHeight: 1.0,
            letterSpacing: '-0.04em', marginBottom: 28,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.92)' }}>Train smarter.<br /></span>
            <span style={{ color: theme.color }}>
              <GlitchText text="Breathe cleaner." />
            </span>
          </h1>

          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px', fontWeight: 400 }}>
            Real-time air quality intelligence that adapts your training, maps clean routes, and protects your lungs — every session, every city.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: `0 0 40px ${theme.color}44` }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              style={{
                padding: '14px 36px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.color}, ${theme.color}bb)`,
                border: 'none', color: '#000', cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: `0 0 30px ${theme.color}33`,
              }}>
              Open Dashboard →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{
                padding: '14px 36px', borderRadius: 14, fontSize: 15, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              }}>
              View Live Map
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── CITY AQI TICKER ── */}
      <section style={{ position: 'relative', zIndex: 5, padding: '0 40px 60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {DEMO_READINGS.map((r, i) => {
            const col = waqiAqiColor(r.aqi);
            const isActive = i === ticker;
            return (
              <motion.div
                key={r.city}
                whileHover={{ scale: 1.04 }}
                onMouseEnter={() => setHoveredCity(i)}
                onMouseLeave={() => setHoveredCity(null)}
                animate={{ borderColor: isActive ? col + '66' : 'rgba(255,255,255,0.07)' }}
                style={{
                  padding: '12px 20px', borderRadius: 14, cursor: 'default',
                  background: isActive ? col + '10' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? col + '55' : 'rgba(255,255,255,0.07)'}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.3s ease',
                }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 22, color: col, lineHeight: 1 }}>{r.aqi}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginTop: 2 }}>AQI</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{r.city}</div>
                  <div style={{ fontSize: 10, color: col + 'aa' }}>{waqiAqiLabel(r.aqi)}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px 40px 80px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>FEATURES</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.9)' }}>
            Built for every breath you take
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {FEATURE_CARDS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, borderColor: f.color + '44' }}
              style={{
                padding: '22px 20px', borderRadius: 18,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'default', transition: 'all 0.2s ease',
              }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontFamily: "'Syne',sans-serif" }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 5, padding: '40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono',monospace" }}>
          Powered by WAQI · OpenWeatherMap · Open-Meteo · Claude AI
        </p>
      </section>
    </div>
  );
}
