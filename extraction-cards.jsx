import { useState } from "react";

// ─── WIDTH TIERS ────────────────────────────────────────────────
const WIDTH_A = 280;
const WIDTH_B = 240;

// ─── SAMPLE DATA ────────────────────────────────────────────────
const sampleMood = {
  valence: 0.75,
  energy: 0.8,
  emotions: ["joy", "excitement", "confidence"],
  trigger: "successful client call",
  confidence: 0.9,
};

const sampleMood2 = {
  valence: -0.2,
  energy: -0.3,
  emotions: ["conflicted", "tired", "stressed", "contemplative"],
  trigger: "apartment search uncertainty",
  confidence: 0.75,
};

const sampleFood = {
  items: ["soup", "bread", "apple"],
  meal: "lunch",
  observation: "overate, discomfort after meal",
  confidence: 1.0,
};

const sampleFood2 = {
  items: ["oatmeal", "banana", "coffee"],
  meal: "breakfast",
  observation: "light and energizing breakfast",
  confidence: 0.95,
};

const sampleBody = {
  physical: "severe headache",
  sleep: "5 hours, sleep deprived",
  substance: "2 espressos, ibuprofen",
  confidence: 1.0,
};

const sampleBody2 = {
  physical: "energized, feeling light",
  sleep: "8 hours, deep sleep",
  substance: null,
  confidence: 0.9,
};

const sampleActivities = [
  { activity_type: "work", description: "coded a new feature", duration_estimate: "3h", location: "office", productivity_signal: 0.8, confidence: 1.0 },
  { activity_type: "meeting", description: "sync with designers", duration_estimate: "1h", location: "office", productivity_signal: null, confidence: 1.0 },
  { activity_type: "exercise", description: "5km run", duration_estimate: "30m", location: "park", productivity_signal: null, confidence: 1.0 },
];

const sampleActivities2 = [
  { activity_type: "study", description: "read React documentation", duration_estimate: "2h", location: "home", productivity_signal: 0.7, confidence: 0.9 },
  { activity_type: "socializing", description: "lunch with friends", duration_estimate: "1.5h", location: "cafe", productivity_signal: null, confidence: 1.0 },
  { activity_type: "creative", description: "sketched UI concepts", duration_estimate: "45m", location: "home", productivity_signal: 0.6, confidence: 0.85 },
  { activity_type: "rest", description: "meditation", duration_estimate: "20m", location: "home", productivity_signal: null, confidence: 0.9 },
];

const sampleTodos = [
  { content: "book a dentist appointment", type: "task", status: "todo", urgency: "this_week", confidence: 1.0 },
  { content: "start reading 30 min before bed", type: "habit_intention", status: "todo", urgency: "someday", confidence: 0.7 },
  { content: "run a half marathon by year end", type: "goal", status: "in_progress", urgency: "this_month", confidence: 0.85 },
];

const sampleTodos2 = [
  { content: "send report to client", type: "task", status: "done", urgency: "today", confidence: 1.0 },
  { content: "prepare presentation", type: "task", status: "in_progress", urgency: "this_week", confidence: 0.9 },
  { content: "learn Rust basics", type: "goal", status: "todo", urgency: "this_month", confidence: 0.75 },
  { content: "drink 2L of water daily", type: "habit_intention", status: "in_progress", urgency: "someday", confidence: 0.6 },
];

const sampleReflections = [
  { content: "working in the morning before checking email doubles my productivity", domain: "work", actionability: "habit_candidate", source: "personal observation", confidence: 0.9 },
];

const sampleReflections2 = [
  { content: "loneliness is not the absence of people, but the absence of resonance", domain: "personal", actionability: "reflection", source: "evening thoughts", confidence: 0.8 },
  { content: "the fear of speaking truth is tied to the fear of rejection", domain: "personal", actionability: "reflection", source: "conversation with a friend", confidence: 0.7 },
];

// ─── UTILS ──────────────────────────────────────────────────────
const activityEmoji = {
  work: "💻", study: "📚", meeting: "🤝", travel: "✈️", admin: "📋",
  socializing: "🍻", exercise: "🏃", rest: "🧘", health: "💊",
  creative: "🎨", chores: "🧹",
};

const mealLabel = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

const approxCalories = {
  soup: 250, bread: 130, apple: 52,
  oatmeal: 180, banana: 105, coffee: 5,
};

const urgencyColor = {
  today: "#ef4444", this_week: "#f59e0b", this_month: "#3b82f6", someday: "#6b7280",
};

const typeIcon = {
  task: "○", goal: "◎", habit_intention: "↻", question: "?", event: "◇", decision: "⬡",
};

const statusIcon = {
  todo: "○", in_progress: "◐", done: "●",
};

// ─── SHARED COMPONENTS ──────────────────────────────────────────

function ConfidenceBar({ value, color = "rgba(255,255,255,0.15)" }) {
  return (
    <div className="mt-auto pt-3 flex items-center gap-2">
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, background: color, opacity: 0.6 }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

// Bipolar bar — renders from center, handles negative values correctly
function BipolarBar({ value, color, height = 6 }) {
  const absVal = Math.abs(value);
  const isPositive = value >= 0;
  return (
    <div className="relative w-full rounded-full overflow-hidden" style={{ height, background: "#1a1a1a" }}>
      {/* Center line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
      {/* Fill bar */}
      <div
        className="absolute top-0 bottom-0 rounded-full"
        style={{
          left: isPositive ? "50%" : undefined,
          right: isPositive ? undefined : "50%",
          width: `${absVal * 50}%`,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
}

function CardShell({ children, glow, glowColor = "rgba(52,77,207,0.3)", label, size = "a" }) {
  const w = size === "b" ? WIDTH_B : WIDTH_A;
  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        width: w,
        borderRadius: 24,
        background: "linear-gradient(to bottom, #000000, #111111)",
        border: `1px solid ${glow ? glowColor : "#2a2a2a"}`,
        boxShadow: glow
          ? `0 0 60px ${glowColor}, inset 0 0 40px ${glowColor}`
          : "0px 0px 10px rgba(0,0,0,0.4)",
      }}
    >
      {label && (
        <div className="flex items-center gap-2 px-5 pt-5 pb-0">
          <div
            className="rounded-full text-[11px]"
            style={{
              padding: "4px 12px",
              background: "linear-gradient(to bottom, #151515, #1b1b1b)",
              border: "0.5px solid #252525",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </div>
        </div>
      )}
      <div className="flex flex-col flex-1 px-5 pt-3 pb-5">{children}</div>
    </div>
  );
}

// ─── MOOD CARDS ─────────────────────────────────────────────────

function MoodCardA({ data }) {
  const { valence, energy, emotions, trigger, confidence } = data;
  const x = ((valence + 1) / 2) * 100;
  const y = ((1 - (energy + 1) / 2)) * 100;

  const quadrantLabel =
    valence >= 0 && energy >= 0 ? "Activated Pleasant" :
    valence < 0 && energy >= 0 ? "Activated Unpleasant" :
    valence >= 0 && energy < 0 ? "Calm Pleasant" :
    "Calm Unpleasant";

  const dotColor =
    valence >= 0 && energy >= 0 ? "#22c55e" :
    valence < 0 && energy >= 0 ? "#ef4444" :
    valence >= 0 && energy < 0 ? "#60a5fa" :
    "#a855f7";

  return (
    <CardShell label="mood" size="a">
      <div className="flex flex-col gap-3 flex-1">
        <div className="relative w-full aspect-square overflow-hidden" style={{ background: "#0a0a0a", borderRadius: 16 }}>
          <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="absolute top-2 left-3 text-[7px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.12)" }}>tense</span>
          <span className="absolute top-2 right-3 text-[7px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.12)" }}>energized</span>
          <span className="absolute bottom-2 left-3 text-[7px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.12)" }}>depleted</span>
          <span className="absolute bottom-2 right-3 text-[7px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.12)" }}>serene</span>
          <div
            className="absolute w-3.5 h-3.5 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              background: dotColor,
              boxShadow: `0 0 16px ${dotColor}, 0 0 32px ${dotColor}66`,
            }}
          />
          <div
            className="absolute w-7 h-7 rounded-full animate-ping"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              background: `${dotColor}20`,
              animationDuration: "2s",
            }}
          />
        </div>

        <div className="text-[10px] uppercase tracking-widest" style={{ color: dotColor }}>{quadrantLabel}</div>

        <div className="flex flex-wrap gap-1">
          {emotions.map((e, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: "#1a1a1a", color: "rgba(255,255,255,0.65)", border: "1px solid #252525" }}>
              {e}
            </span>
          ))}
        </div>

        {trigger && (
          <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>{trigger}</p>
        )}

        <ConfidenceBar value={confidence} color={dotColor} />
      </div>
    </CardShell>
  );
}

function MoodCardB({ data }) {
  const { valence, energy, emotions, trigger, confidence } = data;
  const valenceColor = valence >= 0 ? "#22c55e" : "#ef4444";
  const energyColor = energy >= 0 ? "#f59e0b" : "#6366f1";

  return (
    <CardShell label="mood" size="b">
      <div className="flex flex-col gap-4 flex-1">
        {/* Valence */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>valence</span>
            <span className="text-[13px] font-mono" style={{ color: valenceColor }}>{valence > 0 ? "+" : ""}{valence.toFixed(2)}</span>
          </div>
          <BipolarBar value={valence} color={valenceColor} />
        </div>

        {/* Energy */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>energy</span>
            <span className="text-[13px] font-mono" style={{ color: energyColor }}>{energy > 0 ? "+" : ""}{energy.toFixed(2)}</span>
          </div>
          <BipolarBar value={energy} color={energyColor} />
        </div>

        {/* Emotions */}
        <div className="flex flex-wrap gap-1.5">
          {emotions.map((e, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[11px]"
              style={{
                background: `${valenceColor}18`,
                color: valenceColor,
                border: `1px solid ${valenceColor}40`,
              }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* Trigger */}
        {trigger && (
          <div className="flex items-start gap-2 px-3 py-2.5" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 14 }}>
            <span className="text-[9px] uppercase tracking-wider shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>trigger</span>
            <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>{trigger}</p>
          </div>
        )}

        <ConfidenceBar value={confidence} color="rgba(255,255,255,0.15)" />
      </div>
    </CardShell>
  );
}

// ─── FOOD CARDS ─────────────────────────────────────────────────

function FoodCardA({ data }) {
  const { items, meal, observation, confidence } = data;
  const totalCal = items.reduce((sum, item) => sum + (approxCalories[item] || 120), 0);

  return (
    <CardShell label="food" size="a">
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-medium" style={{ color: "#fff" }}>
            {mealLabel[meal] || meal}
          </span>
          <span className="text-[20px] font-light font-mono" style={{ color: "#f59e0b" }}>
            ~{totalCal}
            <span className="text-[10px] ml-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>kcal</span>
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {items.map((item, i) => {
            const cal = approxCalories[item] || 120;
            const pct = (cal / totalCal) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[13px] flex-1 capitalize" style={{ color: "rgba(255,255,255,0.65)" }}>{item}</span>
                <div className="w-14 h-[5px] rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#f59e0b", opacity: 0.4 + (pct / 200) }} />
                </div>
                <span className="text-[11px] font-mono w-8 text-right" style={{ color: "rgba(255,255,255,0.3)" }}>{cal}</span>
              </div>
            );
          })}
        </div>

        {observation && (
          <div className="px-3 py-2" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 14 }}>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{observation}</p>
          </div>
        )}

        <ConfidenceBar value={confidence} color="rgba(245,158,11,0.4)" />
      </div>
    </CardShell>
  );
}

function FoodCardB({ data }) {
  const { items, meal, observation, confidence } = data;
  const totalCal = items.reduce((sum, item) => sum + (approxCalories[item] || 120), 0);
  const r = 34, stroke = 5;
  const circumference = 2 * Math.PI * r;
  const maxCal = 800;
  const progress = Math.min(totalCal / maxCal, 1);

  return (
    <CardShell label="food" size="b">
      <div className="flex flex-col items-center gap-3 flex-1">
        <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke="#1a1a1a" strokeWidth={stroke} />
            <circle
              cx="44" cy="44" r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.4))" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[16px] font-mono font-light" style={{ color: "#f59e0b" }}>~{totalCal}</span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>kcal</span>
          </div>
        </div>

        <div className="text-center w-full">
          <div className="text-[14px] mb-2" style={{ color: "#fff" }}>{mealLabel[meal] || meal}</div>
          <div className="flex flex-wrap justify-center gap-1">
            {items.map((item, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] capitalize" style={{ background: "rgba(245,158,11,0.08)", color: "rgba(245,158,11,0.7)", border: "1px solid rgba(245,158,11,0.15)" }}>
                {item} · {approxCalories[item] || 120}
              </span>
            ))}
          </div>
        </div>

        {observation && (
          <p className="text-[10px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>{observation}</p>
        )}

        <ConfidenceBar value={confidence} color="rgba(245,158,11,0.4)" />
      </div>
    </CardShell>
  );
}

// ─── BODY CARDS ─────────────────────────────────────────────────

function BodyCardA({ data }) {
  const { physical, sleep, substance, confidence } = data;

  const rows = [
    { icon: "⚡", label: "physical", value: physical, color: "#60a5fa" },
    { icon: "🌙", label: "sleep", value: sleep, color: "#a78bfa" },
    { icon: "💊", label: "substance", value: substance, color: "#f87171" },
  ].filter((r) => r.value);

  return (
    <CardShell label="body" size="a">
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 14 }}>
              <span className="text-[16px] shrink-0 mt-0.5">{row.icon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: row.color + "80" }}>{row.label}</span>
                <span className="text-[13px] leading-snug" style={{ color: "rgba(255,255,255,0.6)" }}>{row.value}</span>
              </div>
            </div>
          ))}
        </div>
        <ConfidenceBar value={confidence} color="rgba(96,165,250,0.4)" />
      </div>
    </CardShell>
  );
}

function BodyCardB({ data }) {
  const { physical, sleep, substance, confidence } = data;

  const scorePhysical = physical?.match(/energi|light|good|great|strong|fresh/i) ? 0.8 : 0.3;
  const scoreSleep = sleep?.match(/[7-9]\s*hour|deep|good|well/i) ? 0.85 : 0.3;

  const metrics = [
    { label: "Physical", score: scorePhysical, color: "#60a5fa", text: physical },
    { label: "Sleep", score: scoreSleep, color: "#a78bfa", text: sleep },
  ].filter((m) => m.text);

  return (
    <CardShell label="body" size="b">
      <div className="flex flex-col gap-4 flex-1">
        {metrics.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: m.color + "80" }}>{m.label}</span>
              <div className="flex gap-0.5 items-end">
                {[...Array(5)].map((_, j) => (
                  <div
                    key={j}
                    className="rounded-full"
                    style={{
                      width: 3,
                      height: 6 + j * 3,
                      background: j / 5 < m.score ? m.color : "#1a1a1a",
                      opacity: j / 5 < m.score ? 0.7 : 1,
                    }}
                  />
                ))}
              </div>
            </div>
            <p className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>{m.text}</p>
          </div>
        ))}

        {substance && (
          <div className="flex items-start gap-2 px-3 py-2" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: 14 }}>
            <span className="text-[12px] shrink-0">💊</span>
            <p className="text-[11px] leading-snug" style={{ color: "rgba(248,113,113,0.6)" }}>{substance}</p>
          </div>
        )}

        <ConfidenceBar value={confidence} color="rgba(96,165,250,0.4)" />
      </div>
    </CardShell>
  );
}

// ─── ACTIVITY CARDS ─────────────────────────────────────────────

function ActivityCardA({ data }) {
  return (
    <CardShell label="activities" size="a">
      <div className="flex flex-col gap-2 flex-1">
        {data.map((act, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 14 }}>
            <span className="text-[18px] shrink-0">{activityEmoji[act.activity_type] || "📌"}</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{act.description}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{act.duration_estimate}</span>
                {act.location && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>· {act.location}</span>}
              </div>
            </div>
            {act.productivity_signal != null && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0" style={{ background: "#1a1a1a", color: "rgba(255,255,255,0.4)" }}>
                {Math.round(act.productivity_signal * 100)}
              </div>
            )}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function ActivityCardB({ data }) {
  return (
    <CardShell label="activities" size="b">
      <div className="flex flex-col flex-1">
        <div className="flex flex-col relative">
          <div className="absolute left-[13px] top-3 bottom-3 w-px" style={{ background: "#1f1f1f" }} />
          {data.map((act, i) => (
            <div key={i} className={`flex items-start gap-3 relative ${i < data.length - 1 ? "pb-3" : ""}`}>
              <div
                className="flex items-center justify-center shrink-0 relative z-10 text-[12px]"
                style={{ width: 26, height: 26, borderRadius: 13, background: "#111", border: "1px solid #2a2a2a" }}
              >
                {activityEmoji[act.activity_type] || "📌"}
              </div>
              <div className="flex flex-col pt-0.5 min-w-0">
                <span className="text-[12px] leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>{act.description}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5" style={{ background: "#151515", color: "rgba(255,255,255,0.3)", borderRadius: 6 }}>{act.duration_estimate}</span>
                  {act.location && <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{act.location}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

// ─── TODO CARDS ─────────────────────────────────────────────────

function TodoCardA({ data }) {
  return (
    <CardShell label="tasks" size="a">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-end mb-1">
          <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            {data.filter((t) => t.status === "done").length}/{data.length} done
          </span>
        </div>

        {data.map((task, i) => {
          const isDone = task.status === "done";
          const isProgress = task.status === "in_progress";
          return (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5"
              style={{
                background: isProgress ? "rgba(59,130,246,0.05)" : "#0a0a0a",
                border: `1px solid ${isProgress ? "rgba(59,130,246,0.15)" : "#1a1a1a"}`,
                borderRadius: 14,
                opacity: isDone ? 0.45 : 1,
              }}
            >
              <span
                className="text-[14px] shrink-0 mt-0.5 font-mono"
                style={{ color: isDone ? "#22c55e" : isProgress ? "#3b82f6" : "rgba(255,255,255,0.2)" }}
              >
                {statusIcon[task.status]}
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className="text-[13px] leading-snug"
                  style={{
                    color: isDone ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {task.content}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[9px] uppercase tracking-wider px-1.5 py-0.5"
                    style={{ background: "#151515", color: "rgba(255,255,255,0.25)", borderRadius: 6 }}
                  >
                    {typeIcon[task.type]} {task.type.replace("_", " ")}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: urgencyColor[task.urgency] || "#6b7280" }} />
                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.2)" }}>{task.urgency?.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}

function TodoCardB({ data }) {
  const groups = { todo: [], in_progress: [], done: [] };
  data.forEach((t) => groups[t.status]?.push(t));
  const doneRatio = data.length > 0 ? groups.done.length / data.length : 0;

  const statusLabels = { todo: "To Do", in_progress: "In Progress", done: "Done" };
  const statusColors = { todo: "rgba(255,255,255,0.25)", in_progress: "#3b82f6", done: "#22c55e" };

  return (
    <CardShell label="tasks" size="b">
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>progress</span>
            <span className="text-[18px] font-mono font-light" style={{ color: doneRatio === 1 ? "#22c55e" : "#3b82f6" }}>
              {Math.round(doneRatio * 100)}%
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden flex gap-px" style={{ background: "#1a1a1a" }}>
            {groups.done.length > 0 && <div className="h-full rounded-full" style={{ width: `${(groups.done.length / data.length) * 100}%`, background: "#22c55e" }} />}
            {groups.in_progress.length > 0 && <div className="h-full rounded-full" style={{ width: `${(groups.in_progress.length / data.length) * 100}%`, background: "#3b82f6" }} />}
          </div>
        </div>

        {Object.entries(groups).map(([status, tasks]) =>
          tasks.length > 0 ? (
            <div key={status} className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: statusColors[status] }}>
                {statusLabels[status]}
              </span>
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-2.5" style={{ background: "#0a0a0a", borderRadius: 10 }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: urgencyColor[task.urgency] || "#6b7280" }} />
                  <span
                    className="text-[11px] flex-1 truncate"
                    style={{
                      color: status === "done" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
                      textDecoration: status === "done" ? "line-through" : "none",
                    }}
                  >
                    {task.content}
                  </span>
                  <span className="text-[9px] shrink-0" style={{ color: "rgba(255,255,255,0.15)" }}>{typeIcon[task.type]}</span>
                </div>
              ))}
            </div>
          ) : null
        )}
      </div>
    </CardShell>
  );
}

// ─── REFLECTION CARDS ───────────────────────────────────────────

function ReflectionCardA({ data }) {
  return (
    <CardShell label="reflections" glow glowColor="rgba(168,85,247,0.25)" size="a">
      <div className="flex flex-col gap-4 flex-1 relative">
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: -40, right: -40, width: 120, height: 120, background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)", filter: "blur(20px)" }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ bottom: -20, left: -30, width: 90, height: 90, background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)", filter: "blur(16px)" }}
        />

        <div className="flex flex-col gap-5 relative z-10">
          {data.map((ref, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p
                className="text-[15px] leading-relaxed font-light italic"
                style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 0 30px rgba(168,85,247,0.3)" }}
              >
                "{ref.content}"
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider" style={{ background: "rgba(168,85,247,0.08)", color: "rgba(168,85,247,0.6)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  {ref.domain}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: "rgba(168,85,247,0.05)", color: "rgba(168,85,247,0.4)", border: "1px solid rgba(168,85,247,0.1)" }}>
                  {ref.actionability.replace("_", " ")}
                </span>
              </div>
              {ref.source && (
                <span className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.2)" }}>— {ref.source}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

function ReflectionCardB({ data }) {
  const orbColors = ["rgba(168,85,247,0.15)", "rgba(99,102,241,0.12)", "rgba(236,72,153,0.1)"];

  return (
    <CardShell label="reflections" glow glowColor="rgba(99,102,241,0.2)" size="b">
      <div className="flex flex-col gap-3 flex-1 relative overflow-hidden">
        {[
          { top: -20, left: -15, size: 70, color: "rgba(168,85,247,0.1)" },
          { top: 50, right: -20, size: 90, color: "rgba(99,102,241,0.08)" },
          { bottom: 5, left: 15, size: 50, color: "rgba(236,72,153,0.08)" },
        ].map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: orb.top, left: orb.left, right: orb.right, bottom: orb.bottom,
              width: orb.size, height: orb.size,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              filter: "blur(15px)",
            }}
          />
        ))}

        <div className="flex flex-col gap-5 relative z-10">
          {data.map((ref, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-px w-10 rounded-full" style={{ background: `linear-gradient(to right, ${orbColors[i % orbColors.length]}, transparent)` }} />
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.8)", textShadow: "0 0 40px rgba(99,102,241,0.25)" }}>
                {ref.content}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(99,102,241,0.5)" }}>{ref.domain}</span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>{ref.actionability.replace("_", " ")}</span>
              </div>
              {ref.source && (
                <span className="text-[9px] italic" style={{ color: "rgba(255,255,255,0.18)" }}>— {ref.source}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

// ─── MAIN SHOWCASE ──────────────────────────────────────────────

const sections = [
  { title: "Mood", a: <MoodCardA data={sampleMood} />, b: <MoodCardB data={sampleMood2} /> },
  { title: "Food", a: <FoodCardA data={sampleFood} />, b: <FoodCardB data={sampleFood2} /> },
  { title: "Body", a: <BodyCardA data={sampleBody} />, b: <BodyCardB data={sampleBody2} /> },
  { title: "Activities", a: <ActivityCardA data={sampleActivities} />, b: <ActivityCardB data={sampleActivities2} /> },
  { title: "Tasks", a: <TodoCardA data={sampleTodos} />, b: <TodoCardB data={sampleTodos2} /> },
  { title: "Reflections", a: <ReflectionCardA data={sampleReflections} />, b: <ReflectionCardB data={sampleReflections2} /> },
];

export default function ExtractionCards() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#080808", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-light mb-2" style={{ color: "#fff" }}>Extraction Cards</h1>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>
          Post-recording feedback · variant A ({WIDTH_A}px) + variant B ({WIDTH_B}px)
        </p>

        {sections.map((section, i) => (
          <div key={i} className="mb-12">
            <h2 className="text-xs uppercase tracking-[0.2em] mb-5" style={{ color: "rgba(255,255,255,0.2)" }}>
              {section.title}
            </h2>
            <div className="flex gap-6 flex-wrap items-start">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>variant A · {WIDTH_A}px</span>
                {section.a}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>variant B · {WIDTH_B}px</span>
                {section.b}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}