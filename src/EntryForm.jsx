import { useState, useRef, useMemo } from "react";

const INTENSITY_DESCS = [
  "", "Barely noticeable", "Very mild", "Mild", "Noticeable",
  "Moderate", "Significant", "Strong", "Very strong", "Intense", "Extreme",
];

const SEED_ENTRIES = [
  { note: "Great workout this morning", polarity: "good", intensity: 8, id: 1 },
  { note: "Missed my train", polarity: "bad", intensity: 4, id: 2 },
  { note: "Finished the big project", polarity: "good", intensity: 9, id: 3 },
  { note: "Argument with a friend", polarity: "bad", intensity: 7, id: 4 },
  { note: "Really nice lunch", polarity: "good", intensity: 5, id: 5 },
  { note: "Bad headache all day", polarity: "bad", intensity: 6, id: 6 },
  { note: "Got a compliment at work", polarity: "good", intensity: 6, id: 7 },
  { note: "Productive deep work session", polarity: "good", intensity: 7, id: 8 },
  { note: "Spilled coffee on my laptop", polarity: "bad", intensity: 8, id: 9 },
  { note: "Beautiful sunset walk", polarity: "good", intensity: 4, id: 10 },
];

/** Maps intensity 1–10 + polarity to a hex color */
function intensityColor(polarity, intensity) {
  const t = (intensity - 1) / 9;
  if (polarity === "good") {
    const r = Math.round(193 + (23 - 193) * t);
    const g = Math.round(220 + (92 - 220) * t);
    const b = Math.round(148 + (8 - 148) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const r = Math.round(247 + (107 - 247) * t);
    const g = Math.round(193 + (31 - 193) * t);
    const b = Math.round(193 + (31 - 193) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function textColorForIntensity(intensity) {
  return intensity >= 5 ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.6)";
}

/* ── Entry form modal ─────────────────────────────────────── */
function EntryModal({ onSave, onClose }) {
  const [note, setNote] = useState("");
  const [imgSrc, setImgSrc] = useState(null);
  const [polarity, setPolarity] = useState(null);
  const [intensity, setIntensity] = useState(5);
  const fileRef = useRef();

  const accentColor = polarity === "bad" ? "#E24B4A" : "#639922";

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!note.trim() && !imgSrc) return;
    if (!polarity) return;
    onSave({ note: note.trim() || "(image)", polarity, intensity, id: Date.now() });
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.sheet}>
        <div style={s.sheetHeader}>
          <span style={s.sheetTitle}>New entry</span>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={s.field}>
          <p style={s.label}>What happened?</p>
          <textarea style={s.textarea} placeholder="Write a note…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus />
        </div>

        <div style={s.field}>
          <p style={s.label}>Attach an image</p>
          {imgSrc ? (
            <div style={{ position: "relative" }}>
              <img src={imgSrc} alt="Attached" style={s.imgPreview} />
              <button style={s.removeImg} onClick={() => { setImgSrc(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Remove">✕</button>
            </div>
          ) : (
            <div style={s.uploadArea} onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize: 20 }}>🖼</span>
              <span style={{ fontSize: 13 }}>Tap to add image</span>
            </div>
          )}
          <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleImage} />
        </div>

        <div style={s.field}>
          <p style={s.label}>Rating</p>
          <div style={s.toggleRow}>
            <button style={{ ...s.toggleBtn, ...(polarity === "good" ? s.activeGood : {}) }} onClick={() => setPolarity("good")}>😊 Good</button>
            <button style={{ ...s.toggleBtn, ...(polarity === "bad" ? s.activeBad : {}) }} onClick={() => setPolarity("bad")}>😔 Bad</button>
          </div>
        </div>

        {polarity && (
          <div style={s.field}>
            <p style={s.label}>Intensity</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: accentColor }}>{intensity}</span>
              <span style={{ fontSize: 13, color: "#888" }}>{INTENSITY_DESCS[intensity]}</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor }} />
            <div style={s.sliderLabels}><span>1 — mild</span><span>10 — extreme</span></div>
          </div>
        )}

        <button
          style={{ ...s.submitBtn, background: polarity ? accentColor : "#ccc", cursor: polarity ? "pointer" : "default" }}
          onClick={handleSave}
        >
          Save entry
        </button>
      </div>
    </div>
  );
}

/* ── Visualized grid view ─────────────────────────────────── */
function VisualizedView({ entries }) {
  const [sort, setSort] = useState("time");
  const [hovered, setHovered] = useState(null);

  const sorted = useMemo(() => {
    const arr = [...entries];
    if (sort === "good-first") return arr.sort((a, b) => (a.polarity === b.polarity ? b.intensity - a.intensity : a.polarity === "good" ? -1 : 1));
    if (sort === "bad-first") return arr.sort((a, b) => (a.polarity === b.polarity ? b.intensity - a.intensity : a.polarity === "bad" ? -1 : 1));
    return arr; // time (default — newest first as stored)
  }, [entries, sort]);

  if (entries.length === 0) {
    return <p style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "2rem 0" }}>No entries yet — add one to see your grid.</p>;
  }

  const sortOptions = [
    { key: "time", label: "Time" },
    { key: "good-first", label: "Good → Bad" },
    { key: "bad-first", label: "Bad → Good" },
  ];

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {sortOptions.map((o) => (
          <button
            key={o.key}
            style={{
              ...s.sortBtn,
              ...(sort === o.key ? s.sortBtnActive : {}),
            }}
            onClick={() => setSort(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {sorted.map((entry) => {
          const bg = intensityColor(entry.polarity, entry.intensity);
          const textColor = textColorForIntensity(entry.intensity);
          const isHovered = hovered === entry.id;
          return (
            <div
              key={entry.id}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                background: bg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                cursor: "default",
                transition: "transform 0.1s, box-shadow 0.1s",
                transform: isHovered ? "scale(1.06)" : "scale(1)",
                boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={() => setHovered(entry.id)}
              onMouseLeave={() => setHovered(null)}
              title={`${entry.polarity === "good" ? "↑" : "↓"} ${entry.note} (${entry.intensity}/10)`}
            >
              <span style={{ fontSize: 11, color: textColor, opacity: 0.75 }}>
                {entry.polarity === "good" ? "↑" : "↓"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 500, color: textColor, lineHeight: 1 }}>
                {entry.intensity}
              </span>
              {isHovered && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  borderRadius: 10,
                }}>
                  <span style={{ fontSize: 10, color: "#fff", textAlign: "center", lineHeight: 1.3 }}>
                    {entry.note.length > 30 ? entry.note.slice(0, 28) + "…" : entry.note}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center" }}>
        {[
          { label: "Good", from: intensityColor("good", 1), to: intensityColor("good", 10) },
          { label: "Bad", from: intensityColor("bad", 1), to: intensityColor("bad", 10) },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888" }}>
            <div style={{ width: 40, height: 10, borderRadius: 4, background: `linear-gradient(to right, ${l.from}, ${l.to})` }} />
            <span>{l.label} (1→10)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analytics view ───────────────────────────────────────── */
function AnalyticsView({ entries }) {
  if (entries.length === 0) {
    return <p style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "2rem 0" }}>No entries yet — add one to see your analytics.</p>;
  }

  const good = entries.filter((e) => e.polarity === "good");
  const bad = entries.filter((e) => e.polarity === "bad");
  const avgGood = good.length ? Math.round(good.reduce((a, e) => a + e.intensity, 0) / good.length) : 0;
  const avgBad = bad.length ? Math.round(bad.reduce((a, e) => a + e.intensity, 0) / bad.length) : 0;
  const goodPct = Math.round((good.length / entries.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Good entries", value: good.length, sub: `avg intensity ${avgGood}`, color: "#3B6D11", bg: "#EAF3DE" },
          { label: "Bad entries", value: bad.length, sub: `avg intensity ${avgBad}`, color: "#A32D2D", bg: "#FCEBEB" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: c.color, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</p>
            <p style={{ fontSize: 28, fontWeight: 500, color: c.color, margin: "0 0 2px" }}>{c.value}</p>
            <p style={{ fontSize: 12, color: c.color, opacity: 0.8, margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={s.vizCard}>
        <p style={s.vizTitle}>Intensity timeline</p>
        {entries.map((e, i) => (
          <div key={e.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#aaa", minWidth: 18, textAlign: "right" }}>#{entries.length - i}</span>
            <div style={{ flex: 1, background: e.polarity === "good" ? "#EAF3DE" : "#FCEBEB", borderRadius: 4, overflow: "hidden", height: 20, position: "relative" }}>
              <div style={{ width: `${e.intensity / 10 * 100}%`, height: "100%", background: e.polarity === "good" ? "#639922" : "#E24B4A", borderRadius: 4 }} />
              <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 500, color: e.polarity === "good" ? "#3B6D11" : "#A32D2D" }}>{e.intensity}</span>
            </div>
            <span style={{ fontSize: 11, color: "#aaa", minWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.note}</span>
          </div>
        ))}
      </div>

      <div style={s.vizCard}>
        <p style={s.vizTitle}>Good vs bad split</p>
        <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
          {good.length > 0 && <div style={{ flex: good.length, background: "#639922", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>{goodPct}%</span></div>}
          {bad.length > 0 && <div style={{ flex: bad.length, background: "#E24B4A", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>{100 - goodPct}%</span></div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888" }}>
          <span style={{ color: "#3B6D11" }}>● Good</span>
          <span style={{ color: "#A32D2D" }}>● Bad</span>
        </div>
      </div>

      <div style={s.vizCard}>
        <p style={s.vizTitle}>All entries</p>
        {entries.map((e, i) => (
          <div key={e.id ?? i} style={s.entryItem}>
            <span style={{ ...s.badge, ...(e.polarity === "good" ? s.badgeGood : s.badgeBad) }}>{e.polarity === "good" ? "↑" : "↓"} {e.polarity}</span>
            <span style={s.entryText}>{e.note}</span>
            <span style={s.entryIntensity}>{e.intensity}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main app ─────────────────────────────────────────────── */
export default function EntryForm() {
  const [entries, setEntries] = useState(SEED_ENTRIES);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState("visualized");

  const handleSave = (entry) => {
    setEntries([entry, ...entries]);
    setShowModal(false);
  };

  return (
    <div style={s.frame}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.appTitle}>My Journal</h1>
          <p style={s.appSub}>{entries.length} entries logged</p>
        </div>
        <button style={s.addBtn} onClick={() => setShowModal(true)}>+ Add entry</button>
      </div>

      {/* Navigation */}
      <div style={s.navRow}>
        {[
          { key: "visualized", label: "Visualized" },
          { key: "analytics", label: "Analytics" },
        ].map((tab) => (
          <button
            key={tab.key}
            style={{ ...s.navTab, ...(view === tab.key ? s.navTabActive : {}) }}
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View */}
      {view === "visualized" ? (
        <VisualizedView entries={entries} />
      ) : (
        <AnalyticsView entries={entries} />
      )}

      {/* Modal */}
      {showModal && <EntryModal onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────── */
const s = {
  frame: { maxWidth: 420, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  appTitle: { fontSize: 22, fontWeight: 500, margin: 0, color: "#111" },
  appSub: { fontSize: 13, color: "#888", margin: "2px 0 0" },
  addBtn: { background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  navRow: { display: "flex", gap: 4, background: "#f1f1f1", borderRadius: 10, padding: 4, marginBottom: 20 },
  navTab: { flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: "transparent", fontSize: 14, fontWeight: 500, color: "#888", cursor: "pointer" },
  navTabActive: { background: "#fff", color: "#111", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" },
  sortBtn: { padding: "5px 12px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#f5f5f5", fontSize: 12, fontWeight: 500, color: "#666", cursor: "pointer" },
  sortBtnActive: { background: "#111", color: "#fff", borderColor: "#111" },
  vizCard: { background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.1)", padding: "14px 16px" },
  vizTitle: { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" },
  entryItem: { background: "#fafafa", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.08)", padding: "8px 10px", display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  badge: { fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" },
  badgeGood: { background: "#EAF3DE", color: "#3B6D11" },
  badgeBad: { background: "#FCEBEB", color: "#A32D2D" },
  entryText: { fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  entryIntensity: { fontSize: 13, fontWeight: 500, color: "#888", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  sheet: { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflowY: "auto" },
  sheetHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: 500, color: "#111" },
  closeBtn: { background: "#f1f1f1", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#555" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  textarea: { width: "100%", boxSizing: "border-box", resize: "none", fontSize: 15, padding: "10px 12px", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.2)", background: "#f9f9f9", fontFamily: "inherit", color: "#111" },
  uploadArea: { border: "0.5px dashed rgba(0,0,0,0.2)", borderRadius: 8, background: "#f9f9f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 16, cursor: "pointer", color: "#888" },
  imgPreview: { width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 120 },
  removeImg: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12 },
  toggleRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  toggleBtn: { padding: "10px 0", borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.15)", background: "#f9f9f9", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#666" },
  activeGood: { background: "#EAF3DE", borderColor: "#3B6D11", color: "#3B6D11" },
  activeBad: { background: "#FCEBEB", borderColor: "#A32D2D", color: "#A32D2D" },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginTop: 4 },
  submitBtn: { width: "100%", padding: 12, borderRadius: 8, border: "none", fontSize: 15, fontWeight: 500, color: "#fff", marginTop: 4 },
};
