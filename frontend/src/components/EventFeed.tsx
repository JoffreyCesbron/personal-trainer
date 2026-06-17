import type { ActionEvent } from "../api/types";

const ACTION_COLORS: Record<string, string> = {
  SessionLogged: "bg-green-100 text-green-800",
  SessionSkipped: "bg-red-100 text-red-800",
  SorenessReported: "bg-orange-100 text-orange-800",
  PRHit: "bg-purple-100 text-purple-800",
  AgentDeload: "bg-blue-100 text-blue-800",
  MessageSent: "bg-gray-100 text-gray-700",
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionDetail({ action }: { action: ActionEvent }) {
  const { type, ts: _ts, id: _id, ...rest } = action;
  const parts: string[] = [];
  if (rest.session) parts.push(String(rest.session));
  if (rest.load_kg != null) parts.push(`${rest.load_kg}kg`);
  if (rest.RPE != null) parts.push(`RPE ${rest.RPE}`);
  if (rest.zone) parts.push(String(rest.zone));
  if (rest.intensity != null) parts.push(`intensity ${rest.intensity}/10`);
  if (rest.exercise) parts.push(String(rest.exercise));
  if (rest.reason) parts.push(String(rest.reason));
  return <span className="text-gray-500 text-xs">{parts.join(" · ")}</span>;
}

interface Props {
  actions: ActionEvent[];
}

export function EventFeed({ actions }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          event clock
        </span>
        <h2 className="text-sm font-semibold text-gray-700">Recent Traces</h2>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {actions.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">
              {formatDate(a.ts)}
            </span>
            <span
              className={`text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${ACTION_COLORS[a.type] ?? "bg-gray-100 text-gray-700"}`}
            >
              {a.type}
            </span>
            <ActionDetail action={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
