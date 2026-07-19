import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Cpu, MemoryStick, HardDrive, Activity, ArrowDownToLine, ArrowUpFromLine, Clock, Heart, Zap, Bell, Bot, Terminal, MessageSquare, ChevronRight, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Trash2, Database, ChevronLeft, LayoutDashboard, Wifi, ArrowRight, Download, FileText } from 'lucide-react'
import axios from 'axios'

const API = 'http://34.230.84.208:5000'
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

const C = {
  primary: '#8b5cf6', primaryHover: '#7c3aed', primaryDim: '#6d28d9',
  primaryGlow: 'rgba(139, 92, 246, 0.4)', secondary: '#ec4899',
  success: '#34d399', successDim: 'rgba(52, 211, 153, 0.15)',
  danger: '#f87171', dangerDim: 'rgba(248, 113, 113, 0.15)',
  warning: '#fbbf24', warningDim: 'rgba(251, 191, 36, 0.15)',
  info: '#60a5fa', infoDim: 'rgba(96, 165, 250, 0.15)',
  bg: '#0a0a12', bgCard: 'rgba(255,255,255,0.03)', bgCardHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.06)', borderHover: 'rgba(255,255,255,0.12)',
  borderAccent: 'rgba(139, 92, 246, 0.25)', text: '#f1f5f9', textDim: '#94a3b8',
  textMuted: '#64748b', textFaint: '#475569', glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)', glassStrong: 'rgba(255,255,255,0.07)',
  sidebarBg: 'rgba(255,255,255,0.02)', white: '#ffffff',
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', sans-serif; background: ${C.bg}; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.4); }
  .glass-card { background: ${C.bgCard}; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid ${C.border}; border-radius: 16px; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
  .glass-card:hover { background: ${C.bgCardHover}; border-color: ${C.borderHover}; transform: translateY(-2px); }
  .nav-btn { transition: all 0.2s ease; position: relative; }
  .nav-btn::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; background: ${C.primary}; border-radius: 0 2px 2px 0; transform: scaleY(0); transition: transform 0.2s ease; opacity: 0.8; }
  .nav-btn.active::before { transform: scaleY(1); }
  .nav-btn:hover { background: rgba(255,255,255,0.03); }
  .action-btn { transition: all 0.2s ease; }
  .action-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .action-btn:active:not(:disabled) { transform: scale(0.97); }
  @keyframes pulse-glow { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.75); } }
  @keyframes fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  @keyframes slide-in { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
  .fade-up { animation: fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) both; }
  .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: shimmer 2s ease infinite; border-radius: 10px; }
  .metric-num { font-variant-numeric: tabular-nums; letter-spacing: -0.04em; }
  .table-row { transition: background 0.15s ease; }
  .table-row:hover { background: rgba(139, 92, 246, 0.06); }
  .chat-input:focus { border-color: ${C.primary}; box-shadow: 0 0 0 3px rgba(139,92,246,0.15); outline: none; }
`

function formatBytes(b) {
  if (!b || b === 0) return '0 B/s'
  if (b > 1048576) return (b / 1048576).toFixed(1) + ' MB/s'
  if (b > 1024) return (b / 1024).toFixed(1) + ' KB/s'
  return Math.round(b) + ' B/s'
}
function formatUptime(s) {
  if (!s) return '--'
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`
}
function healthScore(live) {
  if (!live) return 100
  let s = 100
  if (live.cpu_percent > 90) s -= 40; else if (live.cpu_percent > 70) s -= 20; else if (live.cpu_percent > 50) s -= 10
  if (live.ram_percent > 90) s -= 30; else if (live.ram_percent > 75) s -= 15
  if (live.disk_percent > 90) s -= 20; else if (live.disk_percent > 80) s -= 10
  return Math.max(0, s)
}

function Skeleton({ w = '100%', h = 20 }) { return <div className="skeleton" style={{ width: w, height: h }} /> }

function LiveDot({ size = 7 }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size + 6, height: size + 6 }}>
      <span style={{ position: 'absolute', width: size + 6, height: size + 6, borderRadius: '50%', background: C.success, opacity: 0.25, animation: 'pulse-glow 2.5s infinite' }} />
      <span style={{ width: size, height: size, borderRadius: '50%', background: C.success, position: 'relative', zIndex: 1 }} />
    </span>
  )
}

function TrendBadge({ value, prev }) {
  if (value === undefined || prev === undefined) return null
  const diff = value - prev
  if (Math.abs(diff) < 0.5) return <span style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 99 }}><Minus size={10} /> Stable</span>
  const up = diff > 0
  return (
    <span style={{ fontSize: 11, color: up ? C.danger : C.success, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, background: up ? C.dangerDim : C.successDim, padding: '2px 8px', borderRadius: 99 }}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(diff).toFixed(1)}%
    </span>
  )
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ height: 40 }} />
  const vals = data.slice(-20)
  const id = `sp-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 5)}`
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={vals} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.25} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, paddingLeft: 2 }}>{children}</div>
}

function MetricCard({ label, value, sub, icon: Icon, color, trend, prev, sparkData, loading, delay = 0 }) {
  return (
    <div className="glass-card fade-up" style={{ padding: 20, position: 'relative', overflow: 'hidden', animationDelay: `${delay}ms` }}>
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </div>
        <TrendBadge value={typeof value === 'string' ? parseFloat(value) : value} prev={prev} />
      </div>
      {loading ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton h={32} w="50%" /><Skeleton h={12} w="70%" /></div>) : (<>
        <div className="metric-num" style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value ?? '--'}</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 400, marginBottom: sparkData ? 8 : 0 }}>{sub}</div>
      </>)}
      {sparkData && <MiniSparkline data={sparkData} color={color} />}
      {trend !== undefined && !sparkData && (<div style={{ marginTop: 8 }}><div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}><div style={{ width: `${Math.min(trend, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}60, ${color})`, borderRadius: 99, transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)' }} /></div></div>)}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(15,15,25,0.9)', backdropFilter: 'blur(12px)', border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', fontSize: 12 }}>
      <div style={{ color: C.textMuted, marginBottom: 5, fontSize: 10, fontWeight: 500 }}>{label ? new Date(label * 1000).toLocaleTimeString() : ''}</div>
      {payload.map((p, i) => (<div key={i} style={{ color: C.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />{p.name}: <span style={{ color: p.color, fontWeight: 700 }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span></div>))}
    </div>
  )
}

function BigChart({ data, color, title, unit = '', delay = 0 }) {
  const gId = `bg-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 5)}`
  return (
    <div className="glass-card fade-up" style={{ padding: '20px 22px', animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</div>
        <div style={{ fontSize: 10, color: color, background: `${color}12`, padding: '4px 10px', borderRadius: 99, fontWeight: 600, border: `1px solid ${color}18` }}>Last 1 hour</div>
      </div>
      {!data ? <Skeleton h={200} /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs><linearGradient id={gId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.15} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tickFormatter={v => new Date(v * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: C.textFaint, fontSize: 10, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: C.textFaint, fontSize: 10, fontFamily: 'Outfit' }} axisLine={false} tickLine={false} unit={unit} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" name={title} stroke={color} fill={`url(#${gId})`} strokeWidth={2} dot={false} animationDuration={1200} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* ─── Dashboard Export ─── */
function ExportButton({ live, extended, anomaly, alerts }) {
  const [exporting, setExporting] = useState(false)

  const exportPDFReport = () => {
    setExporting(true)
    const score = healthScore(live)
    const now = new Date().toLocaleString()
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>AIOps Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: 800; color: #8b5cf6; }
  .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
  .timestamp { font-size: 12px; color: #64748b; text-align: right; }
  .section-title { font-size: 14px; font-weight: 700; color: #8b5cf6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; margin-top: 28px; border-left: 3px solid #8b5cf6; padding-left: 10px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .card-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .card-value { font-size: 24px; font-weight: 800; color: #1a1a2e; }
  .card-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .badge-ok { background: #dcfce7; color: #166534; }
  .badge-warn { background: #fef9c3; color: #854d0e; }
  .badge-crit { background: #fee2e2; color: #991b1b; }
  .alert-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; margin-bottom: 8px; }
  .alert-crit { background: #fee2e2; border-left: 3px solid #f87171; }
  .alert-warn { background: #fef9c3; border-left: 3px solid #fbbf24; }
  .alert-info { background: #dbeafe; border-left: 3px solid #60a5fa; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .health-bar { background: #e2e8f0; border-radius: 99px; height: 8px; margin-top: 8px; overflow: hidden; }
  .health-fill { height: 100%; border-radius: 99px; background: ${score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'}; width: ${score}%; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">AIOps Monitoring</div>
      <div class="subtitle">AWS EC2 · us-east-1 · t2.micro · Ubuntu 24.04</div>
    </div>
    <div class="timestamp">
      <div style="font-weight:700;font-size:14px;">System Health Report</div>
      <div>Generated: ${now}</div>
    </div>
  </div>

  <div class="section-title">System Health</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Health Score</div>
      <div class="card-value" style="color:${score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'}">${score}/100</div>
      <div class="health-bar"><div class="health-fill"></div></div>
      <div class="card-sub">${score >= 80 ? 'Nominal' : score >= 60 ? 'Degraded' : 'Critical'}</div>
    </div>
    <div class="card">
      <div class="card-label">CPU Usage</div>
      <div class="card-value">${live?.cpu_percent ?? '--'}%</div>
      <div class="card-sub">5-min average</div>
    </div>
    <div class="card">
      <div class="card-label">RAM Usage</div>
      <div class="card-value">${live?.ram_percent ?? '--'}%</div>
      <div class="card-sub">of total RAM</div>
    </div>
    <div class="card">
      <div class="card-label">Disk Usage</div>
      <div class="card-value">${live?.disk_percent ?? '--'}%</div>
      <div class="card-sub">root volume</div>
    </div>
  </div>

  <div class="section-title">Infrastructure</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Network In</div>
      <div class="card-value" style="font-size:18px">${formatBytes(live?.network_in_bytes)}</div>
      <div class="card-sub">bytes/sec</div>
    </div>
    <div class="card">
      <div class="card-label">Network Out</div>
      <div class="card-value" style="font-size:18px">${formatBytes(live?.network_out_bytes)}</div>
      <div class="card-sub">bytes/sec</div>
    </div>
    <div class="card">
      <div class="card-label">Load Average</div>
      <div class="card-value">${live?.load_avg ?? '--'}</div>
      <div class="card-sub">1-min load</div>
    </div>
    <div class="card">
      <div class="card-label">Uptime</div>
      <div class="card-value" style="font-size:18px">${formatUptime(live?.uptime_seconds)}</div>
      <div class="card-sub">since boot</div>
    </div>
  </div>

  <div class="section-title">Extended Metrics</div>
  <div class="grid">
    <div class="card">
      <div class="card-label">Disk Read</div>
      <div class="card-value" style="font-size:18px">${formatBytes(extended?.disk_io?.read_bytes_sec)}</div>
      <div class="card-sub">bytes/sec</div>
    </div>
    <div class="card">
      <div class="card-label">Disk Write</div>
      <div class="card-value" style="font-size:18px">${formatBytes(extended?.disk_io?.write_bytes_sec)}</div>
      <div class="card-sub">bytes/sec</div>
    </div>
    <div class="card">
      <div class="card-label">TCP Established</div>
      <div class="card-value">${extended?.tcp?.established ?? '--'}</div>
      <div class="card-sub">connections</div>
    </div>
    <div class="card">
      <div class="card-label">TCP Time Wait</div>
      <div class="card-value">${extended?.tcp?.time_wait ?? '--'}</div>
      <div class="card-sub">sockets</div>
    </div>
  </div>

  <div class="section-title">AI Anomaly Detection</div>
  <div class="grid-3">
    <div class="card">
      <div class="card-label">Status</div>
      <div style="margin-top:8px"><span class="badge ${anomaly?.is_anomaly ? 'badge-crit' : 'badge-ok'}">${anomaly?.is_anomaly ? 'ANOMALY DETECTED' : 'Normal'}</span></div>
    </div>
    <div class="card">
      <div class="card-label">Confidence</div>
      <div class="card-value">${anomaly?.confidence ?? '--'}%</div>
      <div class="card-sub">model certainty</div>
    </div>
    <div class="card">
      <div class="card-label">Algorithm</div>
      <div class="card-value" style="font-size:16px">Isolation Forest</div>
      <div class="card-sub">scikit-learn</div>
    </div>
  </div>
  ${anomaly?.recommendation ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-left:3px solid #8b5cf6;border-radius:10px;padding:14px 18px;margin-bottom:24px;font-size:13px;color:#4c1d95;"><strong>AI Recommendation:</strong> ${anomaly.recommendation}</div>` : ''}

  <div class="section-title">Active Alerts</div>
  ${alerts.map(a => `<div class="alert-row alert-${a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info'}"><span class="badge badge-${a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info'}">${a.severity.toUpperCase()}</span><span style="font-size:13px">${a.message}</span><span style="margin-left:auto;font-size:11px;color:#64748b">${new Date(a.timestamp).toLocaleTimeString()}</span></div>`).join('')}

  <div class="footer">
    <div>AIOps Monitoring System · Prometheus + Node Exporter + Isolation Forest + Claude AI</div>
    <div>${now}</div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print(); setExporting(false) }, 500)
  }

  const exportScreenshot = async () => {
    setExporting(true)
    try {
      const { default: html2canvas } = await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')
      const canvas = await html2canvas(document.body, { backgroundColor: '#0a0a12', scale: 1.5, useCORS: true, logging: false })
      const link = document.createElement('a')
      link.download = `aiops-dashboard-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('Screenshot export failed. Try the PDF report instead.')
    }
    setExporting(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={exportScreenshot} disabled={exporting} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 14px', fontSize: 11, color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Outfit', transition: 'all 0.2s' }}>
        <Download size={12} /> {exporting ? '...' : 'Screenshot'}
      </button>
      <button onClick={exportPDFReport} disabled={exporting} style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}30`, borderRadius: 10, padding: '7px 14px', fontSize: 11, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Outfit', fontWeight: 600, transition: 'all 0.2s' }}>
        <FileText size={12} /> {exporting ? '...' : 'PDF Report'}
      </button>
    </div>
  )
}

/* ─── Pages ─── */
function Overview({ live, history, loading }) {
  const score = healthScore(live), sc = score >= 80 ? C.success : score >= 60 ? C.warning : C.danger
  return (<div>
    <SectionLabel>Key Metrics</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="CPU" value={live ? `${live.cpu_percent}%` : null} sub="5-min average" icon={Cpu} color={C.primary} trend={live?.cpu_percent} sparkData={history?.cpu} loading={loading} />
      <MetricCard label="Memory" value={live ? `${live.ram_percent}%` : null} sub="of total RAM" icon={MemoryStick} color={C.info} trend={live?.ram_percent} sparkData={history?.ram} loading={loading} delay={50} />
      <MetricCard label="Disk" value={live ? `${live.disk_percent}%` : null} sub="root volume" icon={HardDrive} color={C.warning} trend={live?.disk_percent} loading={loading} delay={100} />
      <MetricCard label="Health" value={live ? `${score}/100` : null} sub="overall system" icon={Heart} color={sc} trend={score} loading={loading} delay={150} />
    </div>
    <SectionLabel>Infrastructure</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 26 }}>
      <MetricCard label="Net In" value={live ? formatBytes(live.network_in_bytes) : null} sub="bytes/sec" icon={ArrowDownToLine} color={C.success} loading={loading} />
      <MetricCard label="Net Out" value={live ? formatBytes(live.network_out_bytes) : null} sub="bytes/sec" icon={ArrowUpFromLine} color={C.info} loading={loading} delay={50} />
      <MetricCard label="Load Avg" value={live?.load_avg ?? null} sub="1-min" icon={Activity} color={C.warning} loading={loading} delay={100} />
      <MetricCard label="Uptime" value={live ? formatUptime(live.uptime_seconds) : null} sub="since boot" icon={Clock} color={C.primary} loading={loading} delay={150} />
    </div>
    <SectionLabel>Time Series</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <BigChart data={history?.cpu} color={C.primary} title="CPU Usage" unit="%" />
      <BigChart data={history?.ram} color={C.info} title="Memory Usage" unit="%" delay={60} />
      <BigChart data={history?.network_in} color={C.success} title="Network In" delay={120} />
      <BigChart data={history?.disk} color={C.warning} title="Disk Usage" unit="%" delay={180} />
    </div>
  </div>)
}

function CPUPage({ live, history, loading }) {
  return (<div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
    <MetricCard label="CPU" value={live ? `${live.cpu_percent}%` : null} sub="5-min average" icon={Cpu} color={C.primary} trend={live?.cpu_percent} sparkData={history?.cpu} loading={loading} />
    <MetricCard label="Load Avg" value={live?.load_avg ?? null} sub="1-min" icon={Activity} color={C.warning} loading={loading} delay={50} />
    <MetricCard label="Status" value={live ? (live.cpu_percent > 80 ? 'High' : 'Normal') : null} sub="threshold: 80%" icon={live?.cpu_percent > 80 ? AlertTriangle : CheckCircle} color={live?.cpu_percent > 80 ? C.danger : C.success} loading={loading} delay={100} />
  </div><BigChart data={history?.cpu} color={C.primary} title="CPU Usage — Last Hour" unit="%" /></div>)
}

function MemoryPage({ live, history, loading }) {
  return (<div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
    <MetricCard label="RAM Used" value={live ? `${live.ram_percent}%` : null} sub="of total" icon={MemoryStick} color={C.info} trend={live?.ram_percent} sparkData={history?.ram} loading={loading} />
    <MetricCard label="RAM Free" value={live ? `${(100 - live.ram_percent).toFixed(1)}%` : null} sub="available" icon={CheckCircle} color={C.success} loading={loading} delay={50} />
    <MetricCard label="Status" value={live ? (live.ram_percent > 85 ? 'Critical' : 'Normal') : null} sub="threshold: 85%" icon={live?.ram_percent > 85 ? XCircle : CheckCircle} color={live?.ram_percent > 85 ? C.danger : C.success} loading={loading} delay={100} />
  </div><BigChart data={history?.ram} color={C.info} title="Memory Usage — Last Hour" unit="%" /></div>)
}

function NetworkPage({ live, history, extended, loading }) {
  return (<div>
    <SectionLabel>Throughput</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="Network In" value={live ? formatBytes(live.network_in_bytes) : null} sub="bytes/sec" icon={ArrowDownToLine} color={C.success} loading={loading} />
      <MetricCard label="Network Out" value={live ? formatBytes(live.network_out_bytes) : null} sub="bytes/sec" icon={ArrowUpFromLine} color={C.primary} loading={loading} delay={50} />
    </div>
    <SectionLabel>Errors & Drops</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="Errors In" value={extended ? `${extended.network_errors.errors_in}` : null} sub="errors/sec inbound" icon={XCircle} color={C.danger} loading={loading} />
      <MetricCard label="Errors Out" value={extended ? `${extended.network_errors.errors_out}` : null} sub="errors/sec outbound" icon={XCircle} color={C.danger} loading={loading} delay={50} />
      <MetricCard label="Drops In" value={extended ? `${extended.network_errors.drops_in}` : null} sub="dropped inbound" icon={AlertTriangle} color={C.warning} loading={loading} delay={100} />
      <MetricCard label="Drops Out" value={extended ? `${extended.network_errors.drops_out}` : null} sub="dropped outbound" icon={AlertTriangle} color={C.warning} loading={loading} delay={150} />
    </div>
    <SectionLabel>TCP Connections</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="Established" value={extended ? `${extended.tcp.established}` : null} sub="active connections" icon={Activity} color={C.success} loading={loading} />
      <MetricCard label="Time Wait" value={extended ? `${extended.tcp.time_wait}` : null} sub="closing connections" icon={Clock} color={C.warning} loading={loading} delay={50} />
      <MetricCard label="Total Sockets" value={extended ? `${extended.tcp.total_sockets}` : null} sub="sockets in use" icon={Wifi} color={C.info} loading={loading} delay={100} />
    </div>
    <BigChart data={history?.network_in} color={C.success} title="Network In — Last Hour" />
  </div>)
}

function DiskPage({ live, history, extended, loading }) {
  return (<div>
    <SectionLabel>Disk Space</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="Disk Used" value={live ? `${live.disk_percent}%` : null} sub="root fs" icon={HardDrive} color={C.warning} trend={live?.disk_percent} loading={loading} />
      <MetricCard label="Disk Free" value={live ? `${(100 - live.disk_percent).toFixed(1)}%` : null} sub="available" icon={CheckCircle} color={C.success} loading={loading} delay={50} />
      <MetricCard label="Status" value={live ? (live.disk_percent > 90 ? 'Critical' : 'Normal') : null} sub="threshold: 90%" icon={live?.disk_percent > 90 ? XCircle : CheckCircle} color={live?.disk_percent > 90 ? C.danger : C.success} loading={loading} delay={100} />
    </div>
    <SectionLabel>Disk I/O</SectionLabel>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
      <MetricCard label="Read Speed" value={extended ? formatBytes(extended.disk_io.read_bytes_sec) : null} sub="bytes/sec" icon={ArrowDownToLine} color={C.info} loading={loading} />
      <MetricCard label="Write Speed" value={extended ? formatBytes(extended.disk_io.write_bytes_sec) : null} sub="bytes/sec" icon={ArrowUpFromLine} color={C.primary} loading={loading} delay={50} />
      <MetricCard label="Read IOPS" value={extended ? `${extended.disk_io.read_ops_sec.toFixed(1)}` : null} sub="ops/sec" icon={Activity} color={C.success} loading={loading} delay={100} />
      <MetricCard label="Write IOPS" value={extended ? `${extended.disk_io.write_ops_sec.toFixed(1)}` : null} sub="ops/sec" icon={Zap} color={C.warning} loading={loading} delay={150} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <BigChart data={history?.disk} color={C.warning} title="Disk Usage — Last Hour" unit="%" />
      <BigChart data={extended?.history?.disk_read} color={C.info} title="Disk Read — Last Hour" delay={60} />
    </div>
  </div>)
}

function ProcessesPage({ processes }) {
  return (
    <div className="glass-card fade-up" style={{ padding: '22px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.primary}12`, border: `1px solid ${C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Terminal size={15} color={C.primary} /></div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Top Processes by CPU</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['PID', 'User', 'CPU %', 'MEM %', 'Process'].map(h => (<th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>))}</tr></thead>
        <tbody>{processes.map((p, i) => (
          <tr key={i} className="table-row" style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '11px 12px', color: C.textMuted, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{p.pid}</td>
            <td style={{ padding: '11px 12px', color: C.textDim, fontSize: 12, fontWeight: 500 }}>{p.user}</td>
            <td style={{ padding: '11px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: parseFloat(p.cpu) > 10 ? C.danger : parseFloat(p.cpu) > 5 ? C.warning : C.success, background: parseFloat(p.cpu) > 10 ? C.dangerDim : parseFloat(p.cpu) > 5 ? C.warningDim : C.successDim, padding: '2px 7px', borderRadius: 99 }}>{p.cpu}%</span></td>
            <td style={{ padding: '11px 12px', fontSize: 12, fontWeight: 600, color: C.info, fontFamily: 'JetBrains Mono, monospace' }}>{p.mem}%</td>
            <td style={{ padding: '11px 12px', color: C.textDim, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function AlertsPage({ alerts }) {
  const cfg = { critical: { color: C.danger, dim: C.dangerDim, icon: XCircle }, warning: { color: C.warning, dim: C.warningDim, icon: AlertTriangle }, info: { color: C.info, dim: C.infoDim, icon: CheckCircle } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {alerts.length === 0 && (<div className="glass-card fade-up" style={{ padding: 40, textAlign: 'center' }}><CheckCircle size={36} color={C.success} style={{ marginBottom: 10 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>All Clear</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>No active alerts</div></div>)}
      {alerts.map((a, i) => { const c = cfg[a.severity] || cfg.info; const Icon = c.icon; return (
        <div key={i} className="fade-up" style={{ background: c.dim, border: `1px solid ${c.color}20`, borderLeft: `3px solid ${c.color}`, borderRadius: 14, padding: '16px 20px', animationDelay: `${i * 40}ms` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={14} color={c.color} /><span style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: 1 }}>{a.severity} — {a.metric}</span></div>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
          </div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{a.message}</div>
          {a.value > 0 && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,255,255,0.04)', display: 'inline-block', padding: '2px 8px', borderRadius: 99 }}>current: {a.value}%</div>}
        </div>
      )})}
    </div>
  )
}

function AIPage({ anomaly }) {
  if (!anomaly) return (<div className="glass-card fade-up" style={{ padding: 40, textAlign: 'center' }}><Bot size={36} color={C.textFaint} style={{ marginBottom: 10 }} /><div style={{ fontSize: 15, fontWeight: 600 }}>Loading AI Analysis...</div></div>)
  const isAnomaly = anomaly.is_anomaly, c = isAnomaly ? C.danger : C.success, StatusIcon = isAnomaly ? XCircle : CheckCircle
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <MetricCard label="AI Status" value={isAnomaly ? 'Anomaly' : 'Normal'} sub="Isolation Forest" icon={StatusIcon} color={c} />
        <MetricCard label="Confidence" value={`${anomaly.confidence}%`} sub="model certainty" icon={Bot} color={C.primary} trend={anomaly.confidence} delay={50} />
        <MetricCard label="Algorithm" value="IsoForest" sub="scikit-learn v1.4" icon={Database} color={C.info} delay={100} />
      </div>
      <div className="glass-card fade-up" style={{ padding: '20px 24px', borderLeft: `3px solid ${c}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Bot size={14} color={c} /><span style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: 'uppercase', letterSpacing: 1 }}>AI Recommendation</span></div>
        <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.8 }}>{anomaly.recommendation}</div>
      </div>
      <div className="glass-card fade-up" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Input Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {Object.entries(anomaly.metrics).map(([k, v]) => (<div key={k} style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}15`, borderRadius: 14, padding: 14, textAlign: 'center' }}><div style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, fontWeight: 600 }}>{k}</div><div className="metric-num" style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>{typeof v === 'number' ? v.toFixed(1) : v}</div></div>))}
        </div>
      </div>
      <div className="glass-card fade-up" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Confidence Meter</div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 8 }}><div style={{ width: `${anomaly.confidence}%`, height: '100%', background: `linear-gradient(90deg, ${c}80, ${c})`, borderRadius: 99, transition: 'width 1.5s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 10px ${c}30` }} /></div>
        <div style={{ fontSize: 12, color: C.textMuted }}><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: c }}>{anomaly.confidence}%</span> — {isAnomaly ? 'anomalous behavior detected' : 'system operating normally'}</div>
      </div>
    </div>
  )
}

function ActionsPage() {
  const [log, setLog] = useState([]), [loading, setLoading] = useState(null), logEndRef = useRef(null)
  const addLog = (msg, color = C.textMuted) => setLog(l => [...l, { msg, color, time: new Date().toLocaleTimeString() }])
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log])
  const run = async (name, fn) => { setLoading(name); addLog(`▶ ${name}`, C.warning); try { await fn(); addLog(`✓ ${name} completed`, C.success) } catch (e) { addLog(`✗ ${name}: ${e.message}`, C.danger) } setLoading(null) }
  const actions = [
    { name: 'Trigger CPU Spike', desc: 'stress --cpu 4 --timeout 300s', color: C.danger, icon: Zap, fn: async () => { await axios.get(`${API}/api/action/stress`) } },
    { name: 'Trigger Memory Spike', desc: 'allocate 800MB — persists until freed', color: C.warning, icon: MemoryStick, fn: async () => { await axios.get(`${API}/api/action/memory-spike`) } },
    { name: 'Free Memory', desc: 'release all allocated memory', color: C.success, icon: CheckCircle, fn: async () => { await axios.get(`${API}/api/action/free-memory`) } },
    { name: 'Trigger App Errors', desc: 'fire 20 HTTP 500 errors', color: C.danger, icon: XCircle, fn: async () => { await axios.get(`${API}/api/action/trigger-errors`) } },
    { name: 'Trigger Slow Response', desc: 'simulate 3s response time × 3', color: C.warning, icon: Clock, fn: async () => { await axios.get(`${API}/api/action/slow-response`) } },
    { name: 'Restart Flask App', desc: 'restart monitored_app on port 5001', color: C.info, icon: RefreshCw, fn: async () => { await axios.get(`${API}/api/action/restart-app`) } },
    { name: 'Clear System Logs', desc: 'journalctl --vacuum-size=50M', color: C.info, icon: Trash2, fn: async () => { await axios.get(`${API}/api/action/clear-logs`) } },
    { name: 'Generate CPU Load', desc: 'calculate primes × 10 requests', color: C.primary, icon: Cpu, fn: async () => { await axios.get(`${API}/api/action/cpu-load`) } },
    { name: 'Check App Status', desc: 'GET /stats — error rate, response time', color: C.success, icon: Activity, fn: async () => { const r = await axios.get(`${API}/api/action/app-status`); addLog(JSON.stringify(r.data), C.info) } },
    { name: '🔥 Full System Stress', desc: 'CPU + Memory + Disk I/O + App errors — all at once', color: '#ff4444', icon: Zap, fn: async () => { const r = await axios.get(`${API}/api/action/full-stress`); addLog(`Stressing: ${r.data.targets.join(', ')}`, C.warning) } },
{ name: '⛔ Stop All Stress', desc: 'kill stress, free memory, clean up everything', color: C.success, icon: CheckCircle, fn: async () => { await axios.get(`${API}/api/action/full-stress-stop`) } },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Remote Actions</SectionLabel>
        {actions.map((a, i) => { const Icon = a.icon; return (
          <div key={a.name} className="glass-card fade-up" style={{ padding: '16px 20px', borderLeft: `3px solid ${a.color}`, animationDelay: `${i * 40}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}12`, border: `1px solid ${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={a.color} /></div>
                <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.name}</div><div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{a.desc}</div></div>
              </div>
              <button className="action-btn" onClick={() => run(a.name, a.fn)} disabled={!!loading} style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}bb)`, border: 'none', color: '#fff', padding: '7px 18px', borderRadius: 99, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Outfit', opacity: loading ? 0.4 : 1 }}>{loading === a.name ? '...' : 'Run'}</button>
            </div>
          </div>
        )})}
      </div>
      <div>
        <SectionLabel>Action Log</SectionLabel>
        <div className="glass-card fade-up" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Terminal size={14} color={C.textMuted} /><span style={{ fontSize: 13, fontWeight: 600 }}>Console</span></div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 440, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
            {log.length === 0 && <div style={{ color: C.textFaint }}>$ waiting for commands...</div>}
            {log.map((l, i) => (<div key={i} style={{ color: l.color, lineHeight: 1.6 }}><span style={{ color: C.textFaint }}>[{l.time}]</span> {l.msg}</div>))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AIChatPage({ live, anomaly }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hi! I'm your AIOps AI assistant. I can see your live server metrics. Ask me anything about server health, performance, or recommended actions." }])
  const [input, setInput] = useState(''), [loading, setLoading] = useState(false), bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const send = async () => {
    if (!input.trim() || loading) return; const msg = input.trim(); setInput(''); setMessages(m => [...m, { role: 'user', content: msg }]); setLoading(true)
    const sys = `You are an expert DevOps AI assistant monitoring an AWS EC2 t2.micro Ubuntu 24.04 server. Live metrics: CPU ${live?.cpu_percent}%, RAM ${live?.ram_percent}%, Disk ${live?.disk_percent}%, Load avg ${live?.load_avg}, Uptime ${live ? formatUptime(live.uptime_seconds) : 'unknown'}, Network in ${formatBytes(live?.network_in_bytes)}. AI anomaly detection: ${anomaly?.is_anomaly ? 'ANOMALY DETECTED' : 'Normal'} at ${anomaly?.confidence}% confidence. AI recommendation: ${anomaly?.recommendation}. Be concise, technical, practical.`
    try { const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, system: sys, messages: [{ role: 'user', content: msg }] }) }); const data = await res.json(); setMessages(m => [...m, { role: 'assistant', content: data.content?.[0]?.text || 'No response.' }]) } catch { setMessages(m => [...m, { role: 'assistant', content: 'Connection error.' }]) }
    setLoading(false)
  }
  const suggestions = ['How is my server?', 'RAM concerns?', 'CPU spike cause?', 'Recommendations?']
  return (
    <div className="glass-card fade-up" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 170px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${C.primaryGlow}` }}><Bot size={18} color="#fff" /></div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>AI Chat Assistant</div><div style={{ fontSize: 11, color: C.textMuted }}>Powered by Claude · Live metrics</div></div>
        <LiveDot size={6} /><span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>Online</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'assistant' && <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.primary}15`, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={14} color={C.primary} /></div>}
            <div style={{ maxWidth: '72%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})` : 'rgba(255,255,255,0.04)', color: m.role === 'user' ? '#fff' : C.textDim, fontSize: 13, lineHeight: 1.7, border: m.role === 'user' ? 'none' : `1px solid ${C.border}`, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {loading && (<div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}><div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.primary}15`, border: `1px solid ${C.primary}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} color={C.primary} /></div><div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>{[0, 1, 2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: C.textFaint, animation: `pulse-glow 1.2s ${j * 0.2}s infinite` }} />)}</div></div>)}
        <div ref={bottomRef} />
      </div>
      {messages.length === 1 && (<div style={{ padding: '0 22px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>{suggestions.map(s => (<button key={s} onClick={() => setInput(s)} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.textDim, padding: '6px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer', fontWeight: 500, fontFamily: 'Outfit', transition: 'all 0.15s' }}>{s}</button>))}</div>)}
      <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about your server..." className="chat-input" style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 16px', color: C.text, fontSize: 13, transition: 'all 0.2s', fontFamily: 'Outfit' }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})`, border: 'none', borderRadius: 12, padding: '11px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 6, opacity: !input.trim() ? 0.4 : 1, transition: 'all 0.2s' }}><MessageSquare size={15} /> Send</button>
      </div>
    </div>
  )
}

const NAV_SECTIONS = [
  { label: 'Dashboard', items: [{ id: 'overview', icon: LayoutDashboard, label: 'Overview' }] },
  { label: 'Monitoring', items: [{ id: 'cpu', icon: Cpu, label: 'CPU' }, { id: 'memory', icon: MemoryStick, label: 'Memory' }, { id: 'network', icon: Wifi, label: 'Network' }, { id: 'disk', icon: HardDrive, label: 'Disk' }, { id: 'processes', icon: Terminal, label: 'Processes' }] },
  { label: 'Intelligence', items: [{ id: 'alerts', icon: Bell, label: 'Alerts' }, { id: 'ai', icon: Bot, label: 'AI Anomaly' }, { id: 'chat', icon: MessageSquare, label: 'AI Chat' }] },
  { label: 'Operations', items: [{ id: 'actions', icon: Zap, label: 'Actions' }] }
]

export default function App() {
  const [page, setPage] = useState('overview'), [live, setLive] = useState(null), [history, setHistory] = useState(null)
  const [processes, setProcesses] = useState([]), [alerts, setAlerts] = useState([]), [anomaly, setAnomaly] = useState(null)
  const [extended, setExtended] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(''), [loading, setLoading] = useState(true), [collapsed, setCollapsed] = useState(false)
  const fetch_ = async (url, set) => { try { const r = await axios.get(url); set(r.data) } catch { } }
  useEffect(() => {
    const go = async () => {
      await fetch_(`${API}/api/metrics/live`, d => { setLive(d); setLastUpdate(new Date().toLocaleTimeString()); setLoading(false) })
      fetch_(`${API}/api/processes`, setProcesses)
      fetch_(`${API}/api/alerts`, setAlerts)
      fetch_(`${API}/api/anomaly`, setAnomaly)
      fetch_(`${API}/api/metrics/extended`, setExtended)
    }
    go()
    fetch_(`${API}/api/metrics/history`, setHistory)
    const t1 = setInterval(go, 15000), t2 = setInterval(() => fetch_(`${API}/api/metrics/history`, setHistory), 60000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])
  const score = healthScore(live), sc = score >= 80 ? C.success : score >= 60 ? C.warning : C.danger
  const alertCount = alerts.filter(a => a.severity !== 'info').length, sideW = collapsed ? 64 : 240
  const pages = {
    overview: <Overview live={live} history={history} loading={loading} />,
    cpu: <CPUPage live={live} history={history} loading={loading} />,
    memory: <MemoryPage live={live} history={history} loading={loading} />,
    network: <NetworkPage live={live} history={history} extended={extended} loading={loading} />,
    disk: <DiskPage live={live} history={history} extended={extended} loading={loading} />,
    processes: <ProcessesPage processes={processes} />,
    alerts: <AlertsPage alerts={alerts} />,
    ai: <AIPage anomaly={anomaly} />,
    actions: <ActionsPage />,
    chat: <AIChatPage live={live} anomaly={anomaly} />
  }

  return (
    <><style>{styles}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg, position: 'relative' }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: '50%', top: -100, transform: 'translateX(-50%)', width: 900, height: 400, background: 'linear-gradient(135deg, rgba(139,92,246,0.12), transparent)', borderRadius: '50%', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', right: -100, bottom: -50, width: 500, height: 300, background: 'linear-gradient(225deg, rgba(236,72,153,0.08), transparent)', borderRadius: '50%', filter: 'blur(60px)' }} />
        </div>
        <div style={{ width: sideW, flexShrink: 0, background: C.sidebarBg, backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden', position: 'relative', zIndex: 2, borderRight: `1px solid ${C.border}` }}>
          <div style={{ padding: collapsed ? '20px 0' : '20px 18px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 68 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${C.primaryGlow}` }}><Shield size={16} color="#fff" /></div>
            {!collapsed && <div style={{ animation: 'slide-in 0.2s ease' }}><div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>AIOps</div><div style={{ fontSize: 9, color: C.textFaint, letterSpacing: 2, textTransform: 'uppercase' }}>Monitoring</div></div>}
          </div>
          {!collapsed && (<div style={{ margin: '0 12px 18px', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14 }}>
            <div style={{ fontSize: 9, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>Health</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 8 }}><span className="metric-num" style={{ fontSize: 30, fontWeight: 900, color: sc }}>{score}</span><span style={{ fontSize: 12, color: C.textFaint }}>/100</span></div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden', marginBottom: 6 }}><div style={{ width: `${score}%`, height: '100%', background: `linear-gradient(90deg, ${sc}80, ${sc})`, borderRadius: 99, transition: 'width 1.5s ease', boxShadow: `0 0 8px ${sc}30` }} /></div>
            <div style={{ fontSize: 10, color: C.textFaint }}>{score >= 80 ? '✓ Nominal' : score >= 60 ? '⚠ Degraded' : '✗ Critical'}</div>
          </div>)}
          {collapsed && (<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><div style={{ width: 36, height: 36, borderRadius: '50%', background: `${sc}12`, border: `2px solid ${sc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: sc }}>{score}</div></div>)}
          <div style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '0 6px' : '0 8px' }}>
            {NAV_SECTIONS.map((sec, si) => (<div key={si} style={{ marginBottom: 14 }}>
              {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 2, padding: '0 12px', marginBottom: 4 }}>{sec.label}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sec.items.map(n => { const Icon = n.icon, isA = page === n.id; return (
                  <button key={n.id} className={`nav-btn ${isA ? 'active' : ''}`} onClick={() => setPage(n.id)} title={collapsed ? n.label : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '9px 0' : '9px 12px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 10, border: 'none', background: isA ? 'rgba(139,92,246,0.1)' : 'transparent', color: isA ? C.primary : C.textMuted, fontSize: 13, fontWeight: isA ? 600 : 400, cursor: 'pointer', fontFamily: 'Outfit', whiteSpace: 'nowrap' }}>
                    <Icon size={16} strokeWidth={isA ? 2 : 1.5} />
                    {!collapsed && n.label}
                    {!collapsed && n.id === 'alerts' && alertCount > 0 && <span style={{ marginLeft: 'auto', background: C.danger, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center' }}>{alertCount}</span>}
                  </button>
                )})}
              </div>
            </div>))}
          </div>
          <div style={{ padding: collapsed ? '12px 6px' : '12px 16px', borderTop: `1px solid ${C.border}` }}>
            {!collapsed && <><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><LiveDot size={5} /><span style={{ color: C.success, fontWeight: 600, fontSize: 10 }}>Live</span><span style={{ marginLeft: 'auto', color: C.textFaint, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{lastUpdate}</span></div><div style={{ color: C.textFaint, fontSize: 9 }}>EC2 · us-east-1 · t2.micro</div></>}
            <button onClick={() => setCollapsed(!collapsed)} style={{ marginTop: collapsed ? 0 : 8, width: '100%', padding: '6px 0', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', color: C.textFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}</button>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{ padding: '14px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, background: 'rgba(10,10,18,0.6)', backdropFilter: 'blur(12px)' }}>
            <div><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{NAV_SECTIONS.flatMap(s => s.items).find(n => n.id === page)?.label}</h1><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>aiops-server · <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{live?.ip || '18.206.169.98'}</span> · Ubuntu 24.04</div></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ExportButton live={live} extended={extended} anomaly={anomaly} alerts={alerts} />
              <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 14px', fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} color={C.textFaint} /> {lastUpdate || '...'}</div>
              <div style={{ background: C.successDim, border: `1px solid ${C.success}25`, borderRadius: 10, padding: '7px 14px', fontSize: 11, color: C.success, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><LiveDot size={5} /> Connected</div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>{pages[page]}</div>
        </div>
      </div>
    </>
  )
}