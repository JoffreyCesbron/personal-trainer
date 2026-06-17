import { useEffect, useState } from "react";
import { fetchGraph } from "../api/client";
import type { GraphPayload } from "../api/types";
import { GraphCanvas } from "../components/GraphCanvas";
import { useEphemeralGraph } from "../context/EphemeralGraph";

const CLIENT_ID = "client_alice";

export function GraphView() {
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [newNodeId, setNewNodeId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ephemeral = useEphemeralGraph();
  const { resetKey } = ephemeral;

  async function load(highlightId?: string) {
    try {
      const g = await fetchGraph(CLIENT_ID);
      setGraph(g);
      if (highlightId) {
        setNewNodeId(highlightId);
        setTimeout(() => setNewNodeId(undefined), 3000);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [resetKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
        Loading graph…
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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-slate-900">Context Graph</p>
          <p className="text-xs text-slate-400">Alice Martin — trajectory subgraph</p>
        </div>
        <div className="flex items-center gap-6">
          <Legend />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{graph ? `${graph.nodes.length + ephemeral.nodes.length} nodes · ${graph.edges.length + ephemeral.edges.length} edges` : ""}</span>
            <button
              onClick={() => load()}
              className="text-indigo-500 hover:text-indigo-700 underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {graph && (
          <GraphCanvas
            graph={{
              nodes: [
                ...graph.nodes,
                ...ephemeral.nodes.filter((en) => !graph.nodes.some((n) => n.id === en.id)),
              ],
              edges: [
                ...graph.edges,
                ...ephemeral.edges,
              ],
            }}
            newNodeId={newNodeId ?? (ephemeral.nodes.length > 0 ? ephemeral.nodes[ephemeral.nodes.length - 1].id : undefined)}
          />
        )}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { color: "#6366f1", label: "Client", shape: "rounded" },
    { color: "#22c55e", label: "Session", shape: "rounded" },
    { color: "#ef4444", label: "Skip", shape: "rounded" },
    { color: "#f97316", label: "Soreness", shape: "rounded" },
    { color: "#a855f7", label: "PR", shape: "rounded" },
    { color: "#8b5cf6", label: "Agent decision", shape: "diamond" },
  ];
  return (
    <div className="flex gap-3 items-center">
      {items.map(({ color, label, shape }) => (
        <div key={label} className="flex items-center gap-1.5">
          {shape === "diamond" ? (
            <span
              className="w-2.5 h-2.5 flex-shrink-0 rotate-45"
              style={{ background: color }}
            />
          ) : (
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
          )}
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
