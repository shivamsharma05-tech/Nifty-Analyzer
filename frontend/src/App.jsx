import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend
} from "recharts";

// ── API BASE URL ─────────────────────────────────────────────────────────────
const API = "https://nifty-analyzer.onrender.com/api";

// ── AUTH HELPERS ─────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("nifty_token");
const getUser = () => { try { return JSON.parse(localStorage.getItem("nifty_user")); } catch { return null; } };
const setAuth = (token, user) => { localStorage.setItem("nifty_token", token); localStorage.setItem("nifty_user", JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem("nifty_token"); localStorage.removeItem("nifty_user"); };
const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...(opts.headers || {}) } });

// ── AUTH SCREENS ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, T, darkMode, setDarkMode }) {
  const [mode, setMode] = useState("login"); // login | signup | welcome
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState(null);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await fetch(`${API}${endpoint}`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
      setAuth(data.token, data.user);
      if (mode === "signup") { setNewUser(data.user); setMode("welcome"); }
      else { onLogin(data.user); }
    } catch (e) { setError("Connection error. Try again."); }
    setLoading(false);
  };

  if (mode === "welcome") return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:"40px", maxWidth:480, width:"90%", textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:24, color:T.text, marginBottom:8 }}>Welcome, {newUser?.name}!</div>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:13, color:T.muted, marginBottom:32 }}>Your account is ready. What would you like to explore?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div onClick={() => onLogin({...newUser, preference:"stocks"})} style={{ background:T.accent+"18", border:`2px solid ${T.accent}`, borderRadius:14, padding:"24px 16px", cursor:"pointer" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📈</div>
            <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:14, color:T.accent }}>Stocks & Index</div>
            <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginTop:4 }}>Nifty charts, patterns, news</div>
          </div>
          <div onClick={() => onLogin({...newUser, preference:"options"})} style={{ background:T.accent3+"18", border:`2px solid ${T.accent3}`, borderRadius:14, padding:"24px 16px", cursor:"pointer" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
            <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:14, color:T.accent3 }}>Option Chain</div>
            <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginTop:4 }}>CE/PE data, PCR, Max Pain</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'); * { box-sizing:border-box; margin:0; padding:0; }`}</style>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:"40px", maxWidth:420, width:"90%" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${T.accent}, ${T.accent3})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:18 }}>📊</span>
          </div>
          <div>
            <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, color:T.text }}>NIFTY ANALYZER</div>
            <div style={{ fontFamily:"JetBrains Mono", fontSize:10, color:T.muted }}>by Shivam Sharma</div>
          </div>
          <button onClick={() => setDarkMode(d=>!d)} style={{ marginLeft:"auto", background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"4px 10px", color:T.muted, fontFamily:"JetBrains Mono", fontSize:11, cursor:"pointer" }}>
            {darkMode ? "☀" : "🌙"}
          </button>
        </div>

        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:22, color:T.text, marginBottom:4 }}>
          {mode === "login" ? "Welcome back!" : "Create account"}
        </div>
        <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color:T.muted, marginBottom:28 }}>
          {mode === "login" ? "Sign in to access your dashboard" : "Join to start analyzing markets"}
        </div>

        {error && <div style={{ background:T.down+"22", border:`1px solid ${T.down}44`, borderRadius:8, padding:"10px 14px", fontFamily:"JetBrains Mono", fontSize:12, color:T.down, marginBottom:16 }}>{error}</div>}

        {mode === "signup" && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, letterSpacing:1 }}>YOUR NAME</div>
            <input value={form.name} onChange={e => setForm({...form, name:e.target.value})}
              placeholder="Shivam Sharma"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", fontFamily:"JetBrains Mono", fontSize:13, color:T.text, outline:"none" }}/>
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, letterSpacing:1 }}>EMAIL</div>
          <input value={form.email} onChange={e => setForm({...form, email:e.target.value})}
            placeholder="you@email.com" type="email"
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", fontFamily:"JetBrains Mono", fontSize:13, color:T.text, outline:"none" }}/>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, letterSpacing:1 }}>PASSWORD</div>
          <input value={form.password} onChange={e => setForm({...form, password:e.target.value})}
            placeholder="••••••••" type="password"
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 16px", fontFamily:"JetBrains Mono", fontSize:13, color:T.text, outline:"none" }}/>
        </div>

        <button onClick={handle} disabled={loading}
          style={{ width:"100%", background:`linear-gradient(135deg, ${T.accent}, ${T.accent3})`, border:"none", borderRadius:10, padding:"14px", fontFamily:"Syne", fontWeight:700, fontSize:15, color:"#fff", cursor:"pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div style={{ textAlign:"center", marginTop:20, fontFamily:"JetBrains Mono", fontSize:12, color:T.muted }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ color:T.accent, cursor:"pointer", fontWeight:600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

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
  const [user, setUser] = useState(getUser());
  const T = darkMode ? DARK : LIGHT;

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = () => { clearAuth(); setUser(null); };

  if (!user || !getToken()) return <AuthScreen onLogin={handleLogin} T={T} darkMode={darkMode} setDarkMode={setDarkMode}/>;

  return <Dashboard user={user} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} T={T}/>;
}

function Dashboard({ user, onLogout, darkMode, setDarkMode, T }) {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [marketData, setMarketData] = useState([]);
  const [news, setNews] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({ open_price:0, close_price:0, day_high:0, day_low:0, total_change_pct:0, volatility:0, trend:"Loading...", safety_score:0, safety_label:"Loading", prediction:"Fetching data...", top_news:"[]", patterns_found:"[]", date:"" });
  const [liveTime, setLiveTime] = useState(new Date());
  const [pulseOn, setPulseOn] = useState(true);
  const [optionChain, setOptionChain] = useState({ data:[], pcr:0, max_pain:0, atm:0, expiry:"", fetched_at:"" });
  const [ocLoading, setOcLoading] = useState(false);

  const T = darkMode ? DARK : LIGHT;

  // Fetch real data from backend
  const fetchAllData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [marketRes, newsRes, patternsRes, eventsRes, summaryRes, ocRes] = await Promise.all([
        authFetch(`${API}/market?date=${today}`),
        authFetch(`${API}/news`),
        authFetch(`${API}/patterns?date=${today}`),
        authFetch(`${API}/events?date=${today}`),
        authFetch(`${API}/summary/today`),
        authFetch(`${API}/optionchain`),
      ]);
      const [marketJson, newsJson, patternsJson, eventsJson, summaryJson, ocJson] = await Promise.all([
        marketRes.json(), newsRes.json(), patternsRes.json(), eventsRes.json(), summaryRes.json(), ocRes.json()
      ]);

      // Format market data timestamps
      const formattedMarket = marketJson.map(d => ({
        ...d,
        timestamp: d.timestamp ? d.timestamp.slice(11, 16) : "",
      }));

      // Parse linked_news strings in events
      const formattedEvents = eventsJson.map(e => ({
        ...e,
        linked_news: typeof e.linked_news === "string" ? JSON.parse(e.linked_news || "[]") : e.linked_news || []
      }));

      setMarketData(formattedMarket);
      setNews(newsJson);
      setPatterns(patternsJson);
      setEvents(formattedEvents);
      if (summaryJson && !summaryJson.message) setSummary(summaryJson);
      if (ocJson && ocJson.data) setOptionChain(ocJson);
      setLoading(false);
    } catch (err) {
      console.error("API fetch error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchAllData]);

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
    { id:"optionchain", label:"Option Chain" },
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
              <div style={{ display:"flex", alignItems:"center", gap:8, background:T.card, border:`1px solid ${T.border}`, borderRadius:100, padding:"4px 14px" }}>
                <span style={{ fontFamily:"Syne", fontWeight:700, fontSize:12, color:T.text }}>👤 {user?.name}</span>
                <span onClick={onLogout} style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.down, cursor:"pointer", marginLeft:6 }}>Logout</span>
              </div>
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

          {/* ── OPTION CHAIN TAB ── */}
          {activeTab === "optionchain" && (
            <div className="fade-up" style={{ display:"grid", gap:20 }}>

              {/* Top info bar */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12 }}>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Expiry</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:T.accent }}>{optionChain.expiry || "—"}</div>
                </div>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>ATM Strike</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:T.warn }}>₹{optionChain.atm?.toLocaleString("en-IN") || "—"}</div>
                </div>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>PCR Ratio</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color: optionChain.pcr > 1 ? T.up : T.down }}>
                    {optionChain.pcr || "—"}
                    <span style={{ fontFamily:"JetBrains Mono", fontSize:11, marginLeft:6, color:T.muted }}>
                      {optionChain.pcr > 1.2 ? "Bullish" : optionChain.pcr < 0.8 ? "Bearish" : "Neutral"}
                    </span>
                  </div>
                </div>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Max Pain</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:T.accent2 }}>₹{optionChain.max_pain?.toLocaleString("en-IN") || "—"}</div>
                </div>
                <div className="card" style={{ textAlign:"center" }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Last Updated</div>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color:T.text }}>
                    {optionChain.fetched_at ? new Date(optionChain.fetched_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) : "—"}
                  </div>
                </div>
                <div className="card" style={{ textAlign:"center", cursor:"pointer", border:`1px solid ${T.accent}44` }}
                  onClick={async () => {
                    setOcLoading(true);
                    await fetch(`${API}/optionchain/refresh`, { method:"POST" });
                    await fetchAllData();
                    setOcLoading(false);
                  }}>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Refresh</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:15, color:T.accent }}>{ocLoading ? "..." : "🔄 Now"}</div>
                </div>
              </div>

              {/* PCR Explanation */}
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 20px", fontFamily:"JetBrains Mono", fontSize:11, color:T.muted, lineHeight:1.8 }}>
                📌 <span style={{ color:T.text }}>PCR &gt; 1.2</span> = More PUT writing = Bullish &nbsp;|&nbsp;
                <span style={{ color:T.text }}>PCR &lt; 0.8</span> = More CALL writing = Bearish &nbsp;|&nbsp;
                <span style={{ color:T.text }}>Max Pain</span> = Strike where most option sellers profit at expiry
              </div>

              {/* Option Chain Table */}
              {optionChain.data.length === 0 ? (
                <div className="card" style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
                  <div style={{ fontFamily:"Syne", fontWeight:700, fontSize:16, marginBottom:8 }}>No Option Chain Data Yet</div>
                  <div style={{ fontFamily:"JetBrains Mono", fontSize:12, color:T.muted, marginBottom:20 }}>
                    Option chain is fetched from NSE during market hours (9:15 AM – 3:30 PM)
                  </div>
                  <button onClick={async () => {
                    setOcLoading(true);
                    await fetch(`${API}/optionchain/refresh`, { method:"POST" });
                    await fetchAllData();
                    setOcLoading(false);
                  }} style={{ background:T.accent, color:"#000", border:"none", borderRadius:8, padding:"10px 24px", fontFamily:"Syne", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    {ocLoading ? "Fetching..." : "🔄 Fetch Now"}
                  </button>
                </div>
              ) : (
                <div className="card" style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"JetBrains Mono", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:T.surface }}>
                          {/* CE Headers */}
                          {["OI","Chng OI","Volume","IV","LTP"].map(h => (
                            <th key={h} style={{ padding:"12px 10px", color:T.up, fontWeight:600, textAlign:"right", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap", fontSize:11 }}>{h}</th>
                          ))}
                          {/* Strike */}
                          <th style={{ padding:"12px 16px", color:T.warn, fontWeight:700, textAlign:"center", borderBottom:`1px solid ${T.border}`, background:T.card, fontSize:12, letterSpacing:1 }}>STRIKE</th>
                          {/* PE Headers */}
                          {["LTP","IV","Volume","Chng OI","OI"].map(h => (
                            <th key={h} style={{ padding:"12px 10px", color:T.down, fontWeight:600, textAlign:"left", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap", fontSize:11 }}>{h}</th>
                          ))}
                        </tr>
                        <tr style={{ background:T.surface }}>
                          <td colSpan={5} style={{ padding:"6px 10px", textAlign:"center", color:T.up, fontFamily:"Syne", fontWeight:700, fontSize:11, letterSpacing:2, borderBottom:`2px solid ${T.up}44` }}>── CALL OPTIONS (CE) ──</td>
                          <td style={{ background:T.card, borderBottom:`2px solid ${T.warn}44` }}/>
                          <td colSpan={5} style={{ padding:"6px 10px", textAlign:"center", color:T.down, fontFamily:"Syne", fontWeight:700, fontSize:11, letterSpacing:2, borderBottom:`2px solid ${T.down}44` }}>── PUT OPTIONS (PE) ──</td>
                        </tr>
                      </thead>
                      <tbody>
                        {optionChain.data.map((row, i) => {
                          const isAtm = row.atm === 1;
                          const isMaxPain = row.strike === optionChain.max_pain;
                          const rowBg = isAtm ? T.warn + "18" : isMaxPain ? T.accent2 + "12" : i % 2 === 0 ? T.card : T.surface;
                          const fmt = (v) => v ? Number(v).toLocaleString("en-IN") : "—";
                          const fmtOi = (v) => v >= 1e7 ? (v/1e7).toFixed(2)+"Cr" : v >= 1e5 ? (v/1e5).toFixed(1)+"L" : fmt(v);
                          return (
                            <tr key={i} style={{ background:rowBg, transition:"background 0.2s" }}>
                              <td style={{ padding:"9px 10px", textAlign:"right", color:T.up, opacity:0.9 }}>{fmtOi(row.ce_oi)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"right", color: row.ce_chng_oi > 0 ? T.up : T.down }}>{fmtOi(row.ce_chng_oi)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"right", color:T.muted }}>{fmtOi(row.ce_volume)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"right", color:T.muted }}>{row.ce_iv ? row.ce_iv.toFixed(1)+"%" : "—"}</td>
                              <td style={{ padding:"9px 10px", textAlign:"right", color:T.up, fontWeight:600 }}>{fmt(row.ce_ltp)}</td>
                              {/* Strike cell */}
                              <td style={{ padding:"9px 16px", textAlign:"center", fontWeight:700, color: isAtm ? T.warn : T.text, background: isAtm ? T.warn+"22" : isMaxPain ? T.accent2+"22" : T.surface, borderLeft:`1px solid ${T.border}`, borderRight:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>
                                {row.strike.toLocaleString("en-IN")}
                                {isAtm && <span style={{ display:"block", fontSize:9, color:T.warn, letterSpacing:1 }}>ATM</span>}
                                {isMaxPain && <span style={{ display:"block", fontSize:9, color:T.accent2, letterSpacing:1 }}>MAX PAIN</span>}
                              </td>
                              <td style={{ padding:"9px 10px", textAlign:"left", color:T.down, fontWeight:600 }}>{fmt(row.pe_ltp)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"left", color:T.muted }}>{row.pe_iv ? row.pe_iv.toFixed(1)+"%" : "—"}</td>
                              <td style={{ padding:"9px 10px", textAlign:"left", color:T.muted }}>{fmtOi(row.pe_volume)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"left", color: row.pe_chng_oi > 0 ? T.up : T.down }}>{fmtOi(row.pe_chng_oi)}</td>
                              <td style={{ padding:"9px 10px", textAlign:"left", color:T.down, opacity:0.9 }}>{fmtOi(row.pe_oi)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


        <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px 24px", textAlign:"center", marginTop:24 }}>
          <span style={{ fontFamily:"JetBrains Mono", fontSize:11, color:T.muted }}>
            NIFTY ANALYZER • Data refreshes every 5 min during market hours (09:15 – 15:30 IST) • {new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </span>
        </div>
      </div>
    </>
  );
}
