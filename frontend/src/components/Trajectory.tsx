import type { ActionEvent } from "../api/types";

const TYPE_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  SessionLogged:    { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400", label: "Session" },
  SessionSkipped:   { color: "bg-red-100 text-red-600",         dot: "bg-red-400",     label: "Skip" },
  SorenessReported: { color: "bg-orange-100 text-orange-600",   dot: "bg-orange-400",  label: "Soreness" },
  PRHit:            { color: "bg-purple-100 text-purple-700",   dot: "bg-purple-400",  label: "PR" },
  AgentDeload:      { color: "bg-blue-100 text-blue-700",       dot: "bg-blue-400",    label: "Deload" },
};

function detail(a: ActionEvent): string {
  const parts: string[] = [];
  if (a.session) parts.push(String(a.session));
  if (a.load_kg != null) parts.push(`${a.load_kg}kg`);
  if (a.RPE != null) parts.push(`RPE ${a.RPE}`);
  if (a.zone) parts.push(String(a.zone));
  if (a.intensity != null) parts.push(`${a.intensity}/10`);
  if (a.exercise) parts.push(String(a.exercise));
  if (a.reason) parts.push(String(a.reason));
  return parts.join(" · ");
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface Props {
  actions: ActionEvent[];
}

export function Trajectory({ actions }: Props) {
  const sorted = [...actions].sort((a, b) => a.ts.localeCompare(b.ts));

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col" style={{ height: 380 }}>
      <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
        <p className="text-sm font-semibold text-slate-900">Training Trajectory</p>
        <p className="text-xs text-slate-400 mt-0.5">event clock — last 2 weeks</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="relative">
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100" />
        <div className="space-y-3 pl-6">
          {sorted.map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? { color: "bg-slate-100 text-slate-600", dot: "bg-slate-300", label: a.type };
            return (
              <div key={a.id} className="relative flex items-start gap-3">
                <span className={`absolute -left-6 mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-xs text-slate-400 w-14 flex-shrink-0 mt-0.5">
                    {formatDate(a.ts)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-slate-400 truncate mt-0.5">
                    {detail(a)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
