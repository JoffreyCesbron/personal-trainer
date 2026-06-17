import { useState } from "react";
import type { ClientState, ActionEvent } from "../api/types";

interface Props {
  clientState: ClientState;
  restDay?: boolean;
}

export function TodayProgram({ clientState, restDay = false }: Props) {
  const [tab, setTab] = useState<"today" | "history">("today");
  const { program, recent_actions } = clientState;

  const sessions = [...recent_actions]
    .filter((a) => a.type === "SessionLogged")
    .sort((a, b) => b.ts.localeCompare(a.ts));

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col">
      {/* tabs */}
      <div className="flex border-b border-slate-100">
        <Tab label="Today's Program" active={tab === "today"} onClick={() => setTab("today")} badge="state clock" />
        <Tab label="History" active={tab === "history"} onClick={() => setTab("history")} />
      </div>

      <div className="p-5">
        {tab === "today" ? (
          restDay ? <RestDayTab /> : <TodayTab program={program} />
        ) : (
          <HistoryTab sessions={sessions} />
        )}
      </div>
    </div>
  );
}

function Tab({
  label, active, onClick, badge,
}: {
  label: string; active: boolean; onClick: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
        active
          ? "text-indigo-600 border-b-2 border-indigo-500 -mb-px"
          : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
      {badge && (
        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-normal">
          {badge}
        </span>
      )}
    </button>
  );
}

function RestDayTab() {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-800">Rest Day</p>
        <p className="text-xs text-slate-400 mt-1">
          Program adjusted by your coach — no training today.
        </p>
      </div>
      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-2 leading-relaxed">
        Focus on sleep, hydration, and light walking.<br />
        Resume training in 3–4 days with reduced load.
      </div>
    </div>
  );
}

function TodayTab({ program }: { program: ClientState["program"] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-3">
        {program.label} — {program.sessions_per_week}x/week · {program.focus}
      </p>
      {program.exercises?.map((ex) => (
        <div key={ex.name} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            <span className="text-slate-800 font-medium">{ex.name}</span>
          </div>
          <span className="text-slate-400 font-mono text-xs">
            {ex.sets}×{ex.reps}
            {ex.load_kg != null ? ` · ${ex.load_kg}kg` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ sessions }: { sessions: ActionEvent[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-400">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div key={s.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-16 flex-shrink-0">
              {new Date(s.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            <span className="text-slate-700 font-medium">
              {String(s.session ?? "Session")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {s.load_kg != null && <span className="font-mono">{String(s.load_kg)}kg</span>}
            {s.RPE != null && (
              <span className={`font-mono ${Number(s.RPE) >= 8 ? "text-orange-500" : "text-slate-400"}`}>
                RPE {String(s.RPE)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
