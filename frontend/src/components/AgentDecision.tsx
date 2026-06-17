import type { DecisionResult } from "../api/types";

const ACTION_STYLES: Record<string, { badge: string; border: string; bg: string }> = {
  DELOAD:   { badge: "bg-red-100 text-red-700",       border: "border-red-200",     bg: "bg-red-50" },
  REDUCE:   { badge: "bg-orange-100 text-orange-700", border: "border-orange-200",  bg: "bg-orange-50" },
  MAINTAIN: { badge: "bg-blue-100 text-blue-700",     border: "border-blue-200",    bg: "bg-blue-50" },
  PROGRESS: { badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", bg: "bg-emerald-50" },
};

const RULE_NATURAL: Record<string, string> = {
  "adherence_14d < 60% AND soreness_count_7d >= 2":
    "Attendance dropped below 60% and soreness was reported at least twice — signs of accumulated fatigue.",
  "avg_soreness_intensity_7d >= 6":
    "Pain intensity reached 6/10 or above — safety override activated.",
  "adherence_14d < 75% OR soreness_count_7d >= 1":
    "Attendance below 75% or at least one soreness report this week — load reduced as a precaution.",
  "adherence_14d >= 90% AND prs_14d > 0 AND avg_rpe_7d <= 7":
    "Strong attendance, a new personal record, and effort level well managed — ready to progress.",
  "default":
    "All signals within normal range — no reason to change the current program.",
};

function toNaturalRule(rule: string): string {
  return RULE_NATURAL[rule] ?? rule;
}

interface Props {
  decision: DecisionResult;
}

export function AgentDecision({ decision }: Props) {
  const { signals, decision: d, recommendation } = decision;
  const style = ACTION_STYLES[d.action] ?? ACTION_STYLES["MAINTAIN"];

  return (
    <div className={`border rounded-xl overflow-hidden ${style.border}`}>
      {/* header */}
      <div className={`px-5 py-3 flex items-center justify-between ${style.bg}`}>
        <p className="font-semibold text-slate-900 text-sm">Agent Decision</p>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.badge}`}>
          {d.action}
        </span>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white">

        {/* ① Signals */}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            ① Signals
          </p>
          <div className="space-y-3">
            <Signal
              label="14d attendance"
              value={`${(signals.adherence_14d * 100).toFixed(0)}%`}
              sub={`${signals.sessions_14d} sessions · ${signals.skips_14d} skips`}
              alert={signals.adherence_14d < 0.75}
            />
            <Signal
              label="Soreness this week"
              value={String(signals.soreness_count_7d)}
              sub={signals.soreness_count_7d > 0 ? `avg intensity ${signals.avg_soreness_intensity_7d}/10` : "none reported"}
              alert={signals.soreness_count_7d >= 2}
            />
            <Signal
              label="Drop-off risk"
              value={`${(signals.drop_off_probability * 100).toFixed(0)}%`}
              sub={`avg RPE ${signals.avg_rpe_7d}`}
              alert={signals.drop_off_probability > 0.5}
            />
            {signals.prs_14d > 0 && (
              <Signal
                label="PRs this cycle"
                value={String(signals.prs_14d)}
                sub="personal record"
                alert={false}
                positive
              />
            )}
          </div>
        </div>

        {/* ② Rule */}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            ② Rule triggered
          </p>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              {toNaturalRule(d.rule_evaluated)}
            </p>
            {d.exception_invoked && (
              <div className="text-xs text-orange-600 bg-orange-50 rounded-lg p-3">
                Override: {d.exception_invoked.replace(/_/g, " ")}
              </div>
            )}
            <div className={`text-sm font-semibold px-3 py-2 rounded-lg text-center ${style.badge}`}>
              → {d.action}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {recommendation.narration}
            </p>
          </div>
        </div>

        {/* ③ LLM output */}
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            ③ Coach message (LLM)
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Adjusted program</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {recommendation.adjusted_program}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-400 mb-1">Message to client</p>
              <p className="text-sm text-slate-600 italic leading-relaxed">
                {recommendation.checkin_message}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Signal({
  label, value, sub, alert, positive = false,
}: {
  label: string; value: string; sub: string; alert: boolean; positive?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-sm font-bold ${positive ? "text-emerald-600" : alert ? "text-red-600" : "text-slate-800"}`}>
          {value}
        </span>
      </div>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
