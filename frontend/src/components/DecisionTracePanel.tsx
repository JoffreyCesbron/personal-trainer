import type { DecisionResult } from "../api/types";

interface Props {
  decision: DecisionResult;
}

export function DecisionTracePanel({ decision }: Props) {
  const { decision: d, recommendation, trace_id } = decision;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Decision Trace
      </p>

      <div className="space-y-2 text-sm mb-4">
        <Row label="Action" value={d.action} mono />
        <Row label="Rule" value={d.rule_evaluated} />
        {d.exception_invoked && <Row label="Exception" value={d.exception_invoked} mono />}
        <Row label="Trace node" value={trace_id.slice(0, 8) + "…"} mono />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Narration</p>
        <p className="text-sm text-gray-700 leading-relaxed">{recommendation.narration}</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className={mono ? "font-mono text-gray-800" : "text-gray-800"}>{value}</span>
    </div>
  );
}
