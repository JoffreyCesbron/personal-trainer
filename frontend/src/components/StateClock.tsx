import type { ClientState } from "../api/types";

interface Props {
  clientState: ClientState;
}

export function StateClock({ clientState }: Props) {
  const { name, goal, program } = clientState;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          state clock
        </span>
        <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        <span className="font-medium text-gray-800">Goal:</span> {goal}
      </p>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          {program.label} — {program.sessions_per_week}x/week — {program.focus}
        </p>
        <div className="grid grid-cols-1 gap-1">
          {program.exercises?.map((ex) => (
            <div key={ex.name} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
              <span className="font-medium text-gray-800">{ex.name}</span>
              <span>
                {ex.sets}×{ex.reps}
                {ex.load_kg != null ? ` @ ${ex.load_kg}kg` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
