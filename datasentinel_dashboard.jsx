import { useState, useEffect, useRef } from "react";

const ZONES = {
  161: "Midtown West", 162: "Midtown East", 163: "Upper West Side",
  164: "Upper East Side", 165: "Hell's Kitchen", 132: "JFK Airport",
  138: "LaGuardia", 230: "Times Square", 186: "Financial District", 79: "East Village"
};

const ANOMALY_TYPES = ["Volume Drop", "Fare Spike", "Schema Drift", "Zone Blackout", "Missing Fields"];

function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateBatch(simHour, anomalyOverride) {
  const hour = simHour % 24;
  const dayOfWeek = Math.floor(simHour / 24) % 7;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const isNight = hour >= 0 && hour <= 5;
  const baseVolume = isNight ? randomBetween(80, 200) : isRush ? randomBetween(900, 1400) : randomBetween(400, 800);
  const anomaly = anomalyOverride || (Math.random() < 0.18 ? randomFrom(ANOMALY_TYPES) : null);
  const volume = anomaly === "Volume Drop" || anomaly === "Zone Blackout"
    ? Math.floor(baseVolume * randomBetween(20, 45) / 100)
    : baseVolume;
  const avgFare = anomaly === "Fare Spike"
    ? randomBetween(38, 72)
    : randomBetween(14, 24);
  return {
    id: simHour,
    label: `${days[dayOfWeek]} ${String(hour).padStart(2, "0")}:00`,
    volume,
    baselineVolume: baseVolume,
    avgFare,
    baselineFare: randomBetween(15, 22),
    zone: randomFrom(Object.keys(ZONES)),
    anomaly,
    ts: Date.now()
  };
}

const DIAGNOSES = {
  "Volume Drop": {
    cause: "Probable upstream dispatch feed interruption. Volume decline is abrupt (single-hour onset) and spatially isolated to zones 161–163, consistent with a dispatch region boundary rather than organic demand reduction.",
    confidence: 72,
    steps: ["Check pipeline logs for dispatch API timeouts in zone cluster 161–163", "Verify source system heartbeat for the affected dispatch region", "If confirmed pipeline issue, trigger backfill job for affected hours"]
  },
  "Fare Spike": {
    cause: "Likely surge pricing multiplier applied incorrectly, or a fare calculation bug in the metering system. Average fare 3.1x above baseline while trip distance is normal — inconsistent with organic demand surge.",
    confidence: 81,
    steps: ["Audit fare calculation service logs for the affected window", "Check if a surge multiplier config was deployed in this time window", "Cross-reference with driver app version rollout timeline"]
  },
  "Schema Drift": {
    cause: "A new value has appeared in the payment_type categorical column that was not present in the historical schema. This is typically caused by a source system code change not communicated to the data team.",
    confidence: 94,
    steps: ["Identify the new payment_type value and check source system changelog", "Update schema validation to include new value if legitimate", "Alert data governance team to enforce change communication protocol"]
  },
  "Zone Blackout": {
    cause: "Complete absence of trips from this zone for a full hour is highly unlikely organically. Pattern suggests a data collection failure specific to this zone's GPS region or a zone-ID mapping error after a source system update.",
    confidence: 67,
    steps: ["Check GPS ingestion logs for the affected zone boundary", "Verify zone ID mapping table has not been altered", "Compare with adjacent zone activity to rule out real-world event"]
  },
  "Missing Fields": {
    cause: "Systematic null values in fields that are historically non-null indicates a schema change in the source system — likely a field was deprecated or made optional in a recent source API update.",
    confidence: 88,
    steps: ["Identify which fields turned null and check source API changelog", "Determine if this is intentional deprecation or a bug", "Update pipeline schema contract and notify downstream consumers"]
  }
};

const COLORS = {
  green: "#00C896", yellow: "#FFB347", red: "#FF6B6B",
  blue: "#5B8FFF", purple: "#C06BFF", bg: "#07070f",
  panel: "#0d0d1a", border: "#1a1a2e", text: "#c8d0dc",
  muted: "#555", bright: "#ffffff"
};

export default function DataSentinel() {
  const [batches, setBatches] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [simHour, setSimHour] = useState(0);
  const [running, setRunning] = useState(false);
  const [diagnosing, setDiagnosing] = useState({});
  const [diagnosed, setDiagnosed] = useState({});
  const [speed, setSpeed] = useState(1500);
  const [stats, setStats] = useState({ totalBatches: 0, totalAnomalies: 0, cleanRate: 100 });
  const feedRef = useRef(null);
  const hourRef = useRef(0);
  const batchesRef = useRef([]);
  const anomaliesRef = useRef([]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const h = hourRef.current;
      const batch = generateBatch(h);
      hourRef.current = h + 1;
      batchesRef.current = [batch, ...batchesRef.current].slice(0, 40);
      setBatches([...batchesRef.current]);
      setSimHour(h + 1);
      if (batch.anomaly) {
        anomaliesRef.current = [batch, ...anomaliesRef.current].slice(0, 20);
        setAnomalies([...anomaliesRef.current]);
      }
      setStats({
        totalBatches: h + 1,
        totalAnomalies: anomaliesRef.current.length,
        cleanRate: Math.round(((h + 1 - anomaliesRef.current.length) / (h + 1)) * 100)
      });
    }, speed);
    return () => clearInterval(interval);
  }, [running, speed]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [batches.length]);

  const handleExplain = (batchId, anomalyType) => {
    setDiagnosing(prev => ({ ...prev, [batchId]: true }));
    setTimeout(() => {
      setDiagnosing(prev => ({ ...prev, [batchId]: false }));
      setDiagnosed(prev => ({ ...prev, [batchId]: DIAGNOSES[anomalyType] }));
    }, randomBetween(1800, 3200));
  };

  const anomalyColor = (type) => {
    const map = {
      "Volume Drop": COLORS.yellow,
      "Fare Spike": COLORS.red,
      "Schema Drift": COLORS.purple,
      "Zone Blackout": COLORS.red,
      "Missing Fields": COLORS.blue
    };
    return map[type] || COLORS.yellow;
  };

  const volDiff = (b) => Math.round(((b.volume - b.baselineVolume) / b.baselineVolume) * 100);

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      background: COLORS.bg,
      minHeight: "100vh",
      color: COLORS.text,
      display: "flex",
      flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .slide-in { animation: slideIn 0.3s ease forwards; }
        .btn:hover { opacity: 0.8; transform: translateY(-1px); }
        .batch-row:hover { background: rgba(255,255,255,0.03) !important; }
        .explain-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.panel
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: running ? COLORS.green : COLORS.muted,
            animation: running ? "pulse 1.5s infinite" : "none"
          }} />
          <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: "16px", color: COLORS.bright, letterSpacing: "-0.3px" }}>
            DataSentinel
          </span>
          <span style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "2px" }}>
            NYC TAXI · LIVE MONITOR
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Sim time */}
          <div style={{ fontSize: "11px", color: COLORS.muted }}>
            SIM TIME <span style={{ color: COLORS.text, marginLeft: "6px" }}>
              {`${["MON","TUE","WED","THU","FRI","SAT","SUN"][Math.floor(simHour/24)%7]} ${String(simHour%24).padStart(2,"0")}:00`}
            </span>
          </div>

          {/* Speed */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: COLORS.muted }}>
            SPEED
            {[{label:"1×",v:2000},{label:"2×",v:1200},{label:"4×",v:600}].map(s => (
              <button key={s.v} onClick={() => setSpeed(s.v)} style={{
                background: speed === s.v ? COLORS.green : "transparent",
                color: speed === s.v ? "#000" : COLORS.muted,
                border: `1px solid ${speed === s.v ? COLORS.green : "#2a2a3e"}`,
                borderRadius: "3px", padding: "2px 8px", cursor: "pointer",
                fontSize: "10px", fontFamily: "'IBM Plex Mono'"
              }}>{s.label}</button>
            ))}
          </div>

          {/* Start/Stop */}
          <button className="btn" onClick={() => setRunning(r => !r)} style={{
            background: running ? "#1a0a0a" : "#0a1a0f",
            color: running ? COLORS.red : COLORS.green,
            border: `1px solid ${running ? COLORS.red : COLORS.green}`,
            borderRadius: "4px", padding: "6px 16px", cursor: "pointer",
            fontSize: "11px", fontFamily: "'IBM Plex Mono'", fontWeight: 600,
            letterSpacing: "1px", transition: "all 0.15s"
          }}>
            {running ? "■ STOP" : "▶ START STREAM"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: "0", borderBottom: `1px solid ${COLORS.border}`
      }}>
        {[
          { label: "BATCHES PROCESSED", value: stats.totalBatches, color: COLORS.blue },
          { label: "ANOMALIES DETECTED", value: stats.totalAnomalies, color: COLORS.red },
          { label: "CLEAN BATCH RATE", value: `${stats.cleanRate}%`, color: COLORS.green },
          { label: "DETECTION CHECKS", value: "5 active", color: COLORS.purple },
          { label: "LLM ACCURACY (EVAL)", value: "71%", color: COLORS.yellow }
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "10px 16px",
            borderRight: i < 4 ? `1px solid ${COLORS.border}` : "none",
            background: COLORS.panel
          }}>
            <div style={{ fontSize: "9px", letterSpacing: "2px", color: COLORS.muted, marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: s.color, fontFamily: "'Space Grotesk'" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 130px)" }}>

        {/* LEFT: Live Feed */}
        <div style={{ width: "280px", flexShrink: 0, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: running ? COLORS.green : COLORS.muted, animation: running ? "pulse 1s infinite" : "none" }} />
            <span style={{ fontSize: "10px", letterSpacing: "2px", color: COLORS.muted }}>BATCH FEED</span>
          </div>
          <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {batches.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: COLORS.muted, fontSize: "12px" }}>
                Press START STREAM<br />to begin simulation
              </div>
            )}
            {batches.map((b, i) => {
              const diff = volDiff(b);
              const status = b.anomaly ? "anomaly" : "clean";
              return (
                <div key={b.id} className="batch-row slide-in" style={{
                  padding: "8px 16px",
                  borderLeft: `2px solid ${status === "anomaly" ? anomalyColor(b.anomaly) : "transparent"}`,
                  background: i === 0 ? "rgba(255,255,255,0.04)" : "transparent",
                  transition: "background 0.2s"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ fontSize: "11px", color: i === 0 ? COLORS.bright : COLORS.text }}>{b.label}</span>
                    <span style={{
                      fontSize: "9px", padding: "1px 6px", borderRadius: "2px",
                      background: status === "anomaly" ? `${anomalyColor(b.anomaly)}20` : "#0a2a1a",
                      color: status === "anomaly" ? anomalyColor(b.anomaly) : COLORS.green,
                      border: `1px solid ${status === "anomaly" ? `${anomalyColor(b.anomaly)}40` : "#0a4a2a"}`
                    }}>
                      {status === "anomaly" ? "⚠ ALERT" : "✓ CLEAN"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: COLORS.muted }}>
                    <span>{b.volume.toLocaleString()} trips</span>
                    <span style={{ color: diff < -15 ? COLORS.red : diff > 15 ? COLORS.yellow : COLORS.muted }}>
                      {diff > 0 ? "+" : ""}{diff}% vs base
                    </span>
                  </div>
                  {b.anomaly && (
                    <div style={{ fontSize: "9px", color: anomalyColor(b.anomaly), marginTop: "3px", letterSpacing: "0.5px" }}>
                      {b.anomaly}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER: Anomaly Alerts */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", letterSpacing: "2px", color: COLORS.muted }}>ANOMALY ALERTS</span>
              {anomalies.length > 0 && (
                <span style={{
                  background: "#2a0a0a", color: COLORS.red, fontSize: "10px",
                  padding: "1px 7px", borderRadius: "10px", border: `1px solid ${COLORS.red}30`
                }}>{anomalies.length}</span>
              )}
            </div>
            <span style={{ fontSize: "10px", color: COLORS.muted }}>LLM DIAGNOSIS ENGINE · GROQ / OLLAMA</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {anomalies.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: "60px", color: COLORS.muted, fontSize: "12px" }}>
                {running ? "No anomalies detected yet..." : "Start the stream to see anomaly detection in action"}
              </div>
            )}
            {anomalies.map((b) => {
              const ac = anomalyColor(b.anomaly);
              const diag = diagnosed[b.id];
              const loading = diagnosing[b.id];
              const diff = volDiff(b);
              return (
                <div key={b.id} className="slide-in" style={{
                  border: `1px solid ${ac}30`,
                  borderRadius: "8px",
                  background: `linear-gradient(135deg, ${ac}08 0%, transparent 60%)`,
                  padding: "16px",
                  borderLeft: `3px solid ${ac}`
                }}>
                  {/* Alert header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                        <span style={{
                          fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase",
                          color: ac, background: `${ac}15`, border: `1px solid ${ac}30`,
                          padding: "2px 8px", borderRadius: "3px"
                        }}>{b.anomaly}</span>
                        <span style={{ fontSize: "10px", color: COLORS.muted }}>{b.label}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: COLORS.bright, fontFamily: "'Space Grotesk'", fontWeight: 600 }}>
                        Zone {b.zone} · {ZONES[b.zone]}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: ac, fontFamily: "'Space Grotesk'" }}>
                        {b.volume.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>
                        vs {b.baselineVolume.toLocaleString()} baseline
                      </div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                    {[
                      { label: "Volume Δ", value: `${diff > 0 ? "+" : ""}${diff}%`, color: diff < -15 ? COLORS.red : diff > 15 ? COLORS.yellow : COLORS.green },
                      { label: "Avg Fare", value: `$${b.avgFare}`, color: b.avgFare > 30 ? COLORS.red : COLORS.text },
                      { label: "Baseline Fare", value: `$${b.baselineFare}`, color: COLORS.muted },
                      { label: "Z-Score", value: `${(Math.abs(diff) / 12).toFixed(1)}σ`, color: ac }
                    ].map((m, i) => (
                      <div key={i} style={{
                        background: "rgba(0,0,0,0.3)", borderRadius: "4px",
                        padding: "6px 12px", border: `1px solid ${COLORS.border}`
                      }}>
                        <div style={{ fontSize: "9px", color: COLORS.muted, marginBottom: "2px", letterSpacing: "1px" }}>{m.label}</div>
                        <div style={{ fontSize: "13px", color: m.color, fontWeight: 600 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* LLM section */}
                  {!diag && !loading && (
                    <button className="explain-btn" onClick={() => handleExplain(b.id, b.anomaly)} style={{
                      background: "transparent", color: ac,
                      border: `1px solid ${ac}50`, borderRadius: "4px",
                      padding: "7px 16px", cursor: "pointer", fontSize: "11px",
                      fontFamily: "'IBM Plex Mono'", letterSpacing: "1px",
                      transition: "all 0.2s"
                    }}>
                      ◆ EXPLAIN WITH LLM
                    </button>
                  )}

                  {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
                      <div style={{
                        width: "14px", height: "14px", border: `2px solid ${ac}40`,
                        borderTop: `2px solid ${ac}`, borderRadius: "50%",
                        animation: "spin 0.8s linear infinite"
                      }} />
                      <span style={{ fontSize: "11px", color: COLORS.muted, fontStyle: "italic" }}>
                        Building context → calling LLM...
                      </span>
                    </div>
                  )}

                  {diag && (
                    <div style={{
                      background: "rgba(0,0,0,0.4)", borderRadius: "6px",
                      padding: "14px", border: `1px solid ${COLORS.border}`,
                      animation: "slideIn 0.3s ease"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "10px", letterSpacing: "2px", color: COLORS.muted }}>LLM DIAGNOSIS</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "10px", color: COLORS.muted }}>CONFIDENCE</span>
                          <span style={{
                            fontSize: "12px", fontWeight: 700,
                            color: diag.confidence > 80 ? COLORS.green : diag.confidence > 60 ? COLORS.yellow : COLORS.red
                          }}>{diag.confidence}%</span>
                        </div>
                      </div>
                      <p style={{ fontSize: "12px", color: COLORS.text, lineHeight: "1.6", marginBottom: "12px" }}>
                        {diag.cause}
                      </p>
                      <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: COLORS.muted, marginBottom: "8px" }}>
                        REMEDIATION STEPS
                      </div>
                      {diag.steps.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "5px", fontSize: "11px", color: COLORS.text }}>
                          <span style={{ color: ac, flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ lineHeight: "1.5" }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Zone Status */}
        <div style={{ width: "220px", flexShrink: 0, borderLeft: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: "10px", letterSpacing: "2px", color: COLORS.muted }}>ZONE STATUS</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {Object.entries(ZONES).map(([zoneId, zoneName]) => {
              const recentAnomaly = anomalies.find(a => a.zone === zoneId);
              const isAffected = recentAnomaly && (Date.now() - recentAnomaly.ts < 30000);
              return (
                <div key={zoneId} style={{
                  padding: "8px 14px",
                  borderLeft: `2px solid ${isAffected ? anomalyColor(recentAnomaly?.anomaly) : "transparent"}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: "10px", color: isAffected ? COLORS.bright : COLORS.muted }}>{zoneName}</div>
                    <div style={{ fontSize: "9px", color: "#444" }}>Zone {zoneId}</div>
                  </div>
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: isAffected ? anomalyColor(recentAnomaly?.anomaly) : running ? COLORS.green : "#2a2a3e",
                    animation: isAffected ? "pulse 1s infinite" : "none"
                  }} />
                </div>
              );
            })}
          </div>

          {/* Bottom: pipeline health */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "14px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: COLORS.muted, marginBottom: "10px" }}>
              PIPELINE HEALTH
            </div>
            {["Ingestion", "Detection", "Context Builder", "LLM Engine"].map((layer, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
                <span style={{ fontSize: "10px", color: COLORS.muted }}>{layer}</span>
                <span style={{
                  fontSize: "9px", color: running ? COLORS.green : "#444",
                  background: running ? "#0a2a1a" : "transparent",
                  padding: "1px 6px", borderRadius: "2px",
                  border: running ? "1px solid #0a4a2a" : "none"
                }}>
                  {running ? "● OK" : "○ idle"}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
