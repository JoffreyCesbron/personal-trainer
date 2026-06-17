import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
// @ts-ignore — no perfect typings for dagre plugin
import dagre from "cytoscape-dagre";
import type { GraphPayload } from "../api/types";

cytoscape.use(dagre);

// ── colour palette ─────────────────────────────────────────────────────────────
const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Client:  { bg: "#6366f1", border: "#4f46e5", text: "#ffffff" },
  Goal:    { bg: "#0ea5e9", border: "#0284c7", text: "#ffffff" },
  Program: { bg: "#f59e0b", border: "#d97706", text: "#ffffff" },
  entity:  { bg: "#94a3b8", border: "#64748b", text: "#ffffff" },
};

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SessionLogged:    { bg: "#22c55e", border: "#16a34a", text: "#ffffff" },
  SessionSkipped:   { bg: "#f87171", border: "#ef4444", text: "#ffffff" },
  SorenessReported: { bg: "#fb923c", border: "#f97316", text: "#ffffff" },
  PRHit:            { bg: "#a855f7", border: "#9333ea", text: "#ffffff" },
  AgentDeload:      { bg: "#38bdf8", border: "#0ea5e9", text: "#ffffff" },
};

const DECISION_COLOR = { bg: "#8b5cf6", border: "#7c3aed", text: "#ffffff" };

function resolveColors(kind: string, data: Record<string, unknown>) {
  if (kind === "action") {
    const t = String(data.action_type ?? "");
    return ACTION_COLORS[t] ?? { bg: "#94a3b8", border: "#64748b", text: "#ffffff" };
  }
  if (kind === "decision_trace") return DECISION_COLOR;
  return ENTITY_COLORS[kind] ?? ENTITY_COLORS["entity"];
}

// Shorten long labels for display
function shortLabel(label: string, kind: string): string {
  if (kind === "decision_trace") {
    // "Decision: REDUCE 2026-06-03" → "Agent\nREDUCE"
    // "Decision: REST 2026-06-17"   → "Agent\nREST"
    const match = label.match(/Decision:\s*(\w+)/);
    if (!match) return label;
    const action = match[1];
    const display: Record<string, string> = {
      REST: "Rest day\n(knee pain)",
    };
    return display[action] ?? `Agent\n${action}`;
  }
  const replacements: [RegExp, string][] = [
    [/SessionLogged/g, "Session"],
    [/SessionSkipped/g, "Skipped"],
    [/SorenessReported/g, "Soreness"],
    [/AgentDeload/g, "Deload"],
  ];
  let s = label;
  for (const [re, rep] of replacements) s = s.replace(re, rep);
  return s.length > 22 ? s.slice(0, 20) + "…" : s;
}

interface Props {
  graph: GraphPayload;
  newNodeId?: string;
}

export function GraphCanvas({ graph, newNodeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [
      ...graph.nodes.map((n) => {
        const c = resolveColors(n.kind, n.data);
        const isEntity = !["action", "decision_trace"].includes(n.kind);
        return {
          data: {
            id: n.id,
            label: shortLabel(n.label, n.kind),
            kind: n.kind,
            bg: c.bg,
            border: c.border,
            textColor: c.text,
            isNew: n.is_new,
            isEntity,
          },
        };
      }),
      ...graph.edges.map((e) => ({
        data: {
          id: `${e.source}-${e.target}-${e.rel}`,
          source: e.source,
          target: e.target,
          label: e.probability < 1 ? `p=${e.probability}` : e.rel.replace(/_/g, " ").toLowerCase(),
          prob: e.probability,
        },
      })),
    ];

    cyRef.current?.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // ── base node ──────────────────────────────────────────────────────────
        {
          selector: "node",
          style: {
            "background-color": "data(bg)",
            "border-color": "data(border)",
            "border-width": 2,
            label: "data(label)",
            color: "data(textColor)",
            "font-size": "10px",
            "font-weight": 500,
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "72px",
            width: 80,
            height: 36,
            shape: "round-rectangle",
            "text-outline-width": 0,
          },
        },
        // ── action nodes — smaller circles ─────────────────────────────────────
        {
          selector: "node[kind = 'action']",
          style: {
            width: 70,
            height: 32,
            "font-size": "9px",
          },
        },
        // ── client node — bigger ───────────────────────────────────────────────
        {
          selector: "node[kind = 'Client']",
          style: {
            width: 96,
            height: 44,
            "font-size": "12px",
            "font-weight": 700,
            "border-width": 3,
          },
        },
        // ── decision trace — diamond ───────────────────────────────────────────
        {
          selector: "node[kind = 'decision_trace']",
          style: {
            shape: "diamond",
            width: 48,
            height: 48,
            "font-size": "8px",
            "text-valign": "bottom",
            "text-margin-y": 6,
            color: "#7c3aed",
          },
        },
        // ── new / highlighted node ─────────────────────────────────────────────
        {
          selector: "node[?isNew]",
          style: {
            "border-width": 4,
            "border-color": "#f59e0b",
          },
        },
        // ── edges ──────────────────────────────────────────────────────────────
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#cbd5e1",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "8px",
            color: "#94a3b8",
            "text-rotation": "autorotate",
            "text-background-color": "#ffffff",
            "text-background-opacity": 1,
            "text-background-padding": "2px",
          },
        },
        // ── probabilistic edges — dashed ───────────────────────────────────────
        {
          selector: "edge[prob < 1]",
          style: {
            "line-style": "dashed",
            "line-dash-pattern": [6, 3],
            "line-color": "#e2e8f0",
            color: "#c4b5fd",
          },
        },
      ],
      layout: {
        name: "dagre",
        // @ts-ignore — dagre-specific options not in BaseLayoutOptions
        rankDir: "LR",
        nodeSep: 28,
        rankSep: 90,
        padding: 32,
        animate: true,
        animationDuration: 500,
      } as cytoscape.LayoutOptions,
    });

    // pan/zoom UX
    cyRef.current.minZoom(0.4);
    cyRef.current.maxZoom(3);

    // flash new node
    if (newNodeId) {
      const newNode = cyRef.current.getElementById(newNodeId);
      if (newNode.length) {
        cyRef.current.animate({ fit: { eles: newNode, padding: 80 }, duration: 600 } as any);
        let flash = true;
        const iv = setInterval(() => {
          newNode.style("opacity", flash ? 0.3 : 1);
          flash = !flash;
        }, 280);
        setTimeout(() => { clearInterval(iv); newNode.style("opacity", 1); }, 2500);
      }
    }

    return () => { cyRef.current?.destroy(); cyRef.current = null; };
  }, [graph, newNodeId]);

  return <div ref={containerRef} className="w-full h-full bg-white" />;
}
