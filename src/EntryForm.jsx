import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from './supabase'

/* ── Responsive columns ───────────────────────────────────────── */
function useColumns() {
  const get = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800
    if (w < 380)  return 1
    if (w < 600)  return 2
    if (w < 820)  return 3
    if (w < 1050) return 4
    return 5
  }
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const fn = () => setCols(get())
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return cols
}

/* ── Window width ─────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 800)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

/* ── Moods ────────────────────────────────────────────────────── */
const MOODS = [
  { key:'euphoric', label:'AWESOME',  polarity:'good', intensity:10, emoji:':D'  },
  { key:'great',    label:'GREAT',    polarity:'good', intensity:8,  emoji:':D'  },
  { key:'good',     label:'GOOD',     polarity:'good', intensity:6,  emoji:':)'  },
  { key:'decent',   label:'DECENT',   polarity:'good', intensity:4,  emoji:':|'  },
  { key:'fine',     label:'FINE',     polarity:'good', intensity:2,  emoji:':|'  },
  { key:'meh',      label:'MEH',      polarity:'bad',  intensity:2,  emoji:':/'  },
  { key:'off',      label:'OFF',      polarity:'bad',  intensity:4,  emoji:':/'  },
  { key:'down',     label:'DOWN',     polarity:'bad',  intensity:6,  emoji:':('  },
  { key:'bad',      label:'BAD',      polarity:'bad',  intensity:8,  emoji:'>:(' },
  { key:'awful',    label:'AWFUL',    polarity:'bad',  intensity:10, emoji:'X('  },
]
const GOOD_MOODS = MOODS.filter(m => m.polarity === 'good')
const BAD_MOODS  = MOODS.filter(m => m.polarity === 'bad')

function moodFromEntry(entry) {
  const list = MOODS.filter(m => m.polarity === entry.polarity)
  if (!list.length) return MOODS[0]
  return list.reduce((best, m) =>
    Math.abs(m.intensity - entry.intensity) < Math.abs(best.intensity - entry.intensity) ? m : best
  )
}

/* ── Colors ───────────────────────────────────────────────────── */
// 5 anchor colors per polarity, at intensities 2, 4, 6, 8, 10
// (matching the 10 mood swatches exactly)
const BAD_ANCHORS = [
  [245, 184, 110],  // 2  MEH   — peach
  [224, 140,  16],  // 4  OFF   — orange
  [190,  90,   8],  // 6  DOWN  — burnt orange
  [158,  60,  20],  // 8  BAD   — rust/brown-red
  [105,   8,   8],  // 10 AWFUL — dark maroon
]
const GOOD_ANCHORS = [
  [200, 228, 105],  // 2  FINE    — light yellow-green
  [140, 192,  60],  // 4  DECENT  — yellow-green
  [ 66, 160,  28],  // 6  GOOD    — medium green
  [ 30, 112,  20],  // 8  GREAT   — dark green
  [ 10,  58,  10],  // 10 EUPHORIC — very dark green
]

function tileColor(polarity, intensity) {
  const anchors = polarity === 'good' ? GOOD_ANCHORS : BAD_ANCHORS
  // Map intensity 1-10 onto the 5 anchors (at 2,4,6,8,10)
  const pos  = Math.max(0, Math.min(4, (Math.max(1, intensity) - 2) / 2))
  const idx  = Math.min(3, Math.floor(pos))
  const frac = pos - idx
  if (pos <= 0) return `rgb(${anchors[0]})`
  if (pos >= 4) return `rgb(${anchors[4]})`
  const [r1,g1,b1] = anchors[idx]
  const [r2,g2,b2] = anchors[idx + 1]
  return `rgb(${Math.round(r1+(r2-r1)*frac)},${Math.round(g1+(g2-g1)*frac)},${Math.round(b1+(b2-b1)*frac)})`
}

function wcagTextColor(rgbString) {
  const [r, g, b] = rgbString.match(/\d+/g).map(Number)
  const lin = c => { const v = c/255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) }
  const L = 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
  return L > 0.179 ? '#000000' : '#ffffff'
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }).toUpperCase()
    + '\n' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
}

function formatDateLong(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }).toUpperCase()
    + '  ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
}

/* ── Theme ────────────────────────────────────────────────────── */
const DARK_BG    = '#111111'
const CONTENT_BG = '#ffffff'
const BORDER     = '3px solid #111'
const BORDER_W   = '1px solid rgba(255,255,255,0.18)'
const MONO       = "'Space Mono', 'Courier New', monospace"
const PIXEL      = "'VT323', monospace"
const TILE_GAP   = 16
const TILE_PAD   = 10
const ML = { fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', margin:'0 0 6px', color:'#444' }

/* ── Mood row (shared between modals) ────────────────────────── */
function MoodRow({ moods, selected, onSelect, isMobile = false }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${moods.length},1fr)`, gap:4 }}>
      {moods.map(m => {
        const bg = tileColor(m.polarity, m.intensity)
        const tc = wcagTextColor(bg)
        const sel = selected?.key === m.key
        return (
          <button key={m.key} onClick={() => onSelect(m)}
            style={{
              background:bg,
              border: sel ? '2.5px solid #fff' : '2.5px solid transparent',
              outline: sel ? '2px solid #111' : 'none',
              padding: isMobile ? '14px 2px 11px' : '9px 4px 7px',
              cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              fontFamily:'inherit',
              transition:'outline 0.1s',
            }}>
            <span style={{ fontSize: isMobile ? 24 : 20, color:tc, lineHeight:1, fontFamily:PIXEL }}>{m.emoji}</span>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.06em', color:tc, textTransform:'uppercase', fontFamily:MONO }}>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── New Entry Modal ─────────────────────────────────────────── */
function NewEntryModal({ onSave, onClose }) {
  const [note, setNote]     = useState('')
  const [mood, setMood]     = useState(null)
  const [notes, setNotes]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const canSave = note.trim() && mood
  const isMobile = useWindowWidth() < 480

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setSaveErr(null)
    const err = await onSave({ note:note.trim(), polarity:mood.polarity, intensity:mood.intensity, notes:notes.trim()||null })
    if (err) setSaveErr(err.message)
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:200, padding: isMobile ? 0 : 16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', width:'100%', maxWidth: isMobile ? '100%' : 480, fontFamily:MONO, overflow:'hidden', maxHeight:'92vh', overflowY:'auto', border:BORDER, boxShadow: isMobile ? 'none' : '8px 8px 0 #111' }}>

        {/* Dark header */}
        <div style={{ background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', position:'sticky', top:0, zIndex:1, borderBottom:BORDER }}>
          <span style={{ color:'#111', fontWeight:900, fontSize:15, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:MONO }}>NEW ENTRY</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#111', fontSize:18, cursor:'pointer', padding:'2px 4px', fontFamily:MONO, lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding: isMobile ? '16px' : '20px', display:'flex', flexDirection:'column', gap: isMobile ? 14 : 16, paddingBottom: isMobile ? 'max(20px, env(safe-area-inset-bottom))' : '20px' }}>
          {/* Note */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <p style={ML}>WHAT'S UP?</p>
              <span style={{ fontSize:10, color: note.length > 45 ? '#c00' : '#aaa', fontFamily:MONO, fontWeight:700 }}>{note.length}/50</span>
            </div>
            <input type="text" value={note} onChange={e=>setNote(e.target.value.slice(0,50))}
              placeholder="describe your mood..."
              autoFocus={!isMobile}
              maxLength={50}
              style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:13, fontFamily:MONO, outline:'none', background:'#fff', boxSizing:'border-box' }} />
          </div>

          {/* Mood selector */}
          <div>
            <p style={ML}>HOW ARE YOU FEELING?</p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#666', letterSpacing:'0.05em', marginBottom:2 }}>▲ GOOD</div>
              <MoodRow moods={GOOD_MOODS} selected={mood} onSelect={setMood} isMobile={isMobile} />
              <div style={{ fontSize:10, fontWeight:700, color:'#666', letterSpacing:'0.05em', marginTop:4, marginBottom:2 }}>▼ BAD</div>
              <MoodRow moods={BAD_MOODS} selected={mood} onSelect={setMood} isMobile={isMobile} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <p style={ML}>NOTES (OPTIONAL)</p>
              <span style={{ fontSize:10, color: notes.length > 45 ? '#c00' : '#aaa', fontFamily:MONO, fontWeight:700 }}>{notes.length}/50</span>
            </div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value.slice(0,50))}
              placeholder="anything else..."
              rows={2}
              maxLength={50}
              style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:13, fontFamily:MONO, resize:'none', outline:'none', background:'#fff', boxSizing:'border-box' }} />
          </div>

          {/* Actions */}
          {saveErr && (
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#c00', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:MONO }}>{saveErr}</p>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button onClick={onClose}
              style={{ padding: isMobile ? '15px 0' : '13px 0', border:BORDER, background:'#fff', color:'#111', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:MONO }}>
              CANCEL
            </button>
            <button onClick={handleSave} disabled={!canSave||saving}
              style={{ padding: isMobile ? '15px 0' : '13px 0', border:BORDER, background:canSave?'#111':'#ccc', color:canSave?'#fff':'#999', fontSize:12, fontWeight:900, cursor:canSave?'pointer':'default', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:MONO }}>
              {saving ? 'SAVING…' : 'ADD ENTRY'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Tile Detail / Edit Modal ────────────────────────────────── */
function TileDetailModal({ entry, onEdit, onDelete, onClose }) {
  const [editing, setEditing]     = useState(false)
  const [editNote, setEditNote]   = useState(entry.note)
  const [editMood, setEditMood]   = useState(moodFromEntry(entry))
  const [editNotes, setEditNotes] = useState(entry.notes || '')
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const isMobile = useWindowWidth() < 480

  const startEdit = () => {
    setEditNote(entry.note)
    setEditMood(moodFromEntry(entry))
    setEditNotes(entry.notes || '')
    setSaveErr(null)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!editNote.trim()) return
    setSaving(true)
    setSaveErr(null)
    const err = await onEdit(entry.id, { note:editNote.trim(), polarity:editMood.polarity, intensity:editMood.intensity, notes:editNotes.trim()||null })
    if (err) setSaveErr(err.message)
    else setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this entry?')) return
    const err = await onDelete(entry.id)
    if (err) setSaveErr(err.message)
  }

  const mood    = moodFromEntry(entry)
  const dispMood = editing ? editMood : mood
  const headerBg = tileColor(dispMood.polarity, dispMood.intensity)
  const headerTc = wcagTextColor(headerBg)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:200, padding: isMobile ? 0 : 16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#fff', width:'100%', maxWidth: isMobile ? '100%' : 480, fontFamily:MONO, overflow:'hidden', maxHeight:'92vh', overflowY:'auto', border:BORDER, boxShadow: isMobile ? 'none' : '8px 8px 0 #111' }}>

        {/* Colored header — updates live when selecting mood */}
        <div style={{ background:headerBg, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', transition:'background 0.15s', position:'sticky', top:0, zIndex:1 }}>
          <span style={{ color:headerTc, fontWeight:900, fontSize:14, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            {dispMood.emoji}  {dispMood.polarity.toUpperCase()}
          </span>
          <button onClick={onClose}
            style={{ background:'none', border:`1.5px solid ${headerTc === '#ffffff' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'}`, color:headerTc, fontSize:13, cursor:'pointer', padding:'3px 9px', fontFamily:'inherit', fontWeight:700, lineHeight:1 }}>
            ✕
          </button>
        </div>

        {!editing ? (
          /* ── View mode ── */
          <div style={{ padding:'22px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ margin:0, fontSize:17, fontWeight:900, lineHeight:1.35, letterSpacing:'-0.01em' }}>{entry.note}</p>
            {entry.notes && <p style={{ margin:0, fontSize:13, color:'#555', lineHeight:1.45 }}>{entry.notes}</p>}
            <p style={{ margin:0, fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:700 }}>{formatDateLong(entry.created_at)}</p>
            <div style={{ borderTop:BORDER }} />
            {saveErr && (
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#c00', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:MONO }}>{saveErr}</p>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={startEdit}
                style={{ padding:'12px 0', border:BORDER, background:'#fff', color:'#111', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:MONO, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <WrenchIcon /> EDIT
              </button>
              <button onClick={handleDelete}
                style={{ padding:'12px 0', border:BORDER, background:'#111', color:'#fff', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:MONO, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                <TrashIcon color='#fff' /> DELETE
              </button>
            </div>
          </div>
        ) : (
          /* ── Edit mode ── */
          <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <p style={ML}>TITLE</p>
                <span style={{ fontSize:10, color: editNote.length > 45 ? '#c00' : '#aaa', fontFamily:MONO, fontWeight:700 }}>{editNote.length}/50</span>
              </div>
              <input type="text" value={editNote} onChange={e=>setEditNote(e.target.value.slice(0,50))}
                maxLength={50}
                style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff', boxSizing:'border-box' }} />
            </div>

            <div>
              <p style={ML}>MOOD</p>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <MoodRow moods={GOOD_MOODS} selected={editMood} onSelect={setEditMood} isMobile={isMobile} />
                <MoodRow moods={BAD_MOODS}  selected={editMood} onSelect={setEditMood} isMobile={isMobile} />
              </div>
            </div>

            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <p style={ML}>NOTES</p>
                <span style={{ fontSize:10, color: editNotes.length > 45 ? '#c00' : '#aaa', fontFamily:MONO, fontWeight:700 }}>{editNotes.length}/50</span>
              </div>
              <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value.slice(0,50))} rows={2}
                maxLength={50}
                style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', background:'#fff', boxSizing:'border-box' }} />
            </div>

            {saveErr && (
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#c00', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:MONO }}>{saveErr}</p>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={() => { setEditing(false); setSaveErr(null) }}
                style={{ padding:'12px 0', border:BORDER, background:'#fff', color:'#111', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:MONO }}>
                CANCEL
              </button>
              <button onClick={handleSave} disabled={saving||!editNote.trim()}
                style={{ padding:'12px 0', border:BORDER, background:'#111', color:'#fff', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:MONO }}>
                {saving ? 'SAVING…' : '✓  SAVE'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Action icons ────────────────────────────────────────────── */
function WrenchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display:'block', flexShrink:0 }}>
      {/* handle */}
      <path d="M2 13 L4 15 L12 6 L10 4 Z" fill="#111"/>
      {/* open-end head */}
      <path d="M10 0 L16 0 L16 3 L13 3 L13 5 L16 5 L16 8 L10 8 Z" fill="#111"/>
    </svg>
  )
}

function TrashIcon({ color = '#111' }) {
  const slot = color === '#fff' ? '#111' : 'white'
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ display:'block', flexShrink:0 }}>
      <rect x="6" y="0" width="4" height="2" fill={color}/>
      <rect x="1" y="2" width="14" height="3" fill={color}/>
      <path d="M2 6 L14 6 L13 15 L3 15 Z" fill={color}/>
      <rect x="5.5" y="7.5" width="1.5" height="6" fill={slot}/>
      <rect x="9" y="7.5" width="1.5" height="6" fill={slot}/>
    </svg>
  )
}

/* ── Sort icons ──────────────────────────────────────────────── */
function SortIcon({ type, color = '#111' }) {
  if (type === 'time') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ display:'block', flexShrink:0 }}>
        <circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="2.2"/>
        <line x1="8" y1="8" x2="8" y2="3.5" stroke={color} strokeWidth="2" strokeLinecap="square"/>
        <line x1="8" y1="8" x2="11.5" y2="8" stroke={color} strokeWidth="2" strokeLinecap="square"/>
      </svg>
    )
  }
  return <span style={{ fontSize:17, lineHeight:'15px', color, display:'block', fontWeight:700 }}>{type === 'up' ? '↑' : '↓'}</span>
}

/* ── Sort selector ───────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value:'time',  label:'TIME'       },
  { value:'up',    label:'INCREASING' },
  { value:'down',  label:'DECREASING' },
]

function SortSelector({ value, onChange, isMobile = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = SORT_OPTIONS.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position:'relative', display:'flex', alignItems:'stretch' }}>
      <button onClick={() => setOpen(!open)}
        style={{ display:'flex', alignItems:'center', gap: isMobile ? 0 : 8, padding: isMobile ? '0 12px' : '0 14px', background:'none', border:'none', cursor:'pointer', fontFamily:MONO, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#111', whiteSpace:'nowrap' }}>
        <SortIcon type={value} color='#111' />
        {!isMobile && <span>{current.label}</span>}
        <span style={{ fontSize:18, marginLeft:2, lineHeight:1, paddingBottom:4, display:'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', right:0, background:'#fff', border:BORDER, zIndex:200, minWidth:'100%' }}>
          {SORT_OPTIONS.map(opt => {
            const sel = value === opt.value
            return (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background: sel ? '#111' : '#fff', color: sel ? '#fff' : '#111', border:'none', borderBottom:BORDER, width:'100%', cursor:'pointer', fontFamily:MONO, fontSize:12, fontWeight:700, whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.06em', boxSizing:'border-box' }}>
                <SortIcon type={opt.value} color={sel ? '#fff' : '#111'} />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Dot matrix background ───────────────────────────────────── */
function DotMatrix({ mouseRef }) {
  const canvasRef = useRef()
  const rafRef    = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let w = 0, h = 0, dots = []
    const SPACING = 24, R = 1.5, REACH = 100

    const build = () => {
      w = canvas.width  = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
      dots = []
      for (let x = SPACING / 2; x < w; x += SPACING)
        for (let y = SPACING / 2; y < h; y += SPACING)
          dots.push({ x, y, phase: Math.random() * Math.PI * 2 })
    }

    const tick = (t) => {
      ctx.clearRect(0, 0, w, h)
      const { x: mx, y: my } = mouseRef.current
      dots.forEach(d => {
        const dist  = Math.hypot(d.x - mx, d.y - my)
        const pull  = Math.max(0, 1 - dist / REACH)
        const pulse = Math.sin(t * 0.0008 + d.phase) * 0.5 + 0.5
        const alpha = 0.07 + pulse * 0.05 + pull * 0.28
        const r     = R + pull * 1.8
        ctx.beginPath()
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(17,17,17,${alpha.toFixed(3)})`
        ctx.fill()
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(build)
    ro.observe(canvas)
    build()
    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [])

  return (
    <canvas ref={canvasRef}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', display:'block' }} />
  )
}

/* ── Visualized view ─────────────────────────────────────────── */
function VisualizedView({ entries, onSelectEntry }) {
  const [filter, setFilter]   = useState('good')
  const [sort, setSort]       = useState('time')
  const [hovered, setHovered] = useState(null)
  const mousePos = useRef({ x: -9999, y: -9999 })
  const cols = useColumns()
  const w = useWindowWidth()
  const isNarrow = w < 640   // tab bar collapses
  const isMobile = w < 480   // header / modals collapse

  const displayed = useMemo(() => {
    let arr = [...entries]
    if (filter === 'good') arr = arr.filter(e => e.polarity === 'good')
    if (filter === 'bad')  arr = arr.filter(e => e.polarity === 'bad')
    if (sort === 'up')   arr.sort((a,b) => a.intensity - b.intensity)
    if (sort === 'down') arr.sort((a,b) => b.intensity - a.intensity)
    return arr
  }, [entries, filter, sort])

  const tabs = [
    { key:'good', label: isNarrow ? 'GOOD' : `GOOD (${entries.filter(e=>e.polarity==='good').length})` },
    { key:'bad',  label: isNarrow ? 'BAD'  : `BAD (${entries.filter(e=>e.polarity==='bad').length})` },
  ]

  const moodCounts = useMemo(() =>
    MOODS.map(m => ({ ...m, count: entries.filter(e => moodFromEntry(e).key === m.key).length }))
  , [entries])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'calc(100vh - 54px)', position:'relative' }}
      onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); mousePos.current = { x: e.clientX - r.left, y: e.clientY - r.top } }}
      onMouseLeave={() => { mousePos.current = { x: -9999, y: -9999 } }}
      onTouchMove={e => { const r = e.currentTarget.getBoundingClientRect(); const t = e.touches[0]; mousePos.current = { x: t.clientX - r.left, y: t.clientY - r.top } }}
    >
      <DotMatrix mouseRef={mousePos} />

      {/* Tab + sort bar — two separate floating pieces */}
      <div style={{ padding:`${TILE_PAD}px ${TILE_PAD}px 0`, display:'flex', alignItems:'stretch', justifyContent:'space-between', position:'relative', zIndex:1 }}>
        {/* Left: tabs */}
        <div style={{ background:'#fff', display:'flex', border:BORDER }}>
          {tabs.map((tab, i) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{
                padding: isNarrow ? '10px 12px' : '12px 18px',
                border:'none', borderRight: i < tabs.length - 1 ? BORDER : 'none',
                background: filter===tab.key ? '#111' : '#fff',
                color: filter===tab.key ? '#fff' : '#111',
                fontSize:12, fontWeight:700, cursor:'pointer',
                textTransform:'uppercase', letterSpacing:'0.08em',
                whiteSpace:'nowrap', fontFamily:MONO,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        {/* Right: sort */}
        <div style={{ background:'#fff', display:'flex', alignItems:'stretch', border:BORDER }}>
          <div style={{ display:'flex', alignItems:'center', padding:'0 14px', fontSize:12, fontWeight:700, letterSpacing:'0.08em', color:'#111', textTransform:'uppercase', whiteSpace:'nowrap', fontFamily:MONO }}>
            SORT BY:
          </div>
          <SortSelector value={sort} onChange={setSort} isMobile={isNarrow} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, padding:TILE_PAD }}>
        {displayed.length === 0 ? (
          <p style={{ textAlign:'center', padding:'3rem 0', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:13, color:'#888' }}>
            NO ENTRIES YET
          </p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(cols, displayed.length)}, minmax(0, 1fr))`, gap:TILE_GAP }}>
            {displayed.map(entry => {
              const mood  = moodFromEntry(entry)
              const bg    = tileColor(entry.polarity, entry.intensity)
              const tc    = wcagTextColor(bg)
              const isHov = hovered === entry.id
              const dim   = tc === '#000000'
              const dateLines = formatDate(entry.created_at).split('\n')
              return (
                <div key={entry.id}
                  onClick={() => onSelectEntry(entry)}
                  onMouseEnter={() => setHovered(entry.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    aspectRatio:'1',
                    background:bg,
                    border:'2px solid #111',
                    display:'flex', flexDirection:'column',
                    padding:14, cursor:'pointer',
                    position:'relative', zIndex: isHov ? 1 : 0,
                    transition:'box-shadow 0.1s ease, transform 0.1s ease',
                    transform: isHov ? 'translate(-1px,-1px)' : 'translate(0,0)',
                    boxShadow: isHov ? '7px 7px 0 #111' : '5px 5px 0 #111',
                    overflow:'hidden',
                    boxSizing:'border-box',
                  }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:14, color:tc, lineHeight:1.4, wordBreak:'break-word', display:'block', fontWeight:500, fontFamily:MONO }}>
                      {entry.note?.length > 50 ? entry.note.slice(0,50)+'…' : entry.note}
                    </span>
                    {entry.notes && (
                      <span style={{ fontSize:12, color: dim ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)', lineHeight:1.4, display:'block', marginTop:5, wordBreak:'break-word', fontFamily:MONO }}>
                        {entry.notes.length > 50 ? entry.notes.slice(0,50)+'…' : entry.notes}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0, marginTop:8 }}>
                    <div style={{ fontSize:10, color: dim ? '#000' : '#fff', lineHeight:1.5, fontWeight:400, fontFamily:MONO }}>
                      {dateLines[0]}<br/>{dateLines[1]}
                    </div>
                    <span style={{ fontSize:22, color:tc, lineHeight:1, fontFamily:PIXEL }}>
                      {mood.emoji}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom legend */}
      <div style={{ background:'#fff', padding:'8px 14px', display:'flex', flexWrap:'wrap', gap:'5px 14px', borderTop:BORDER, position:'sticky', bottom:0, zIndex:10 }}>
        {moodCounts.map(m => (
          <div key={m.key} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:9, height:9, background:tileColor(m.polarity, m.intensity), border:'1px solid rgba(0,0,0,0.2)', flexShrink:0 }} />
            <span style={{ fontSize:10, color:'#666', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:700 }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Analytics view ──────────────────────────────────────────── */
function AnalyticsView({ entries }) {
  const BORDER_A = '2px solid #ddd'
  if (entries.length === 0) {
    return <p style={{ textAlign:'center', padding:'3rem 0', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:13, color:'#999', background:CONTENT_BG, minHeight:'calc(100vh - 54px)' }}>NO ENTRIES YET</p>
  }

  const good    = entries.filter(e => e.polarity === 'good')
  const bad     = entries.filter(e => e.polarity === 'bad')
  const avgGood = good.length ? Math.round(good.reduce((a,e) => a+e.intensity, 0)/good.length) : 0
  const avgBad  = bad.length  ? Math.round(bad.reduce((a,e)  => a+e.intensity, 0)/bad.length)  : 0
  const goodPct = Math.round(good.length / entries.length * 100)
  const sTitle  = { fontSize:12, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', margin:0, padding:'12px 16px', borderBottom:BORDER_A, color:'#333' }

  return (
    <div style={{ background:'#f5f2ed', minHeight:'calc(100vh - 54px)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:BORDER_A }}>
        {[
          { label:'GOOD', value:good.length, sub:`AVG MOOD: ${avgGood}/10`, color:tileColor('good',7) },
          { label:'BAD',  value:bad.length,  sub:`AVG MOOD: ${avgBad}/10`,  color:tileColor('bad',7)  },
        ].map((c,i) => (
          <div key={c.label} style={{ padding:'20px 16px', borderRight: i===0 ? BORDER_A : 'none', background:'#fff' }}>
            <p style={{ fontSize:12, fontWeight:900, color:'#888', margin:'0 0 6px', letterSpacing:'0.08em' }}>{c.label} ENTRIES</p>
            <p style={{ fontSize:48, fontWeight:900, margin:'0 0 4px', lineHeight:1 }}>{c.value}</p>
            <p style={{ fontSize:12, color:'#888', margin:0, letterSpacing:'0.05em' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ borderBottom:BORDER_A, background:'#fff' }}>
        <p style={sTitle}>MOOD SPLIT</p>
        <div style={{ display:'flex', height:32, margin:'12px 16px 16px', border:'2px solid #ddd' }}>
          {good.length>0 && <div style={{ flex:good.length, background:tileColor('good',7), display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:12, fontWeight:900, color:'#fff' }}>{goodPct}%</span></div>}
          {bad.length >0 && <div style={{ flex:bad.length,  background:tileColor('bad',7),  display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:12, fontWeight:900, color:'#fff' }}>{100-goodPct}%</span></div>}
        </div>
      </div>

      <div style={{ borderBottom:BORDER_A, background:'#fff' }}>
        <p style={sTitle}>MOOD BREAKDOWN</p>
        <div style={{ padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
          {MOODS.map(m => {
            const count = entries.filter(e => moodFromEntry(e).key === m.key).length
            return (
              <div key={m.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:10, height:10, background:tileColor(m.polarity, m.intensity), flexShrink:0, border:'1px solid #ddd' }} />
                <span style={{ fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', color:'#444', minWidth:70 }}>{m.label}</span>
                <div style={{ flex:1, height:14, background:'#f0ece4', position:'relative', border:'1px solid #ddd' }}>
                  {count>0 && <div style={{ width:`${count/entries.length*100}%`, height:'100%', background:tileColor(m.polarity, m.intensity) }} />}
                </div>
                <span style={{ fontSize:12, fontWeight:900, color:'#333', minWidth:20, textAlign:'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background:'#fff' }}>
        <p style={sTitle}>ALL ENTRIES</p>
        {entries.map(e => {
          const m = moodFromEntry(e)
          return (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:BORDER_A }}>
              <div style={{ width:8, height:8, background:tileColor(e.polarity, e.intensity), flexShrink:0 }} />
              <span style={{ fontSize:12, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.note}</span>
              <span style={{ fontSize:10, fontWeight:900, letterSpacing:'0.06em', flexShrink:0, color:'#555' }}>{m.label}</span>
              <span style={{ fontSize:10, color:'#aaa', flexShrink:0 }}>{formatDate(e.created_at).replace('\n',' ')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function EntryForm({ user }) {
  const [entries, setEntries]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [view, setView]                 = useState('home')
  const [menuOpen, setMenuOpen]         = useState(false)
  const menuRef = useRef()
  const isMobile = useWindowWidth() < 480

  useEffect(() => {
    supabase.from('entries').select('*').order('created_at', { ascending:false })
      .then(({ data, error }) => { if (!error) setEntries(data); setLoading(false) })
  }, [])

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAdd = async ({ note, polarity, intensity, notes }) => {
    const payload = { note, polarity, intensity, user_id: user.id }
    if (notes) payload.notes = notes
    const { error } = await supabase.from('entries').insert(payload)
    if (error) { console.error('Add failed:', error); return error }
    // Refetch so we get the server-generated id + created_at
    const { data } = await supabase.from('entries').select('*').order('created_at', { ascending: false })
    if (data) setEntries(data)
    setShowAdd(false)
    return null
  }

  const handleEdit = async (id, updates) => {
    const payload = { note: updates.note, polarity: updates.polarity, intensity: updates.intensity }
    if (updates.notes) payload.notes = updates.notes
    const { error } = await supabase.from('entries').update(payload).eq('id', id)
    if (error) { console.error('Edit failed:', error); return error }
    const updated = { ...entries.find(e => e.id === id), ...payload }
    setEntries(entries.map(e => e.id === id ? updated : e))
    setSelectedEntry(updated)
    return null
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) { console.error('Delete failed:', error); return error }
    setEntries(entries.filter(e => e.id!==id))
    setSelectedEntry(null)
    return null
  }

  return (
    <div style={{ minHeight:'100vh', background:CONTENT_BG, fontFamily:MONO }}>

      {/* Header */}
      <div style={{ background:'#fff', display:'flex', alignItems:'center', padding:`0 ${isMobile ? 12 : 16}px`, borderBottom:BORDER, gap: isMobile ? 8 : 12 }}>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap: isMobile ? 8 : 12, padding:'14px 0' }}>
          <h1 style={{ margin:0, fontSize: isMobile ? 28 : 36, fontWeight:400, letterSpacing:'0.1em', textTransform:'uppercase', color:'#111', fontFamily:PIXEL, lineHeight:1 }}>MOODY</h1>
          {!isMobile && (
            <span style={{ fontSize:12, color:'#999', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:MONO }}>
              {loading ? '…' : `${entries.length} ENTRIES`}
            </span>
          )}
        </div>

        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:7, padding: isMobile ? '8px 12px' : '8px 14px', border:BORDER, background:'#111', color:'#fff', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:'inherit', flexShrink:0 }}>
          <span style={{ fontSize:18, lineHeight:1, fontWeight:400 }}>+</span>
          {!isMobile && <span style={{ fontWeight:500 }}>NEW ENTRY</span>}
        </button>

        <div ref={menuRef} style={{ position:'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:6, padding:'8px 10px', width:44, height:44 }}>
            <div style={{ width:26, height:3, background:'#111' }} />
            <div style={{ width:26, height:3, background:'#111' }} />
            <div style={{ width:26, height:3, background:'#111' }} />
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', border:BORDER, minWidth:180, zIndex:300 }}>
              {[{label:'HOME',view:'home'},{label:'ANALYTICS',view:'analytics'}].map(item => (
                <button key={item.view} onClick={() => { setView(item.view); setMenuOpen(false) }}
                  style={{ display:'block', width:'100%', padding:'13px 16px', border:'none', borderBottom:BORDER, background:view===item.view?'#111':'#fff', color:view===item.view?'#fff':'#111', textAlign:'left', fontSize:12, fontWeight:900, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase', fontFamily:'inherit' }}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => supabase.auth.signOut()}
                style={{ display:'block', width:'100%', padding:'13px 16px', border:'none', background:'#fff', color:'#111', textAlign:'left', fontSize:12, fontWeight:900, letterSpacing:'0.08em', cursor:'pointer', textTransform:'uppercase', fontFamily:'inherit' }}>
                LOGOUT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ textAlign:'center', padding:'4rem 0', textTransform:'uppercase', letterSpacing:'0.1em', fontSize:13, color:'#999' }}>LOADING…</p>
      ) : view === 'home' ? (
        <VisualizedView entries={entries} onSelectEntry={setSelectedEntry} />
      ) : (
        <AnalyticsView entries={entries} />
      )}

      {showAdd && <NewEntryModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {selectedEntry && (
        <TileDetailModal
          entry={selectedEntry}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}
