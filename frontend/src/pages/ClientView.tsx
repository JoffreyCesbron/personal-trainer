import { useEffect, useState } from "react";
import { fetchClient } from "../api/client";
import type { ClientState } from "../api/types";
import { ClientProfile } from "../components/ClientProfile";
import { TodayProgram } from "../components/TodayProgram";
import { ChatPanel } from "../components/ChatPanel";
import { Trajectory } from "../components/Trajectory";

const CLIENT_ID = "client_alice";

export function ClientView() {
  const [clientState, setClientState] = useState<ClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restDay, setRestDay] = useState(false);

  async function handleReset() {
    setRestDay(false);
    await fetch("/api/reset", { method: "POST" });
  }

  useEffect(() => {
    setLoading(true);
    fetchClient(CLIENT_ID)
      .then((resp) => setClientState(resp.client_state))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
        Loading context graph…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 text-red-400 text-sm">
        Error: {error}
      </div>
    );
  }

  if (!clientState) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex-shrink-0">
        <p className="text-xs text-slate-400">
          Coach dashboard —{" "}
          <span className="text-slate-700 font-medium">{clientState.name}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <ClientProfile clientState={clientState} />
          <TodayProgram clientState={clientState} restDay={restDay} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ChatPanel
            clientId={CLIENT_ID}
            onAcceptRestDay={() => setRestDay(true)}
            onReset={handleReset}
          />
          <Trajectory actions={clientState.recent_actions} />
        </div>

      </div>
    </div>
  );
}
