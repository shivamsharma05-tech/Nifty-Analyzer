from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import requests
import sqlite3
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import threading
import schedule
import time
import os
import pytz

app = Flask(__name__)
CORS(app)

# ─── CONFIG ───────────────────────────────────────────────
NEWS_API_KEY =  os.environ.get("NEWS_API_KEY","d72ac2c15a48499db495479811989120")
DB_PATH = "nifty_data.db"
NIFTY_SYMBOL = "^NSEI"

# ─── DATABASE SETUP ───────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Market candle data (OHLCV per minute)
    c.execute('''CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        date TEXT NOT NULL,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        volume REAL,
        UNIQUE(timestamp)
    )''')

    # News articles
    c.execute('''CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        published_at TEXT NOT NULL,
        title TEXT,
        description TEXT,
        source TEXT,
        url TEXT,
        sentiment TEXT,
        keywords TEXT,
        UNIQUE(url)
    )''')

    # Detected patterns
    c.execute('''CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        pattern_name TEXT,
        detected_at TEXT,
        strength TEXT,
        description TEXT
    )''')

    # Market dips and spikes events
    c.execute('''CREATE TABLE IF NOT EXISTS market_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        event_time TEXT,
        event_type TEXT,
        price_before REAL,
        price_after REAL,
        change_pct REAL,
        linked_news TEXT,
        description TEXT
    )''')

    # Daily summary + prediction
    c.execute('''CREATE TABLE IF NOT EXISTS daily_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        open_price REAL,
        close_price REAL,
        day_high REAL,
        day_low REAL,
        total_change_pct REAL,
        volatility REAL,
        trend TEXT,
        safety_score INTEGER,
        safety_label TEXT,
        prediction TEXT,
        top_news TEXT,
        patterns_found TEXT,
        created_at TEXT
    )''')

    # Option chain data
    c.execute('''CREATE TABLE IF NOT EXISTS option_chain (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fetched_at TEXT NOT NULL,
        date TEXT NOT NULL,
        expiry TEXT,
        strike REAL,
        ce_oi REAL, ce_chng_oi REAL, ce_volume REAL, ce_iv REAL, ce_ltp REAL, ce_bid REAL, ce_ask REAL,
        pe_oi REAL, pe_chng_oi REAL, pe_volume REAL, pe_iv REAL, pe_ltp REAL, pe_bid REAL, pe_ask REAL,
        atm INTEGER DEFAULT 0
    )''')

    conn.commit()
    conn.close()
    print("✅ Database initialized")

# ─── FETCH MARKET DATA ────────────────────────────────────
def fetch_market_data():
    print(f"📈 Fetching Nifty data at {datetime.now().strftime('%H:%M:%S')}")
    try:
        ticker = yf.Ticker(NIFTY_SYMBOL)
        df = ticker.history(period="1d", interval="5m")

        if df.empty:
            print("⚠️ No data returned from yfinance")
            return None

        df.reset_index(inplace=True)
        df['Datetime'] = pd.to_datetime(df['Datetime'])

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        today = datetime.now().strftime("%Y-%m-%d")

        for _, row in df.iterrows():
            ts = row['Datetime'].strftime("%Y-%m-%d %H:%M:%S")
            try:
                c.execute('''INSERT OR IGNORE INTO market_data 
                    (timestamp, date, open, high, low, close, volume)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                    (ts, today, row['Open'], row['High'], row['Low'], row['Close'], row['Volume']))
            except Exception as e:
                pass

        conn.commit()
        conn.close()
        print(f"✅ Saved {len(df)} market candles")
        return df

    except Exception as e:
        print(f"❌ Market fetch error: {e}")
        return None

# ─── FETCH NEWS ───────────────────────────────────────────
def fetch_news():
    print("📰 Fetching financial news...")
    try:
        keywords = "Nifty OR Sensex OR RBI OR Indian stock market OR NSE OR BSE"
        url = f"https://newsapi.org/v2/everything?q={keywords}&language=en&sortBy=publishedAt&pageSize=20&apiKey={NEWS_API_KEY}"
        response = requests.get(url, timeout=10)
        data = response.json()

        if data.get("status") != "ok":
            print(f"⚠️ NewsAPI error: {data.get('message')}")
            return []

        articles = data.get("articles", [])
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        saved = 0
        for article in articles:
            title = article.get("title", "")
            desc = article.get("description", "")
            sentiment = analyze_sentiment(title + " " + (desc or ""))
            keywords_found = extract_keywords(title)

            try:
                c.execute('''INSERT OR IGNORE INTO news 
                    (published_at, title, description, source, url, sentiment, keywords)
                    VALUES (?, ?, ?, ?, ?, ?, ?)''',
                    (
                        article.get("publishedAt", ""),
                        title,
                        desc,
                        article.get("source", {}).get("name", ""),
                        article.get("url", ""),
                        sentiment,
                        keywords_found
                    ))
                saved += 1
            except:
                pass

        conn.commit()
        conn.close()
        print(f"✅ Saved {saved} news articles")
        return articles

    except Exception as e:
        print(f"❌ News fetch error: {e}")
        return []

# ─── SENTIMENT ANALYSIS (rule-based) ──────────────────────
def analyze_sentiment(text):
    text = text.lower()
    positive_words = ["surge", "rally", "gain", "rise", "bull", "high", "profit", "boost", "strong", "record", "growth", "up"]
    negative_words = ["crash", "fall", "drop", "bear", "loss", "low", "decline", "weak", "sell", "down", "fear", "crisis", "slump"]

    pos = sum(1 for w in positive_words if w in text)
    neg = sum(1 for w in negative_words if w in text)

    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    return "neutral"

# ─── KEYWORD EXTRACTOR ────────────────────────────────────
def extract_keywords(text):
    important = ["RBI", "rate", "inflation", "GDP", "budget", "FII", "DII", "rupee", "dollar",
                 "earnings", "war", "election", "policy", "Fed", "China", "oil", "recession"]
    found = [k for k in important if k.lower() in text.lower()]
    return ", ".join(found)

# ─── PATTERN DETECTION ────────────────────────────────────
def detect_patterns(df):
    patterns = []
    if df is None or len(df) < 10:
        return patterns

    closes = df['Close'].values

    # Moving averages
    ma5 = np.convolve(closes, np.ones(5)/5, mode='valid')
    ma10 = np.convolve(closes, np.ones(10)/10, mode='valid')

    # Golden Cross / Death Cross
    if len(ma5) > 1 and len(ma10) > 1:
        if ma5[-1] > ma10[-1] and ma5[-2] <= ma10[-2]:
            patterns.append({"name": "Golden Cross", "strength": "Strong", "desc": "Short-term MA crossed above long-term MA — bullish signal"})
        elif ma5[-1] < ma10[-1] and ma5[-2] >= ma10[-2]:
            patterns.append({"name": "Death Cross", "strength": "Strong", "desc": "Short-term MA crossed below long-term MA — bearish signal"})

    # RSI
    rsi = calculate_rsi(closes)
    if rsi:
        if rsi < 30:
            patterns.append({"name": "Oversold (RSI)", "strength": "Moderate", "desc": f"RSI at {rsi:.1f} — market may bounce back"})
        elif rsi > 70:
            patterns.append({"name": "Overbought (RSI)", "strength": "Moderate", "desc": f"RSI at {rsi:.1f} — market may correct soon"})

    # Volatility spike
    returns = np.diff(closes) / closes[:-1] * 100
    if len(returns) > 5:
        recent_vol = np.std(returns[-5:])
        avg_vol = np.std(returns)
        if recent_vol > avg_vol * 1.5:
            patterns.append({"name": "Volatility Spike", "strength": "High", "desc": "Unusual price swings detected in recent candles"})

    # Trend detection
    if closes[-1] > closes[0]:
        change = ((closes[-1] - closes[0]) / closes[0]) * 100
        if change > 1:
            patterns.append({"name": "Uptrend", "strength": "Strong" if change > 2 else "Moderate", "desc": f"Market is trending up {change:.2f}% today"})
    else:
        change = ((closes[0] - closes[-1]) / closes[0]) * 100
        if change > 1:
            patterns.append({"name": "Downtrend", "strength": "Strong" if change > 2 else "Moderate", "desc": f"Market is trending down {change:.2f}% today"})

    return patterns

# ─── RSI CALCULATION ──────────────────────────────────────
def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return None
    deltas = np.diff(prices)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.mean(gains[-period:])
    avg_loss = np.mean(losses[-period:])
    if avg_loss == 0:
        return 100
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))

# ─── DETECT MARKET EVENTS (dips/spikes) ───────────────────
def detect_events(df, news_list):
    if df is None or len(df) < 5:
        return []

    events = []
    closes = df['Close'].values
    timestamps = df['Datetime'].tolist() if 'Datetime' in df.columns else []

    for i in range(1, len(closes)):
        change = ((closes[i] - closes[i-1]) / closes[i-1]) * 100
        if abs(change) >= 0.4:  # significant 5-min move
            event_type = "spike" if change > 0 else "dip"
            event_time = str(timestamps[i]) if timestamps else ""

            # Find related news
            related = []
            for n in news_list:
                title = n.get("title", "")
                if any(w in title for w in ["Nifty", "market", "RBI", "rupee", "stock"]):
                    related.append(title[:80])
                    if len(related) >= 2:
                        break

            events.append({
                "type": event_type,
                "time": event_time,
                "price_before": round(closes[i-1], 2),
                "price_after": round(closes[i], 2),
                "change_pct": round(change, 2),
                "linked_news": related
            })

    return events

# ─── SAFETY SCORE ─────────────────────────────────────────
def calculate_safety(df, patterns, events):
    score = 50  # start neutral

    if df is not None and len(df) > 5:
        closes = df['Close'].values
        total_change = ((closes[-1] - closes[0]) / closes[0]) * 100
        returns = np.diff(closes) / closes[:-1] * 100
        volatility = np.std(returns)

        # Less volatility = safer
        if volatility < 0.2:
            score += 15
        elif volatility > 0.5:
            score -= 20

        # Positive day
        if total_change > 0.5:
            score += 10
        elif total_change < -1:
            score -= 15

    # Patterns
    for p in patterns:
        if p['name'] == 'Golden Cross':
            score += 15
        elif p['name'] == 'Death Cross':
            score -= 20
        elif p['name'] == 'Oversold (RSI)':
            score += 10
        elif p['name'] == 'Overbought (RSI)':
            score -= 10
        elif p['name'] == 'Volatility Spike':
            score -= 10

    # Events
    dips = sum(1 for e in events if e['type'] == 'dip')
    if dips > 3:
        score -= 10

    score = max(0, min(100, score))

    if score >= 65:
        label = "Safe"
    elif score >= 40:
        label = "Moderate"
    else:
        label = "Risky"

    return score, label

# ─── GENERATE PREDICTION ──────────────────────────────────
def generate_prediction(df, patterns, events, news_list):
    lines = []

    if df is not None and len(df) > 5:
        closes = df['Close'].values
        total_change = ((closes[-1] - closes[0]) / closes[0]) * 100

        if total_change > 1:
            lines.append("Today's market showed strong upward momentum.")
        elif total_change < -1:
            lines.append("Today's market faced selling pressure.")
        else:
            lines.append("Market moved sideways today with limited directional bias.")

    neg_news = [n for n in news_list if analyze_sentiment(n.get("title","")) == "negative"]
    if neg_news:
        lines.append(f"{len(neg_news)} negative news items detected — monitor for continued impact tomorrow.")

    for p in patterns:
        if p['name'] == 'Death Cross':
            lines.append("Death Cross pattern suggests bearish pressure may continue.")
        elif p['name'] == 'Golden Cross':
            lines.append("Golden Cross pattern indicates potential uptrend continuation.")
        elif p['name'] == 'Oversold (RSI)':
            lines.append("Oversold RSI may trigger a bounce — watch for reversal.")

    if not lines:
        lines.append("Insufficient data for a strong prediction today.")

    return " ".join(lines)

# ─── DAILY FULL ANALYSIS ──────────────────────────────────
def run_full_analysis():
    print("\n🔄 Running full daily analysis...")
    df = fetch_market_data()
    news = fetch_news()

    patterns = detect_patterns(df)
    events = detect_events(df, news)
    safety_score, safety_label = calculate_safety(df, patterns, events)
    prediction = generate_prediction(df, patterns, events, news)

    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Save patterns
    for p in patterns:
        c.execute('''INSERT INTO patterns (date, pattern_name, detected_at, strength, description)
            VALUES (?, ?, ?, ?, ?)''',
            (today, p['name'], datetime.now().strftime("%H:%M:%S"), p['strength'], p['desc']))

    # Save events
    for e in events:
        c.execute('''INSERT INTO market_events 
            (date, event_time, event_type, price_before, price_after, change_pct, linked_news, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (today, e['time'], e['type'], e['price_before'], e['price_after'],
             e['change_pct'], json.dumps(e['linked_news']), ""))

    # Save daily summary
    if df is not None and len(df) > 0:
        closes = df['Close'].values
        returns = np.diff(closes) / closes[:-1] * 100
        volatility = round(float(np.std(returns)), 4) if len(returns) > 0 else 0
        total_change = round(((closes[-1] - closes[0]) / closes[0]) * 100, 2)
        trend = "Bullish" if total_change > 0 else "Bearish"

        top_news = json.dumps([n.get("title","")[:100] for n in news[:5]])
        patterns_found = json.dumps([p['name'] for p in patterns])

        c.execute('''INSERT OR REPLACE INTO daily_summary 
            (date, open_price, close_price, day_high, day_low, total_change_pct, 
             volatility, trend, safety_score, safety_label, prediction, top_news, patterns_found, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (today, round(float(closes[0]),2), round(float(closes[-1]),2),
             round(float(df['High'].max()),2), round(float(df['Low'].min()),2),
             total_change, volatility, trend, safety_score, safety_label,
             prediction, top_news, patterns_found, datetime.now().isoformat()))

    conn.commit()
    conn.close()
    print("✅ Full analysis complete")

def fetch_option_chain():
    print("📊 Fetching NSE Option Chain using Chrome...")
    driver = None
    try:
        # Setup headless Chrome
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )

        # Step 1: Visit NSE homepage to get cookies
        print("🌐 Visiting NSE homepage...")
        driver.get("https://www.nseindia.com")
        time.sleep(3)

        # Step 2: Visit option chain page
        print("🌐 Visiting option chain page...")
        driver.get("https://www.nseindia.com/option-chain")
        time.sleep(3)

        # Step 3: Get cookies from browser and use them in requests
        cookies = driver.get_cookies()
        driver.quit()
        driver = None

        # Build requests session with real browser cookies
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-IN,en;q=0.9",
            "Referer": "https://www.nseindia.com/option-chain",
        })
        for cookie in cookies:
            session.cookies.set(cookie['name'], cookie['value'])

        print(f"🍪 Got {len(cookies)} cookies from NSE")

        # Step 4: Fetch option chain data
        url = "https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY"
        response = session.get(url, timeout=20)
        print(f"📡 NSE response status: {response.status_code}")

        if response.status_code != 200:
            print(f"⚠️ NSE returned status {response.status_code}")
            return None

        data = response.json()
        records = data.get("records", {})
        option_data = records.get("data", [])
        expiry_dates = records.get("expiryDates", [])
        underlying_value = records.get("underlyingValue", 0)

        if not option_data:
            print("⚠️ No option chain data returned")
            return None

        # Use nearest expiry
        nearest_expiry = expiry_dates[0] if expiry_dates else ""

        # Find ATM strike
        atm_strike = round(underlying_value / 50) * 50

        today = datetime.now().strftime("%Y-%m-%d")
        fetched_at = datetime.now().isoformat()

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # Clear today's option chain data before saving fresh data
        c.execute("DELETE FROM option_chain WHERE date=?", (today,))

        saved = 0
        for item in option_data:
            strike = item.get("strikePrice", 0)
            expiry = item.get("expiryDate", "")

            # Only save nearest expiry
            if expiry != nearest_expiry:
                continue

            ce = item.get("CE", {})
            pe = item.get("PE", {})
            is_atm = 1 if strike == atm_strike else 0

            c.execute('''INSERT INTO option_chain 
                (fetched_at, date, expiry, strike,
                 ce_oi, ce_chng_oi, ce_volume, ce_iv, ce_ltp, ce_bid, ce_ask,
                 pe_oi, pe_chng_oi, pe_volume, pe_iv, pe_ltp, pe_bid, pe_ask, atm)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (fetched_at, today, expiry, strike,
                 ce.get("openInterest", 0), ce.get("changeinOpenInterest", 0),
                 ce.get("totalTradedVolume", 0), ce.get("impliedVolatility", 0),
                 ce.get("lastPrice", 0), ce.get("bidprice", 0), ce.get("askPrice", 0),
                 pe.get("openInterest", 0), pe.get("changeinOpenInterest", 0),
                 pe.get("totalTradedVolume", 0), pe.get("impliedVolatility", 0),
                 pe.get("lastPrice", 0), pe.get("bidprice", 0), pe.get("askPrice", 0),
                 is_atm))
            saved += 1

        conn.commit()
        conn.close()
        print(f"✅ Saved {saved} option chain strikes")
        return { "underlying": underlying_value, "atm": atm_strike, "expiry": nearest_expiry, "saved": saved }

    except Exception as e:
        print(f"❌ Option chain fetch error: {e}")
        if driver:
            try:
                driver.quit()
            except:
                pass
        return None

def calculate_pcr(option_data):
    total_pe_oi = sum(d.get("pe_oi", 0) for d in option_data)
    total_ce_oi = sum(d.get("ce_oi", 0) for d in option_data)
    if total_ce_oi == 0:
        return 0
    return round(total_pe_oi / total_ce_oi, 2)

def calculate_max_pain(option_data):
    strikes = list(set(d["strike"] for d in option_data))
    min_pain = float("inf")
    max_pain_strike = 0
    for s in strikes:
        pain = 0
        for d in option_data:
            pain += d.get("ce_oi", 0) * max(0, s - d["strike"])
            pain += d.get("pe_oi", 0) * max(0, d["strike"] - s)
        if pain < min_pain:
            min_pain = pain
            max_pain_strike = s
    return max_pain_strike

# ─── API ROUTES ───────────────────────────────────────────

@app.route('/api/market', methods=['GET'])
def get_market_data():
    date = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM market_data WHERE date=? ORDER BY timestamp", conn, params=(date,))
    conn.close()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/news', methods=['GET'])
def get_news():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM news ORDER BY published_at DESC LIMIT 30", conn)
    conn.close()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/patterns', methods=['GET'])
def get_patterns():
    date = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM patterns WHERE date=?", conn, params=(date,))
    conn.close()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/events', methods=['GET'])
def get_events():
    date = request.args.get('date', datetime.now().strftime("%Y-%m-%d"))
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM market_events WHERE date=? ORDER BY event_time", conn, params=(date,))
    conn.close()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/summary', methods=['GET'])
def get_summary():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM daily_summary ORDER BY date DESC LIMIT 10", conn)
    conn.close()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/summary/today', methods=['GET'])
def get_today_summary():
    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM daily_summary WHERE date=?", conn, params=(today,))
    conn.close()
    if df.empty:
        return jsonify({"message": "No summary yet for today"})
    return jsonify(df.to_dict(orient='records')[0])

@app.route('/api/optionchain', methods=['GET'])
def get_option_chain():
    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query(
        "SELECT * FROM option_chain WHERE date=? ORDER BY strike ASC",
        conn, params=(today,)
    )
    conn.close()

    if df.empty:
        return jsonify({ "data": [], "pcr": 0, "max_pain": 0, "atm": 0 })

    records = df.to_dict(orient='records')
    pcr = calculate_pcr(records)
    max_pain = calculate_max_pain(records)
    atm = next((r["strike"] for r in records if r["atm"] == 1), 0)

    return jsonify({
        "data": records,
        "pcr": pcr,
        "max_pain": max_pain,
        "atm": atm,
        "expiry": records[0]["expiry"] if records else "",
        "fetched_at": records[0]["fetched_at"] if records else ""
    })

@app.route('/api/optionchain/refresh', methods=['POST'])
def refresh_option_chain():
    result = fetch_option_chain()
    if result:
        return jsonify({ "message": "Option chain refreshed", "details": result })
    return jsonify({ "message": "Failed to fetch option chain" }), 500


def manual_refresh():
    threading.Thread(target=run_full_analysis).start()
    return jsonify({"message": "Analysis started in background"})

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "running",
        "time": datetime.now().isoformat(),
        "market_open": is_market_open()
    })

def is_market_open():
    now = datetime.now()
    return now.weekday() < 5 and 9 <= now.hour < 15

# ─── SCHEDULER ────────────────────────────────────────────
def start_scheduler():
    # Fetch every 5 minutes during market hours
    schedule.every(5).minutes.do(lambda: run_full_analysis() if is_market_open() else None)
    schedule.every(3).minutes.do(lambda: fetch_option_chain() if is_market_open() else None)

    def run():
        while True:
            schedule.run_pending()
            time.sleep(60)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    print("⏰ Scheduler started")

# ─── MAIN ─────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    start_scheduler()
    run_full_analysis()
    fetch_option_chain()  # Fetch option chain on startup
    app.run(debug=True, port=5000)
