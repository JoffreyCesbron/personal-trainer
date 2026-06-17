import type { ClientState } from "../api/types";

interface Props {
  clientState: ClientState;
}

export function ClientProfile({ clientState }: Props) {
  const { name, goal, program } = clientState;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {name[0]}
        </span>
        <div>
          <p className="font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-400">Personal coaching</p>
        </div>
      </div>

      <div className="space-y-2">
        <Row label="Goal" value={goal} />
        <Row label="Program" value={`${program.label} — ${program.sessions_per_week}x/week`} />
        <Row label="Focus" value={program.focus} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-400 w-20 flex-shrink-0">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
