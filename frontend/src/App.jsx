import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend
} from "recharts";

// ── MOCK DATA (replace with real API calls when backend is running) ──────────
const MOCK_MARKET = Array.from({ length: 75 }, (_, i) => {
  const base = 22400 + Math.sin(i / 8) * 120 + Math.random() * 60 - 30;
  const open = base;
  const close = base + Math.random() * 40 - 20;
  const high = Math.max(open, close) + Math.random() * 20;
  const low = Math.min(open, close) - Math.random() * 20;
  const hour = 9 + Math.floor(i * 6 / 75);
  const min = (i * 6) % 60;
  return {
    timestamp: `${String(hour).padStart(2,"0")}:${String(min).padStart(2,"0")}`,
    open: +open.toFixed(2), close: +close.toFixed(2),
    high: +high.toFixed(2), low: +low.toFixed(2),
    volume: Math.floor(Math.random() * 5000000 + 1000000),
  };
});

const MOCK_NEWS = [
  { id:1, title:"RBI holds repo rate at 6.5%, signals cautious stance on inflation", source:"Economic Times", sentiment:"neutral", published_at:"2024-01-15T09:30:00Z", keywords:"RBI, rate, inflation" },
  { id:2, title:"Nifty surges 250 points as FII buying returns to D-Street", source:"Moneycontrol", sentiment:"positive", published_at:"2024-01-15T10:15:00Z", keywords:"FII" },
  { id:3, title:"IT stocks drag Sensex lower amid weak US tech earnings", source:"LiveMint", sentiment:"negative", published_at:"2024-01-15T11:00:00Z", keywords:"earnings" },
  { id:4, title:"Rupee strengthens against dollar on strong capital inflows", source:"Business Standard", sentiment:"positive", published_at:"2024-01-15T11:45:00Z", keywords:"rupee, dollar" },
  { id:5, title:"Global recession fears mount as oil prices spike to $95/barrel", source:"Reuters", sentiment:"negative", published_at:"2024-01-15T12:30:00Z", keywords:"recession, oil" },
  { id:6, title:"Mid-cap and small-cap indices outperform benchmark Nifty 50", source:"NDTV Profit", sentiment:"positive", published_at:"2024-01-15T13:10:00Z", keywords:"" },
];

const MOCK_PATTERNS = [
  { pattern_name:"Golden Cross", strength:"Strong", description:"Short-term MA crossed above long-term MA — bullish signal", detected_at:"10:30" },
  { pattern_name:"Overbought (RSI)", strength:"Moderate", description:"RSI at 72.4 — market may correct soon", detected_at:"11:45" },
  { pattern_name:"Uptrend", strength:"Strong", description:"Market trending up 1.8% today", detected_at:"13:00" },
];

const MOCK_EVENTS = [
  { event_type:"dip", event_time:"10:05", price_before:22450, price_after:22380, change_pct:-0.31, linked_news:["IT stocks drag Sensex lower"] },
  { event_type:"spike", event_time:"11:20", price_before:22390, price_after:22510, change_pct:0.54, linked_news:["Nifty surges 250 points as FII buying returns"] },
  { event_type:"dip", event_time:"12:35", price_before:22480, price_after:22390, change_pct:-0.40, linked_news:["Global recession fears mount as oil prices spike"] },
];

const MOCK_SUMMARY = {
  open_price: 22380, close_price: 22614, day_high: 22680, day_low: 22310,
  total_change_pct: 1.05, volatility: 0.18, trend: "Bullish",
  safety_score: 72, safety_label: "Safe",
  prediction: "Today's market showed strong upward momentum. Golden Cross pattern indicates potential uptrend continuation. Monitor FII activity for tomorrow's direction.",
  top_news: JSON.stringify(["RBI holds repo rate","Nifty surges 250 points","IT stocks drag Sensex"]),
  patterns_found: JSON.stringify(["Golden Cross","Uptrend","Overbought (RSI)"]),
  date: new Date().toISOString().split("T")[0]
};

// ── STYLES ──────────────────────────────────────────────────────────────────
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const DARK = {
  bg: "#0a0c10", surface: "#0f1117", card: "#141720",
  border: "#1e2330", accent: "#00d4aa", accent2: "#ff6b35",
  accent3: "#6c63ff", text: "#e8eaf0", muted: "#5a6070",
  up: "#00d4aa", down: "#ff4757", warn: "#ffa502",
  glow: "rgba(0,212,170,0.15)"
};
const LIGHT = {
  bg: "#f0f2f8", surface: "#ffffff", card: "#f8faff",
  border: "#dde2ef", accent: "#0066cc", accent2: "#ff6b35",
  accent3: "#6c63ff", text: "#1a1d2e", muted: "#7a8090",
  up: "#00a878", down: "#e63946", warn: "#ff9500",
  glow: "rgba(0,102,204,0.08)"
};

// ── COMPONENTS ──────────────────────────────────────────────────────────────
const SafetyGauge = ({ score, label, theme }) => {
  const T = theme;
  const color = score >= 65 ? T.up : score >= 40 ? T.warn : T.down;
  const rotation = (score / 100) * 180 - 90;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <svg width="160" height="90" viewBox="0 0 160 90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={T.down} />
            <stop offset="50%" stopColor={T.warn} />
            <stop offset="100%" stopColor={T.up} />
          </linearGradient>
        </defs>
        <path d="M 15 85 A 65 65 0 0 1 145 85" fill="none" stroke={T.border} strokeWidth="12" strokeLinecap="round"/>
        <path d="M 15 85 A 65 65 0 0 1 145 85" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score/100)*204} 204`}/>
        <g transform={`rotate(${rotation}, 80, 85)`}>
          <line x1="80" y1="85" x2="80" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="80" cy="85" r="5" fill={color}/>
        </g>
        <text x="80" y="72" textAnchor="middle" fill={T.text} fontFamily="Syne" fontSize="20" fontWeight="800">{score}</text>
      </svg>
      <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:14, color, letterSpacing:2, textTransform:"uppercase" }}>{label}</span>
    </div>
  );
};

const StatPill = ({ label, value, color, theme }) => (
  <div style={{ background: theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:"12px 18px", display:"flex", flexDirection:"column", gap:4 }}>
    <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:theme.muted, textTransform:"uppercase", letterSpacing:1.5 }}>{label}</span>
    <span style={{ fontFamily:"Syne", fontSize:20, fontWeight:700, color: color || theme.text }}>{value}</span>
  </div>
);

const SentimentDot = ({ s }) => {
  const colors = { positive:"#00d4aa", negative:"#ff4757", neutral:"#ffa502" };
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: colors[s] || "#888", marginRight:6 }}/>;
};

const PatternBadge = ({ strength, theme }) => {
  const colors = { Strong:"#6c63ff", Moderate:"#ffa502", High:"#ff4757" };
  return (
    <span style={{ fontFamily:"JetBrains Mono", fontSize:10, padding:"2px 8px", borderRadius:4,
      background: (colors[strength] || "#888") + "22", color: colors[strength] || "#888",
      border:`1px solid ${colors[strength] || "#888"}44`, letterSpacing:1 }}>
      {strength}
    </span>
  );
};

// ── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  const T = theme;
  const d = payload[0]?.payload;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontFamily:"JetBrains Mono", fontSize:12 }}>
      <div style={{ color:T.muted, marginBottom:4 }}>{label}</div>
      <div style={{ color:T.up }}>Close: ₹{d?.close?.toLocaleString("en-IN")}</div>
      <div style={{ color:T.muted }}>H: ₹{d?.high?.toLocaleString("en-IN")} | L: ₹{d?.low?.toLocaleString("en-IN")}</div>
    </div>
  );
};

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function NiftyAnalyzer() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [marketData] = useState(MOCK_MARKET);
  const [news] = useState(MOCK_NEWS);
  const [patterns] = useState(MOCK_PATTERNS);
  const [events] = useState(MOCK_EVENTS);
  const [summary] = useState(MOCK_SUMMARY);
  const [liveTime, setLiveTime] = useState(new Date());
  const [pulseOn, setPulseOn] = useState(true);

  const T = darkMode ? DARK : LIGHT;

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    const p = setInterval(() => setPulseOn(x => !x), 800);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const currentPrice = marketData[marketData.length - 1]?.close || 0;
  const change = summary.total_change_pct;
  const isUp = change >= 0;

  const tabs = [
    { id:"overview", label:"Overview" },
    { id:"chart", label:"Chart" },
    { id:"news", label:"News & Events" },
    { id:"patterns", label:"Patterns" },
    { id:"prediction", label:"Prediction" },
  ];

  return (
    <>
      <style>{`
        ${FONTS}
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:${T.bg}; font-family:'Syne',sans-serif; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:${T.bg}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .tab-btn { cursor:pointer; border:none; background:none; font-family:'Syne',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.5px; padding:8px 18px; border-radius:8px; transition:all 0.2s; }
        .tab-btn:hover { background:${T.border}; }
        .card { background:${T.card}; border:1px solid ${T.border}; border-radius:16px; padding:20px; }
        .toggle-btn { cursor:pointer; border:1px solid ${T.border}; background:${T.surface}; border-radius:100px; padding:6px 14px; font-family:'JetBrains Mono'; font-size:12px; color:${T.muted}; transition:all 0.2s; }
        .toggle-btn:hover { border-color:${T.accent}; color:${T.accent}; }
      `}</style>

      <div style={{ minHeight:"100vh", background:T.bg, color:T.text, transition:"all 0.3s" }}>

        {/* ── HEADER ── */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(12px)" }}>
          <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>

            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg, ${T.accent}, ${T.accent3})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"#fff", fontSize:16 }}>📊</span>
                </div>
                <div>
                  <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, letterSpacing:1 }}>NIFTY ANALYZER</div>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>by Shivam Sharma</div>
                </div>
              </div>

              {/* Live indicator */}
              <div style={{ display:"flex", alignItems:"center", gap:6, background:T.card, border:`1px solid ${T.border}`, borderRadius:100, padding:"4px 12px" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:T.up, animation:`pulse 1.6s infinite`, opacity: pulseOn ? 1 : 0.3, transition:"opacity 0.3s" }}/>
                <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.up }}>LIVE</span>
                <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>{liveTime.toLocaleTimeString("en-IN")}</span>
              </div>
            </div>

            {/* Current price chip */}
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"JetBrains Mono", fontSize:22, fontWeight:500, color:isUp ? T.up : T.down }}>
                  ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits:2 })}
                </div>
                <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color: isUp ? T.up : T.down }}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}% today
                </div>
              </div>
              <button className="toggle-btn" onClick={() => setDarkMode(d => !d)}>
                {darkMode ? "☀ Light" : "🌙 Dark"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", gap:4, paddingBottom:8 }}>
            {tabs.map(tab => (
              <button key={tab.id} className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{ color: activeTab === tab.id ? T.accent : T.muted,
                  background: activeTab === tab.id ? T.accent + "18" : "none",
                  borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent",
                  borderRadius:0, paddingBottom:10 }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 24px" }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="fade-up" style={{ display:"grid", gap:20 }}>

              {/* Top stat row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12 }}>
                <StatPill label="Open" value={`₹${summary.open_price.toLocaleString("en-IN")}`} theme={T}/>
                <StatPill label="Close" value={`₹${summary.close_price.toLocaleString("en-IN")}`} color={isUp ? T.up : T.down} theme={T}/>
                <StatPill label="Day High" value={`₹${summary.day_high.toLocaleString("en-IN")}`} color={T.up} theme={T}/>
                <StatPill label="Day Low" value={`₹${summary.day_low.toLocaleString("en-IN")}`} color={T.down} theme={T}/>
                <StatPill label="Change" value={`${isUp?"▲":"▼"} ${Math.abs(change).toFixed(2)}%`} color={isUp ? T.up : T.down} theme={T}/>
                <StatPill label="Volatility" value={summary.volatility.toFixed(3)} color={T.warn} theme={T}/>
                <StatPill label="Trend" value={summary.trend} color={summary.trend === "Bullish" ? T.up : T.down} theme={T}/>
              </div>

              {/* Middle row: chart + gauge */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20 }}>

                {/* Mini chart */}
                <div className="card">
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Today's Price Movement</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={marketData} margin={{ top:5, right:10, bottom:0, left:0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isUp ? T.up : T.down} stopOpacity={0.3}/>
                          <stop offset="100%" stopColor={isUp ? T.up : T.down} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="timestamp" tick={{ fontFamily:"JetBrains Mono", fontSize:10, fill:T.muted }} tickLine={false} axisLine={false} interval={12}/>
                      <YAxis domain={['auto', 'auto']} tick={{ fontFamily:"JetBrains Mono", fontSize:10, fill:T.muted }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(1)}k`}/>
                      <Tooltip content={<CustomTooltip theme={T}/>}/>
                      {events.map((e, i) => (
                        <ReferenceLine key={i} x={e.event_time} stroke={e.event_type === "dip" ? T.down : T.up} strokeDasharray="4 4" strokeOpacity={0.7}/>
                      ))}
                      <Area type="monotone" dataKey="close" stroke={isUp ? T.up : T.down} strokeWidth={2} fill="url(#areaGrad)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Safety gauge */}
                <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, letterSpacing:1, textTransform:"uppercase" }}>Market Safety</div>
                  <SafetyGauge score={summary.safety_score} label={summary.safety_label} theme={T}/>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, textAlign:"center", lineHeight:1.6 }}>
                    Score based on volatility, patterns, RSI, and news sentiment
                  </div>
                </div>
              </div>

              {/* Bottom: patterns + top news */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                <div className="card">
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Detected Patterns</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {patterns.map((p, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px", background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
                        <div style={{ fontSize:20, marginTop:2 }}>
                          {p.pattern_name.includes("Cross") ? "⚡" : p.pattern_name.includes("RSI") ? "📉" : "📈"}
                        </div>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:13 }}>{p.pattern_name}</span>
                            <PatternBadge strength={p.strength} theme={T}/>
                          </div>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, lineHeight:1.5 }}>{p.description}</div>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.accent, marginTop:4 }}>@ {p.detected_at}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Top News Today</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {news.slice(0,5).map((n, i) => (
                      <div key={i} style={{ padding:"10px 12px", background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, borderLeft:`3px solid ${n.sentiment==="positive" ? T.up : n.sentiment==="negative" ? T.down : T.warn}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <SentimentDot s={n.sentiment}/>
                          <span style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>{n.source}</span>
                        </div>
                        <div style={{ fontFamily:"Syne", fontSize:12, fontWeight:600, lineHeight:1.5, color:T.text }}>{n.title}</div>
                        {n.keywords && <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.accent3, marginTop:4 }}>🏷 {n.keywords}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CHART TAB ── */}
          {activeTab === "chart" && (
            <div className="fade-up" style={{ display:"grid", gap:20 }}>
              <div className="card">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div>
                    <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:18 }}>Nifty 50 — Intraday (5-min)</div>
                    <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>09:15 – 15:30 IST • Vertical lines = market events</div>
                  </div>
                  <div style={{ display:"flex", gap:16, fontFamily:"JetBrains Mono", fontSize:11 }}>
                    <span style={{ color:T.up }}>━ Price</span>
                    <span style={{ color:T.up, opacity:0.5 }}>┅ Spike</span>
                    <span style={{ color:T.down, opacity:0.5 }}>┅ Dip</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={marketData} margin={{ top:10, right:20, bottom:0, left:10 }}>
                    <defs>
                      <linearGradient id="bigGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isUp ? T.up : T.down} stopOpacity={0.25}/>
                        <stop offset="100%" stopColor={isUp ? T.up : T.down} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="timestamp" tick={{ fontFamily:"JetBrains Mono", fontSize:10, fill:T.muted }} tickLine={false} axisLine={{ stroke:T.border }} interval={10}/>
                    <YAxis domain={['auto','auto']} tick={{ fontFamily:"JetBrains Mono", fontSize:10, fill:T.muted }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v.toLocaleString("en-IN")}`} width={80}/>
                    <Tooltip content={<CustomTooltip theme={T}/>}/>
                    {events.map((e, i) => (
                      <ReferenceLine key={i} x={e.event_time}
                        stroke={e.event_type==="dip" ? T.down : T.up}
                        strokeDasharray="4 4" strokeWidth={1.5}
                        label={{ value: e.event_type==="dip" ? "▼" : "▲", position:"top",
                          fill: e.event_type==="dip" ? T.down : T.up, fontFamily:"JetBrains Mono", fontSize:12 }}/>
                    ))}
                    <Area type="monotone" dataKey="close" stroke={isUp ? T.up : T.down} strokeWidth={2.5} fill="url(#bigGrad)" dot={false} activeDot={{ r:5, fill: isUp ? T.up : T.down }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Volume bar */}
              <div className="card">
                <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Volume</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={marketData} margin={{ top:0, right:20, bottom:0, left:10 }}>
                    <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontFamily:"JetBrains Mono", fontSize:9, fill:T.muted }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1e6).toFixed(1)}M`} width={50}/>
                    <Tooltip formatter={(v) => [`${(v/1e6).toFixed(2)}M`, "Volume"]} contentStyle={{ background:T.card, border:`1px solid ${T.border}`, fontFamily:"JetBrains Mono", fontSize:11 }}/>
                    <Bar dataKey="volume" fill={T.accent3} fillOpacity={0.7} radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── NEWS & EVENTS TAB ── */}
          {activeTab === "news" && (
            <div className="fade-up" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

              <div>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, marginBottom:16 }}>📰 News Feed</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {news.map((n, i) => (
                    <div key={i} className="card" style={{ borderLeft:`4px solid ${n.sentiment==="positive" ? T.up : n.sentiment==="negative" ? T.down : T.warn}`, padding:"16px 20px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <SentimentDot s={n.sentiment}/>
                          <span style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>{n.source}</span>
                        </div>
                        <span style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>
                          {new Date(n.published_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                        </span>
                      </div>
                      <div style={{ fontFamily:"Syne", fontWeight:600, fontSize:13, lineHeight:1.6, marginBottom:8 }}>{n.title}</div>
                      {n.keywords && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {n.keywords.split(",").map((k, j) => (
                            <span key={j} style={{ fontFamily:"JetBrains Mono", fontSize:10, padding:"2px 8px", borderRadius:4, background:T.accent3+"22", color:T.accent3, border:`1px solid ${T.accent3}44` }}>
                              {k.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, marginBottom:16 }}>⚡ Market Events</div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {events.map((e, i) => (
                    <div key={i} className="card" style={{ borderLeft:`4px solid ${e.event_type==="dip" ? T.down : T.up}`, padding:"16px 20px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:20 }}>{e.event_type==="dip" ? "📉" : "📈"}</span>
                          <div>
                            <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:14, color: e.event_type==="dip" ? T.down : T.up, textTransform:"uppercase" }}>
                              Market {e.event_type}
                            </div>
                            <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>@ {e.event_time}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:18, fontWeight:500, color: e.change_pct > 0 ? T.up : T.down }}>
                            {e.change_pct > 0 ? "+" : ""}{e.change_pct}%
                          </div>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>
                            ₹{e.price_before.toLocaleString()} → ₹{e.price_after.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {e.linked_news?.length > 0 && (
                        <div style={{ background:T.surface, borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginBottom:6 }}>POSSIBLE TRIGGER:</div>
                          {e.linked_news.map((n, j) => (
                            <div key={j} style={{ fontFamily:"Syne", fontSize:12, color:T.text, lineHeight:1.5 }}>• {n}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Sentiment summary */}
                <div className="card" style={{ marginTop:16 }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:14, letterSpacing:1, textTransform:"uppercase" }}>News Sentiment Breakdown</div>
                  {["positive","neutral","negative"].map(s => {
                    const count = news.filter(n => n.sentiment === s).length;
                    const pct = Math.round((count / news.length) * 100);
                    const colors = { positive:T.up, neutral:T.warn, negative:T.down };
                    return (
                      <div key={s} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, textTransform:"capitalize" }}>{s}</span>
                          <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:colors[s] }}>{count} articles</span>
                        </div>
                        <div style={{ background:T.border, borderRadius:4, height:6 }}>
                          <div style={{ width:`${pct}%`, height:6, borderRadius:4, background:colors[s], transition:"width 0.6s ease" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PATTERNS TAB ── */}
          {activeTab === "patterns" && (
            <div className="fade-up" style={{ display:"grid", gap:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:16 }}>
                {patterns.map((p, i) => (
                  <div key={i} className="card" style={{ position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"0 16px 0 80px",
                      background: p.strength==="Strong" ? T.accent3+"22" : T.warn+"22" }}/>
                    <div style={{ fontSize:32, marginBottom:12 }}>
                      {p.pattern_name.includes("Cross") ? "⚡" : p.pattern_name.includes("RSI") ? "🎯" : p.pattern_name.includes("Trend") ? "📐" : "📊"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16 }}>{p.pattern_name}</div>
                      <PatternBadge strength={p.strength} theme={T}/>
                    </div>
                    <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color:T.muted, lineHeight:1.8, marginBottom:12 }}>{p.description}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.accent }}>Detected at {p.detected_at}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pattern legend */}
              <div className="card">
                <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>Pattern Reference Guide</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:12 }}>
                  {[
                    { name:"Golden Cross", icon:"⚡", desc:"When short MA crosses above long MA. Bullish signal — often precedes a rally.", bias:"Bullish" },
                    { name:"Death Cross", icon:"💀", desc:"When short MA crosses below long MA. Bearish signal — often signals further decline.", bias:"Bearish" },
                    { name:"Oversold RSI (<30)", icon:"🔵", desc:"Market has fallen too fast. Potential reversal or bounce expected.", bias:"Reversal" },
                    { name:"Overbought RSI (>70)", icon:"🔴", desc:"Market has risen too fast. Risk of correction or pullback.", bias:"Caution" },
                    { name:"Volatility Spike", icon:"⚠️", desc:"Unusual price swings. Can indicate news-driven panic or euphoria.", bias:"Neutral" },
                    { name:"Uptrend / Downtrend", icon:"📐", desc:"Consistent directional move throughout the session.", bias:"Directional" },
                  ].map((item, i) => (
                    <div key={i} style={{ display:"flex", gap:12, padding:"12px", background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:22 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, marginBottom:4 }}>{item.name}</div>
                        <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, lineHeight:1.5 }}>{item.desc}</div>
                        <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.accent, marginTop:4 }}>Bias: {item.bias}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PREDICTION TAB ── */}
          {activeTab === "prediction" && (
            <div className="fade-up" style={{ display:"grid", gap:20 }}>

              {/* Safety + prediction card */}
              <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
                <div className="card" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, textAlign:"center" }}>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, letterSpacing:1, textTransform:"uppercase" }}>Is it Safe to Invest?</div>
                  <SafetyGauge score={summary.safety_score} label={summary.safety_label} theme={T}/>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, lineHeight:1.8 }}>
                    Based on today's price action, news sentiment, volatility, and detected patterns.
                  </div>
                  <div style={{ width:"100%", background:T.surface, borderRadius:10, padding:"12px 16px", border:`1px solid ${T.border}` }}>
                    <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted, marginBottom:6 }}>CONTRIBUTING FACTORS</div>
                    {[
                      { label:"Trend", value:summary.trend, color: summary.trend==="Bullish" ? T.up : T.down },
                      { label:"Volatility", value:summary.volatility < 0.3 ? "Low ✓" : "High ⚠", color: summary.volatility < 0.3 ? T.up : T.warn },
                      { label:"Patterns", value:`${patterns.length} found`, color:T.accent3 },
                      { label:"Neg. News", value:`${news.filter(n=>n.sentiment==="negative").length} articles`, color:T.down },
                    ].map((f, i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom: i<3 ? `1px solid ${T.border}` : "none" }}>
                        <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>{f.label}</span>
                        <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:f.color }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:16, letterSpacing:1, textTransform:"uppercase" }}>🤖 AI Prediction</div>
                  <div style={{ fontFamily:"Syne", fontSize:16, lineHeight:2.0, color:T.text, marginBottom:20, background:T.surface, borderRadius:12, padding:"20px 24px", border:`1px solid ${T.border}`, borderLeft:`4px solid ${T.accent}` }}>
                    {summary.prediction}
                  </div>

                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:13, color:T.muted, marginBottom:12, letterSpacing:1, textTransform:"uppercase" }}>What Could Move Market Tomorrow?</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      { icon:"🏦", label:"RBI Policy", risk:"Watch", color:T.warn },
                      { icon:"💵", label:"FII/DII Flows", risk:"Positive", color:T.up },
                      { icon:"🛢", label:"Oil Prices", risk:"Risk", color:T.down },
                      { icon:"📊", label:"Corporate Earnings", risk:"Positive", color:T.up },
                      { icon:"🇺🇸", label:"US Market Close", risk:"Watch", color:T.warn },
                      { icon:"💱", label:"INR/USD", risk:"Stable", color:T.up },
                    ].map((item, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
                        <span style={{ fontSize:18 }}>{item.icon}</span>
                        <div>
                          <div style={{ fontFamily:"Syne", fontWeight:600, fontSize:12 }}>{item.label}</div>
                          <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:item.color }}>{item.risk}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px 24px", textAlign:"center", marginTop:24 }}>
          <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>
            NIFTY ANALYZER • Data refreshes every 5 min during market hours (09:15 – 15:30 IST) • {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </span>
        </div>
      </div>
    </>
  );
}
