'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Calendar as CalendarIcon, Instagram, Lock, X, ChevronLeft, ChevronRight,
  LogIn, LogOut, Settings,
} from 'lucide-react';
import { BarData, DEFAULT_DATA } from '@/lib/types';

const POLL_INTERVAL = 30_000; // 30秒ごとに最新ステータスを取得

// Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const fmtDate = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const MONTH_LABELS = ['睦月', '如月', '弥生', '卯月', '皐月', '水無月', '文月', '葉月', '長月', '神無月', '霜月', '師走'];
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

export default function BarLanding() {
  const [data, setData] = useState<BarData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [calCursor, setCalCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [savedPin, setSavedPin] = useState<string | null>(null);

  // Fetch state from server
  const fetchState = useCallback(async () => {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        setData({ ...DEFAULT_DATA, ...d, config: { ...DEFAULT_DATA.config, ...(d.config || {}) } });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchState();
    const poll = setInterval(fetchState, POLL_INTERVAL);
    const tick = setInterval(() => setNow(new Date()), 60_000);
    // 画面再表示時に再取得（PWA・タブ切替対策）
    const onVis = () => { if (!document.hidden) fetchState(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchState]);

  // Persist (PIN-protected)
  async function persist(next: BarData) {
    setData(next); // optimistic
    if (!savedPin) return;
    try {
      const r = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: savedPin, data: next }),
      });
      if (!r.ok) {
        if (r.status === 401) {
          setSavedPin(null);
          setUnlocked(false);
          setPinError(true);
          setLocationMsg('暗証番号が無効です。再度ログインしてください。');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function tryUnlock() {
    // Verify PIN by attempting a no-op write
    try {
      const r = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, data }),
      });
      if (r.ok) {
        setSavedPin(pinInput);
        setUnlocked(true);
        setPinError(false);
        setPinInput('');
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 800);
      }
    } catch (e) {
      setPinError(true);
      setTimeout(() => setPinError(false), 800);
    }
  }

  async function checkInWithLocation() {
    if (!navigator.geolocation) {
      setLocationMsg('この端末では位置情報が利用できません');
      return;
    }
    if (data.config.locationLat == null || data.config.locationLng == null) {
      setLocationMsg('まずお店の座標を設定してください');
      return;
    }
    setCheckingLocation(true);
    setLocationMsg('現在地を確認中…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = haversine(
          pos.coords.latitude,
          pos.coords.longitude,
          data.config.locationLat!,
          data.config.locationLng!
        );
        const within = dist <= data.config.radius;
        const next: BarData = {
          ...data,
          status: {
            isOpen: within,
            manualOverride: null,
            lastUpdate: new Date().toISOString(),
            lastDistance: Math.round(dist),
          },
        };
        await persist(next);
        setCheckingLocation(false);
        setLocationMsg(
          within
            ? `店内を確認 (${Math.round(dist)}m) — 灯を点しました`
            : `お店から ${Math.round(dist)}m 離れています — 灯は点きません`
        );
      },
      (err) => {
        setCheckingLocation(false);
        setLocationMsg('位置情報を取得できませんでした: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function setBarLocationFromHere() {
    if (!navigator.geolocation) {
      setLocationMsg('この端末では位置情報が利用できません');
      return;
    }
    setLocationMsg('現在地を取得中…');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next: BarData = {
          ...data,
          config: {
            ...data.config,
            locationLat: pos.coords.latitude,
            locationLng: pos.coords.longitude,
          },
        };
        await persist(next);
        setLocationMsg('お店の座標を保存しました');
      },
      (err) => {
        setLocationMsg('位置情報を取得できませんでした: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function manualToggle(state: 'open' | 'closed') {
    const next: BarData = {
      ...data,
      status: {
        ...data.status,
        isOpen: state === 'open',
        manualOverride: state,
        lastUpdate: new Date().toISOString(),
      },
    };
    await persist(next);
  }

  async function clearOverride() {
    const next: BarData = {
      ...data,
      status: { ...data.status, manualOverride: null },
    };
    await persist(next);
  }

  async function updateConfig(patch: Partial<BarData['config']>) {
    const next: BarData = { ...data, config: { ...data.config, ...patch } };
    await persist(next);
  }

  async function setCalendarDay(dateKey: string, state: 'open' | 'closed' | 'special' | 'auto') {
    const cal = { ...data.calendar };
    if (state === 'auto') delete cal[dateKey];
    else cal[dateKey] = state;
    await persist({ ...data, calendar: cal });
  }

  // Computed open status
  const todayKey = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());
  const realDow = now.getDay();
  const calOverride = data.calendar[todayKey];
  const isDefaultClosed = data.config.defaultClosed.includes(realDow);
  const calendarSaysOpen =
    calOverride === 'open' || calOverride === 'special'
      ? true
      : calOverride === 'closed'
      ? false
      : !isDefaultClosed;
  const isOpen =
    data.status.manualOverride === 'open'
      ? true
      : data.status.manualOverride === 'closed'
      ? false
      : data.status.isOpen && calendarSaysOpen;

  // Calendar grid
  const monthDays = (() => {
    const first = new Date(calCursor.y, calCursor.m, 1);
    const firstDow = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(calCursor.y, calCursor.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  function dayState(d: number): 'open' | 'closed' | 'special' {
    const k = fmtDate(calCursor.y, calCursor.m, d);
    const ovr = data.calendar[k];
    if (ovr) return ovr;
    const realDow2 = new Date(calCursor.y, calCursor.m, d).getDay();
    return data.config.defaultClosed.includes(realDow2) ? 'closed' : 'open';
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#c8a2b8]">
        <div className="font-serif-l italic tracking-widest text-sm opacity-60">opening…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="grain" />
      <div className="vignette" />

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col">
        <div className="ambient-glow" style={{ top: '-200px', left: '-200px' }} />
        <div className="ambient-glow" style={{ bottom: '-300px', right: '-200px', background: 'radial-gradient(circle, rgba(212,184,150,0.1) 0%, transparent 60%)' }} />

        <div className="relative z-10 px-6 pt-8 flex items-center justify-between fade-up">
          <div className="font-display text-xl tracking-[0.3em] text-[#c8a2b8]">M · 317</div>
          <div className="lamp-frame">
            <span className={`lamp ${isOpen ? 'on' : ''}`} />
            <span className="font-jp text-xs tracking-[0.3em] text-[#ece1d8]">
              {isOpen ? '営 業 中' : '本 日 休 業'}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="font-serif-l italic text-[#a78695] text-sm tracking-[0.4em] mb-6 fade-up-2">
            — a quiet bar for solitary nights —
          </div>
          <h1 className="hero-title fade-up-3">mauve</h1>
          <div className="font-jp text-sm tracking-[0.5em] text-[#c8a2b8] mt-6 fade-up-4">
            深 夜 の 音 律 と 一 杯
          </div>
          <div className="mt-12 max-w-md fade-up-5">
            <p className="font-jp text-sm leading-loose text-[#9b8a91]">
              扉の向こうに、ひとりの夜。<br/>
              誰にも気を遣わず、自分のための音と酒を。
            </p>
          </div>
        </div>

        <div className="relative z-10 pb-8 flex flex-col items-center scroll-hint">
          <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78]">SCROLL</div>
          <div className="w-px h-10 bg-gradient-to-b from-[#8a6a78] to-transparent mt-2" />
        </div>
      </section>

      {/* CONCEPT */}
      <section className="relative z-10 px-6 py-24 max-w-5xl mx-auto">
        <div className="divider-glyph mb-16">
          <span className="ornament-line max-w-[80px]" />
          <span className="text-2xl">✦</span>
          <span className="ornament-line max-w-[80px]" />
        </div>

        <div className="text-center mb-20">
          <div className="font-display text-sm tracking-[0.5em] text-[#8a6a78] mb-4">CONCEPT</div>
          <h2 className="font-jp text-2xl md:text-3xl tracking-[0.2em] text-[#ece1d8] leading-relaxed">
            ひとりで、深く。<br/>
            <span className="font-serif-l italic text-[#c8a2b8]">In quiet company of music & spirits.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {[
            { jp: '音', en: 'Sound', desc: 'ヴィンテージのジャズ、深夜のアンビエント。会話を遮らない、けれど確かに残る音。' },
            { jp: '酒', en: 'Spirits', desc: 'モルトウイスキー、クラシックカクテル、季節の一杯。バーテンダーと相談しながら一杯ずつ。' },
            { jp: '独', en: 'Solitude', desc: 'カウンターは八席。連れ立つ夜より、ひとりの夜に。静けさが似合う場所。' },
          ].map((c, i) => (
            <div key={i} className="text-center">
              <div className="font-jp text-5xl text-[#c8a2b8] mb-3">{c.jp}</div>
              <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-4">{c.en}</div>
              <p className="font-jp text-sm leading-loose text-[#9b8a91] max-w-[260px] mx-auto">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MENU */}
      <section className="relative z-10 px-6 py-20 max-w-3xl mx-auto">
        <div className="divider-glyph mb-12">
          <span className="ornament-line max-w-[80px]" />
          <span className="font-display text-sm tracking-[0.4em]">SELECTION</span>
          <span className="ornament-line max-w-[80px]" />
        </div>

        <div className="space-y-1">
          {[
            ['Old Fashioned', 'バーボン、ビターズ、オレンジ', '¥1,400'],
            ['Negroni Sbagliato', 'カンパリ、スパークリング、ベルモット', '¥1,500'],
            ['Single Malt — house pour', '日替わりのモルトを一杯', '¥1,600〜'],
            ['Mauve Spritz', 'バイオレット、グレープフルーツ、トニック', '¥1,500'],
            ['Espresso & Bourbon', '深夜の二杯目に', '¥1,300'],
          ].map((row, i) => (
            <div key={i} className="menu-row">
              <div>
                <div className="font-serif-l text-lg text-[#ece1d8]">{row[0]}</div>
                <div className="font-jp text-xs text-[#8a6a78] mt-1 tracking-wider">{row[1]}</div>
              </div>
              <div className="leader" />
              <div className="font-serif-l italic text-[#c8a2b8]">{row[2]}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <div className="font-jp text-xs text-[#8a6a78] tracking-[0.3em]">— more on the night —</div>
        </div>
      </section>

      {/* CALENDAR */}
      <section className="relative z-10 px-6 py-20 max-w-3xl mx-auto">
        <div className="divider-glyph mb-12">
          <span className="ornament-line max-w-[80px]" />
          <CalendarIcon size={16} className="text-[#8a6a78]" />
          <span className="ornament-line max-w-[80px]" />
        </div>

        <div className="text-center mb-10">
          <div className="font-display text-sm tracking-[0.5em] text-[#8a6a78] mb-3">CALENDAR</div>
          <h2 className="font-jp text-2xl tracking-[0.2em] text-[#ece1d8]">営 業 日</h2>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              const d = new Date(calCursor.y, calCursor.m - 1, 1);
              setCalCursor({ y: d.getFullYear(), m: d.getMonth() });
            }}
            className="text-[#8a6a78] hover:text-[#c8a2b8] transition"
            aria-label="前月"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-display text-2xl tracking-[0.2em] text-[#ece1d8]">
              {calCursor.y} · {String(calCursor.m + 1).padStart(2, '0')}
            </div>
            <div className="font-jp text-xs text-[#8a6a78] tracking-[0.4em] mt-1">{MONTH_LABELS[calCursor.m]}</div>
          </div>
          <button
            onClick={() => {
              const d = new Date(calCursor.y, calCursor.m + 1, 1);
              setCalCursor({ y: d.getFullYear(), m: d.getMonth() });
            }}
            className="text-[#8a6a78] hover:text-[#c8a2b8] transition"
            aria-label="次月"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`text-center font-jp text-xs tracking-[0.3em] py-2 ${i === 5 ? 'text-[#7d8aa8]' : i === 6 ? 'text-[#c87878]' : 'text-[#8a6a78]'}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const state = dayState(d);
            const isToday =
              calCursor.y === now.getFullYear() &&
              calCursor.m === now.getMonth() &&
              d === now.getDate();
            return (
              <div key={i} className={`cal-cell ${state} ${isToday ? 'today' : ''}`}>
                <span className="day-num">{d}</span>
                <span className="day-mark" />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-center gap-6 mt-8 font-jp text-xs text-[#9b8a91]">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#c8a2b8]" /> 営業日</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#2a2228]" /> 定休日</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#d4b896] shadow-[0_0_6px_rgba(212,184,150,0.6)]" /> 特別営業</span>
        </div>
      </section>

      {/* INFO */}
      <section className="relative z-10 px-6 py-20 max-w-3xl mx-auto">
        <div className="divider-glyph mb-12">
          <span className="ornament-line max-w-[80px]" />
          <span className="font-display text-sm tracking-[0.4em]">INFORMATION</span>
          <span className="ornament-line max-w-[80px]" />
        </div>

        <div className="grid md:grid-cols-2 gap-10 font-jp text-sm">
          <div>
            <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">HOURS</div>
            <div className="text-[#ece1d8] text-base tracking-wider">{data.config.hours}</div>
            <div className="text-[#8a6a78] text-xs mt-2">L.O. 30分前 · 定休 月曜・日曜</div>
          </div>
          <div>
            <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">CHARGE</div>
            <div className="text-[#ece1d8] text-base tracking-wider">{data.config.cover}</div>
            <div className="text-[#8a6a78] text-xs mt-2">お通し付 · お一人様歓迎</div>
          </div>
          <div>
            <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">ADDRESS</div>
            <div className="text-[#ece1d8] tracking-wider">{data.config.address}</div>
            <div className="text-[#8a6a78] text-xs mt-2">{data.config.nearestStation}</div>
          </div>
          <div>
            <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">CONTACT</div>
            <div className="text-[#ece1d8] tracking-wider">{data.config.phone}</div>
            <div className="text-[#8a6a78] text-xs mt-2">予約不要 · ご来店優先</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 px-6 py-16 border-t border-[#2a1f25]">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-6">
          <div className="font-display text-3xl tracking-[0.3em] text-[#c8a2b8]">mauve</div>
          <div className="font-jp text-xs text-[#8a6a78] tracking-[0.3em]">
            ひとりの夜に、寄り添う場所を。
          </div>
          <a
            href="https://www.instagram.com/mauve.317/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#9b8a91] hover:text-[#c8a2b8] transition"
          >
            <Instagram size={16} />
            <span className="font-serif-l italic text-sm">@mauve.317</span>
          </a>
          <button
            onClick={() => setAdminOpen(true)}
            className="mt-4 text-[#3a2f35] hover:text-[#8a6a78] transition text-xs flex items-center gap-1"
            aria-label="店主メニュー"
          >
            <Settings size={12} />
            <span className="font-display tracking-[0.3em]">staff</span>
          </button>
          <div className="font-display text-xs tracking-[0.4em] text-[#3a2f35] mt-4">
            © {now.getFullYear()} MAUVE · ALL NIGHTS RESERVED
          </div>
        </div>
      </footer>

      {/* ADMIN */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-[#15101380] border-t md:border border-[#3a2f35] backdrop-blur-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-lg md:rounded-lg">
            <div className="p-6 border-b border-[#2a1f25] flex items-center justify-between sticky top-0 bg-[#15101380] backdrop-blur-xl">
              <div>
                <div className="font-display text-sm tracking-[0.4em] text-[#8a6a78]">STAFF</div>
                <div className="font-jp text-lg text-[#ece1d8]">店主メニュー</div>
              </div>
              <button
                onClick={() => { setAdminOpen(false); setUnlocked(false); setSavedPin(null); setLocationMsg(''); }}
                className="text-[#8a6a78] hover:text-[#c8a2b8]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {!unlocked ? (
                <div className="text-center py-8">
                  <Lock className="mx-auto text-[#8a6a78] mb-4" size={28} />
                  <div className="font-jp text-sm text-[#9b8a91] mb-6 tracking-wider">
                    暗証番号を入力してください
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
                    className={`field max-w-[200px] mx-auto text-center text-2xl tracking-[0.5em] ${pinError ? 'pin-shake border-[#c87878]' : ''}`}
                    placeholder="• • • •"
                    autoFocus
                  />
                  <div className="mt-6">
                    <button onClick={tryUnlock} className="btn-filled">UNLOCK</button>
                  </div>
                  <div className="text-[#3a2f35] text-xs mt-6 font-display tracking-[0.3em]">
                    Vercel の環境変数 BAR_PIN
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Open / Close */}
                  <div>
                    <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">
                      OPENING — 営 業 制 御
                    </div>
                    <div className="bg-[#0d0a0d] border border-[#2a1f25] p-4 mb-3">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`lamp ${isOpen ? 'on' : ''}`} style={{ width: 12, height: 12 }} />
                        <span className="font-jp text-sm text-[#ece1d8]">
                          現在: {isOpen ? '営業中' : '休業'}
                        </span>
                      </div>
                      {data.status.lastUpdate && (
                        <div className="text-[#8a6a78] text-xs font-jp">
                          最終更新: {new Date(data.status.lastUpdate).toLocaleString('ja-JP')}
                          {data.status.lastDistance != null && ` · ${data.status.lastDistance}m`}
                        </div>
                      )}
                      {data.status.manualOverride && (
                        <div className="text-[#d4b896] text-xs font-jp mt-1">
                          手動: {data.status.manualOverride === 'open' ? '強制営業' : '強制休業'}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={checkInWithLocation}
                        disabled={checkingLocation || data.config.locationLat == null}
                        className="btn-filled flex items-center gap-2"
                      >
                        <MapPin size={14} />
                        {checkingLocation ? '確認中…' : '現在地で出勤判定'}
                      </button>
                      <button onClick={() => manualToggle('open')} className="btn-line flex items-center gap-2">
                        <LogIn size={14} /> 強制営業
                      </button>
                      <button onClick={() => manualToggle('closed')} className="btn-line flex items-center gap-2">
                        <LogOut size={14} /> 強制休業
                      </button>
                      {data.status.manualOverride && (
                        <button onClick={clearOverride} className="btn-line">手動解除</button>
                      )}
                    </div>
                    {locationMsg && (
                      <div className="mt-3 font-jp text-xs text-[#c8a2b8]">{locationMsg}</div>
                    )}
                  </div>

                  {/* Location setup */}
                  <div>
                    <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">
                      LOCATION — 店 舗 座 標
                    </div>
                    <div className="bg-[#0d0a0d] border border-[#2a1f25] p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-jp text-xs text-[#8a6a78] mb-1 block">緯度</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={data.config.locationLat ?? ''}
                            onChange={(e) => updateConfig({ locationLat: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            className="field"
                            placeholder="35.6486"
                          />
                        </div>
                        <div>
                          <label className="font-jp text-xs text-[#8a6a78] mb-1 block">経度</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={data.config.locationLng ?? ''}
                            onChange={(e) => updateConfig({ locationLng: e.target.value === '' ? null : parseFloat(e.target.value) })}
                            className="field"
                            placeholder="139.7101"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-jp text-xs text-[#8a6a78] mb-1 block">判定半径 (m)</label>
                        <input
                          type="number"
                          value={data.config.radius}
                          onChange={(e) => updateConfig({ radius: parseInt(e.target.value || '150', 10) })}
                          className="field"
                        />
                      </div>
                      <button onClick={setBarLocationFromHere} className="btn-line w-full flex items-center justify-center gap-2">
                        <MapPin size={14} /> 今いる場所をお店として登録
                      </button>
                    </div>
                  </div>

                  {/* Calendar overrides */}
                  <div>
                    <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">
                      CALENDAR — 営 業 日 編 集
                    </div>
                    <div className="bg-[#0d0a0d] border border-[#2a1f25] p-4">
                      <div className="font-jp text-xs text-[#9b8a91] mb-3">
                        日付をタップして 営業 → 休業 → 特別営業 → 自動 を切替
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => {
                            const d = new Date(calCursor.y, calCursor.m - 1, 1);
                            setCalCursor({ y: d.getFullYear(), m: d.getMonth() });
                          }}
                          className="text-[#8a6a78]"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="font-display text-sm text-[#c8a2b8]">{calCursor.y} · {String(calCursor.m + 1).padStart(2, '0')}</span>
                        <button
                          onClick={() => {
                            const d = new Date(calCursor.y, calCursor.m + 1, 1);
                            setCalCursor({ y: d.getFullYear(), m: d.getMonth() });
                          }}
                          className="text-[#8a6a78]"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((d, i) => {
                          if (!d) return <div key={i} />;
                          const k = fmtDate(calCursor.y, calCursor.m, d);
                          const state = dayState(d);
                          const ovr = data.calendar[k];
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const next = state === 'open' ? 'closed' : state === 'closed' ? 'special' : 'auto';
                                setCalendarDay(k, next);
                              }}
                              className={`cal-cell ${state} text-xs hover:border-[#c8a2b8]`}
                              style={{ minHeight: 40 }}
                            >
                              <span>{d}</span>
                              {ovr && <span className="text-[8px] text-[#d4b896]">★</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Shop info */}
                  <div>
                    <div className="font-display text-xs tracking-[0.4em] text-[#8a6a78] mb-3">
                      INFORMATION — 店 舗 情 報
                    </div>
                    <div className="bg-[#0d0a0d] border border-[#2a1f25] p-4 space-y-3">
                      <div>
                        <label className="font-jp text-xs text-[#8a6a78] mb-1 block">住所</label>
                        <input value={data.config.address} onChange={(e) => updateConfig({ address: e.target.value })} className="field" />
                      </div>
                      <div>
                        <label className="font-jp text-xs text-[#8a6a78] mb-1 block">最寄駅 / アクセス</label>
                        <input value={data.config.nearestStation} onChange={(e) => updateConfig({ nearestStation: e.target.value })} className="field" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-jp text-xs text-[#8a6a78] mb-1 block">電話</label>
                          <input value={data.config.phone} onChange={(e) => updateConfig({ phone: e.target.value })} className="field" />
                        </div>
                        <div>
                          <label className="font-jp text-xs text-[#8a6a78] mb-1 block">営業時間</label>
                          <input value={data.config.hours} onChange={(e) => updateConfig({ hours: e.target.value })} className="field" />
                        </div>
                      </div>
                      <div>
                        <label className="font-jp text-xs text-[#8a6a78] mb-1 block">チャージ</label>
                        <input value={data.config.cover} onChange={(e) => updateConfig({ cover: e.target.value })} className="field" />
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-4">
                    <button onClick={() => { setAdminOpen(false); setUnlocked(false); setSavedPin(null); setLocationMsg(''); }} className="btn-line">
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
