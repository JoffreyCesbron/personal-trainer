import type { DecisionResult } from "../api/types";

const ACTION_STYLES: Record<string, { badge: string; border: string }> = {
  DELOAD: { badge: "bg-red-100 text-red-800", border: "border-red-200" },
  REDUCE: { badge: "bg-orange-100 text-orange-800", border: "border-orange-200" },
  MAINTAIN: { badge: "bg-blue-100 text-blue-800", border: "border-blue-200" },
  PROGRESS: { badge: "bg-green-100 text-green-800", border: "border-green-200" },
};

interface Props {
  decision: DecisionResult;
}

export function RecommendationPanel({ decision }: Props) {
  const { action } = decision.decision;
  const { recommendation, signals } = decision;
  const style = ACTION_STYLES[action] ?? ACTION_STYLES["MAINTAIN"];

  return (
    <div className={`bg-white border rounded-lg p-5 ${style.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Agent Recommendation
        </span>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${style.badge}`}>
          {action}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Metric label="Adherence 14d" value={`${(signals.adherence_14d * 100).toFixed(0)}%`} />
        <Metric label="Soreness 7d" value={String(signals.soreness_count_7d)} />
        <Metric label="PRs 14d" value={String(signals.prs_14d)} />
        <Metric label="Drop-off risk" value={`${(signals.drop_off_probability * 100).toFixed(0)}%`} />
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 mb-1">Adjusted Program</p>
        <p className="text-sm text-gray-800">{recommendation.adjusted_program}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Check-in Message</p>
        <p className="text-sm text-gray-700 italic">{recommendation.checkin_message}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
