// ── API Keys ────────────────────────────────────────────────────────
export const WAQI_TOKEN   = import.meta.env.VITE_WAQI_TOKEN   || 'demo';
export const OWM_KEY      = import.meta.env.VITE_OWM_KEY      || '';
export const GEMINI_KEY   = import.meta.env.VITE_GEMINI_KEY   || '';

// ── AQI Level Config ────────────────────────────────────────────────
export const AQI_LEVELS: Record<number, { label: string; sub: string; color: string; glow: string; advice: string; icon: string; bg: string }> = {
  1: { label:'PRISTINE',  sub:'Zero restrictions',   color:'#00ffc8', glow:'rgba(0,255,200,0.15)',   bg:'rgba(0,255,200,0.04)',   advice:'Air is pristine. All activities cleared — push your limits today.', icon:'◎' },
  2: { label:'FAIR',      sub:'Minor concerns',       color:'#a8ff44', glow:'rgba(168,255,68,0.15)',  bg:'rgba(168,255,68,0.04)',  advice:'Mild pollutants detected. Most athletes unaffected; sensitive groups monitor closely.', icon:'◑' },
  3: { label:'MODERATE',  sub:'Adjust intensity',     color:'#ffb830', glow:'rgba(255,184,48,0.15)',  bg:'rgba(255,184,48,0.04)',  advice:'Sensitive groups should reduce outdoor duration. Healthy athletes may continue with reduced intensity.', icon:'◐' },
  4: { label:'UNHEALTHY', sub:'Serious risk',         color:'#ff5c5c', glow:'rgba(255,92,92,0.15)',   bg:'rgba(255,92,92,0.04)',   advice:'Health effects for everyone. Minimize outdoor exposure. Move training indoors.', icon:'◕' },
  5: { label:'HAZARDOUS', sub:'Emergency conditions', color:'#cc44ff', glow:'rgba(204,68,255,0.15)',  bg:'rgba(204,68,255,0.04)',  advice:'Air quality emergency. No outdoor activity. All exercise must be indoor.', icon:'●' },
};

// ── Pollutant Info ──────────────────────────────────────────────────
export const POLLUTANT_INFO: Record<string, { name: string; unit: string; safe: number; icon: string; desc: string }> = {
  co:    { name:'Carbon Monoxide',  unit:'μg/m³', safe:4400, icon:'CO',   desc:'Incomplete combustion in vehicles and heating. Reduces blood oxygen capacity.' },
  no:    { name:'Nitric Oxide',     unit:'μg/m³', safe:40,   icon:'NO',   desc:'Primary combustion pollutant from traffic and industrial sources.' },
  no2:   { name:'Nitrogen Dioxide', unit:'μg/m³', safe:40,   icon:'NO₂',  desc:'Lung irritant from vehicle exhausts and power plants. Worsens asthma.' },
  o3:    { name:'Ozone',            unit:'μg/m³', safe:100,  icon:'O₃',   desc:'Ground-level smog from sunlight + NOx reactions. Inflames airways.' },
  so2:   { name:'Sulfur Dioxide',   unit:'μg/m³', safe:20,   icon:'SO₂',  desc:'Industrial combustion byproduct. Triggers bronchospasm in athletes.' },
  pm2_5: { name:'Fine Particles',   unit:'μg/m³', safe:25,   icon:'PM₂₅', desc:'Penetrates deep lung tissue. Primary cardiovascular and respiratory risk.' },
  pm10:  { name:'Coarse Particles', unit:'μg/m³', safe:50,   icon:'PM₁₀', desc:'Dust, pollen, mold. Triggers upper-airway inflammation and eye irritation.' },
  nh3:   { name:'Ammonia',          unit:'μg/m³', safe:200,  icon:'NH₃',  desc:'Agricultural and industrial emissions. Respiratory tract irritant at high levels.' },
};

// ── Workout Types ───────────────────────────────────────────────────
export const WORKOUT_TYPES = [
  { id:'easy_run',  label:'Easy Run',  icon:'🏃', unit:'km',  intensity:'low',    outdoor:true  },
  { id:'tempo_run', label:'Tempo Run', icon:'⚡', unit:'km',  intensity:'medium', outdoor:true  },
  { id:'intervals', label:'Intervals', icon:'🔥', unit:'min', intensity:'high',   outdoor:true  },
  { id:'long_run',  label:'Long Run',  icon:'🛣️', unit:'km',  intensity:'medium', outdoor:true  },
  { id:'cycle',     label:'Cycling',   icon:'🚴', unit:'km',  intensity:'medium', outdoor:true  },
  { id:'hiit',      label:'HIIT',      icon:'💥', unit:'min', intensity:'high',   outdoor:false },
  { id:'swim',      label:'Swim',      icon:'🏊', unit:'min', intensity:'medium', outdoor:false },
  { id:'gym',       label:'Gym',       icon:'🏋️', unit:'min', intensity:'medium', outdoor:false },
];

export const GYM_ALTERNATIVES: Record<string, string[]> = {
  easy_run:  ['Treadmill (easy pace)','Elliptical trainer','Rowing machine — low resistance'],
  tempo_run: ['Treadmill tempo intervals','Stationary bike (moderate)','Stair climber'],
  intervals: ['Indoor HIIT circuit','Battle ropes','Rowing sprints'],
  long_run:  ['Treadmill + incline walking','Elliptical endurance session','Long stationary bike ride'],
  cycle:     ['Stationary bike','Spin class','Indoor cycling trainer'],
  hiit:      ['Bodyweight circuit','Jump rope + core work','Medicine ball training'],
  swim:      ['Indoor pool (proceed normally)','Water aerobics'],
  gym:       ['Proceed as planned indoors','Focus on strength training'],
};

// ── Health Conditions ───────────────────────────────────────────────
export const HEALTH_CONDITIONS = [
  { id:'asthma',         label:'Asthma',         icon:'🫁', riskMult:1.8 },
  { id:'cardiovascular', label:'Heart Condition', icon:'❤️', riskMult:2.0 },
  { id:'pregnancy',      label:'Pregnant',        icon:'🤰', riskMult:1.6 },
  { id:'elderly',        label:'Age 65+',         icon:'👴', riskMult:1.5 },
  { id:'child',          label:'Under 12',        icon:'👶', riskMult:1.4 },
  { id:'diabetes',       label:'Diabetes',        icon:'💉', riskMult:1.3 },
];

// ── Helper Functions ────────────────────────────────────────────────
export function waqiAqiColor(aqi: number): string {
  if (aqi <= 50)  return '#00e57a';
  if (aqi <= 100) return '#ffe033';
  if (aqi <= 150) return '#ff8c00';
  if (aqi <= 200) return '#ff3a3a';
  if (aqi <= 300) return '#aa44cc';
  return '#7e0023';
}

export function waqiAqiLabel(aqi: number): string {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy (Sensitive)';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function realAqiToIndex(n: number): number {
  if (n <= 50)  return 1;
  if (n <= 100) return 2;
  if (n <= 150) return 3;
  if (n <= 200) return 4;
  return 5;
}

export function scoreHour(aqi: number, temp: number, humidity: number, windSpeed: number, hour: number): number {
  let s = 100;
  s -= aqi * 0.35;
  if (temp > 35) s -= 18;
  else if (temp > 30) s -= 8;
  if (temp < 5) s -= 10;
  if (humidity > 85) s -= 12;
  if (humidity < 25) s -= 6;
  if (windSpeed > 20) s -= 8;
  else if (windSpeed > 10) s += 4;
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) s -= 8;
  if ((hour >= 5 && hour <= 7) || (hour >= 19 && hour <= 21)) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export function scoreColor(s: number): string {
  if (s >= 75) return '#00ffc8';
  if (s >= 55) return '#a8ff44';
  if (s >= 35) return '#ffb830';
  return '#ff5c5c';
}

export function countryFlag(name: string): string {
  const flags: Record<string,string> = {
    india:'🇮🇳', china:'🇨🇳', 'united states':'🇺🇸', usa:'🇺🇸', 'united kingdom':'🇬🇧', uk:'🇬🇧',
    germany:'🇩🇪', france:'🇫🇷', japan:'🇯🇵', australia:'🇦🇺', canada:'🇨🇦', brazil:'🇧🇷',
    russia:'🇷🇺', indonesia:'🇮🇩', pakistan:'🇵🇰', bangladesh:'🇧🇩', nigeria:'🇳🇬', niger:'🇳🇪',
    mexico:'🇲🇽', 'south korea':'🇰🇷', italy:'🇮🇹', spain:'🇪🇸', turkey:'🇹🇷', thailand:'🇹🇭',
    vietnam:'🇻🇳', poland:'🇵🇱', ukraine:'🇺🇦', colombia:'🇨🇴', egypt:'🇪🇬', iran:'🇮🇷',
    malaysia:'🇲🇾', nepal:'🇳🇵', singapore:'🇸🇬', philippines:'🇵🇭', 'south africa':'🇿🇦',
    argentina:'🇦🇷', chile:'🇨🇱', peru:'🇵🇪', kenya:'🇰🇪', ethiopia:'🇪🇹', tanzania:'🇹🇿',
    ghana:'🇬🇭', sweden:'🇸🇪', norway:'🇳🇴', denmark:'🇩🇰', finland:'🇫🇮', netherlands:'🇳🇱',
    belgium:'🇧🇪', switzerland:'🇨🇭', austria:'🇦🇹', portugal:'🇵🇹', greece:'🇬🇷',
    czechia:'🇨🇿', hungary:'🇭🇺', mali:'🇲🇱', chad:'🇹🇩', algeria:'🇩🇿', libya:'🇱🇾',
    sudan:'🇸🇩', angola:'🇦🇴', mozambique:'🇲🇿', zimbabwe:'🇿🇼', zambia:'🇿🇲',
    cameroon:'🇨🇲', senegal:'🇸🇳', uganda:'🇺🇬', morocco:'🇲🇦', tunisia:'🇹🇳',
    iraq:'🇮🇶', 'saudi arabia':'🇸🇦', myanmar:'🇲🇲', 'sri lanka':'🇱🇰',
    cambodia:'🇰🇭', israel:'🇮🇱', jordan:'🇯🇴',
  };
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(flags)) if (key.includes(k)) return v;
  return '🌍';
}

export const MOCK_DATA = {
  main: { aqi: 2 },
  components: { co:226.1, no:0.46, no2:8.34, o3:63.47, so2:2.37, pm2_5:8.12, pm10:12.6, nh3:3.1 },
};