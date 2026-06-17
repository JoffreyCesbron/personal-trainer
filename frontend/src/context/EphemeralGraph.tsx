import { createContext, useContext, useState } from "react";
import type { GraphNode, GraphEdge } from "../api/types";

interface EphemeralGraphValue {
  nodes: GraphNode[];
  edges: GraphEdge[];
  resetKey: number;
  addSorenessNode: (zone: string, intensity: number) => void;
  clear: () => void;
}

const EphemeralGraphCtx = createContext<EphemeralGraphValue>({
  nodes: [],
  edges: [],
  resetKey: 0,
  addSorenessNode: () => {},
  clear: () => {},
});

export function EphemeralGraphProvider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [resetKey, setResetKey] = useState(0);

  function addSorenessNode(zone: string, intensity: number) {
    const sorenessId = `ephemeral_soreness_${zone.replace(/\s+/g, "_")}`;
    const decisionId = `ephemeral_decision_${zone.replace(/\s+/g, "_")}`;
    const today = new Date().toISOString().slice(0, 10);

    setNodes((prev) => {
      if (prev.some((n) => n.id === sorenessId)) return prev;
      return [
        ...prev,
        {
          id: sorenessId,
          kind: "action",
          label: `Soreness — ${zone} (${today})`,
          data: { action_type: "SorenessReported", zone, intensity, ts: today },
          is_new: true,
        },
        {
          id: decisionId,
          kind: "decision_trace",
          label: `Decision: REST ${today}`,
          data: {
            action: "REST",
            rule_evaluated: `Recurring ${zone} pain + prior injury → rest day`,
            ts: today,
          },
          is_new: true,
        },
      ];
    });

    setEdges((prev) => {
      if (prev.some((e) => e.source === "client_alice" && e.target === sorenessId)) return prev;
      return [
        ...prev,
        { source: "client_alice", target: sorenessId, rel: "LOGGED",       probability: 1.0 },
        { source: "client_alice", target: decisionId, rel: "HAS_DECISION",  probability: 1.0 },
        { source: sorenessId,     target: decisionId, rel: "CAUSED",        probability: 1.0 },
      ];
    });
  }

  function clear() {
    setNodes([]);
    setEdges([]);
    setResetKey((k) => k + 1);
  }

  return (
    <EphemeralGraphCtx.Provider value={{ nodes, edges, resetKey, addSorenessNode, clear }}>
      {children}
    </EphemeralGraphCtx.Provider>
  );
}

export const useEphemeralGraph = () => useContext(EphemeralGraphCtx);
