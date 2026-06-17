from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from app.graph.model import (
    get_graph,
    get_client_subgraph,
    get_client_actions,
    add_action,
    clear_graph,
)
from app.graph.seed import CLIENTS, seed
from app.agent.decision import run_agent
from app.agent.llm import chat_with_coach
from app.api.schemas import (
    SorenessEvent,
    ClientState,
    DecisionResult,
    GraphNode,
    ChatRequest,
    ChatResponse,
    GraphContextNode,
    GraphEdge,
    GraphPayload,
    EventResponse,
)

router = APIRouter()


# ── GET /clients ─────────────────────────────────────────────────────────────

@router.get("/clients")
def list_clients() -> list[dict[str, Any]]:
    G = get_graph()
    return [
        {"id": cid, "name": G.nodes[cid].get("name", cid)}
        for cid in CLIENTS
        if cid in G.nodes
    ]


# ── GET /clients/{client_id} ─────────────────────────────────────────────────

@router.get("/clients/{client_id}")
def get_client(client_id: str) -> dict[str, Any]:
    G = get_graph()
    if client_id not in G.nodes:
        raise HTTPException(status_code=404, detail="Client not found")

    node = dict(G.nodes[client_id])
    program = _get_program(client_id, G)
    actions = get_client_actions(client_id)

    client_state = ClientState(
        id=client_id,
        name=node.get("name", client_id),
        goal=node.get("goal", ""),
        program=program,
        recent_actions=[_fmt_action(a) for a in reversed(actions[-10:])],
    )

    result = run_agent(client_id, persist=False)

    return {
        "client_state": client_state.model_dump(),
        "decision": DecisionResult(
            signals=result["signals"],
            decision=result["decision"],
            recommendation=result["recommendation"],
            trace_id=result["trace_id"],
        ).model_dump(),
    }


# ── POST /events ──────────────────────────────────────────────────────────────

@router.post("/events/{client_id}/soreness")
def report_soreness(client_id: str, body: SorenessEvent) -> EventResponse:
    G = get_graph()
    if client_id not in G.nodes:
        raise HTTPException(status_code=404, detail="Client not found")

    # Inject new action node into the graph
    add_action(
        "SorenessReported",
        client_id,
        {"zone": body.zone, "intensity": body.intensity},
        datetime.utcnow(),
    )

    # Re-run agent (traverses updated graph)
    result = run_agent(client_id)

    # Build graph delta (last 20 nodes scoped to this client)
    delta = _build_graph_delta(client_id, new_trace_id=result["trace_id"])

    node = dict(G.nodes[client_id])
    program = _get_program(client_id, G)
    actions = get_client_actions(client_id)

    client_state = ClientState(
        id=client_id,
        name=node.get("name", client_id),
        goal=node.get("goal", ""),
        program=program,
        recent_actions=[_fmt_action(a) for a in reversed(actions[-10:])],
    )

    return EventResponse(
        client_state=client_state,
        decision=DecisionResult(
            signals=result["signals"],
            decision=result["decision"],
            recommendation=result["recommendation"],
            trace_id=result["trace_id"],
        ),
        graph_delta=delta,
    )


# ── POST /chat/{client_id} ───────────────────────────────────────────────────

@router.post("/chat/{client_id}")
def chat(client_id: str, body: ChatRequest) -> ChatResponse:
    G = get_graph()
    if client_id not in G.nodes:
        raise HTTPException(status_code=404, detail="Client not found")

    from app.graph.traversal import compute_signals
    from app.graph.model import get_client_decisions, get_client_actions

    client_name = G.nodes[client_id].get("name", client_id)
    client_node = dict(G.nodes[client_id])
    signals = compute_signals(client_id)
    decisions = get_client_decisions(client_id)
    current_action = decisions[-1]["action"] if decisions else "MAINTAIN"
    program = _get_program(client_id, G)

    # Collect all soreness nodes
    all_actions = get_client_actions(client_id)
    soreness_nodes = [
        a for a in all_actions if a.get("action_type") == "SorenessReported"
    ]

    graph_context = {
        "signals": signals,
        "current_action": current_action,
        "injury_notes": client_node.get("injury_notes", "None"),
        "current_program": program,
        "soreness_nodes": soreness_nodes,
    }

    history = [{"role": m.role, "content": m.content} for m in body.history]

    reply = chat_with_coach(
        client_name=client_name,
        user_message=body.message,
        graph_context=graph_context,
        history=history,
    )

    # Build the list of graph nodes consulted — for "Graph Explained"
    context_nodes = _build_graph_context_nodes(
        client_id=client_id,
        client_node=client_node,
        program=program,
        soreness_nodes=soreness_nodes,
        decisions=decisions,
        user_message=body.message,
    )

    return ChatResponse(reply=reply, graph_context=context_nodes)


# ── POST /reset ──────────────────────────────────────────────────────────────

@router.post("/reset")
def reset_graph() -> dict[str, str]:
    clear_graph()
    seed()
    return {"status": "ok"}


# ── GET /graph/{client_id} ────────────────────────────────────────────────────

@router.get("/graph/{client_id}")
def get_client_graph(client_id: str) -> GraphPayload:
    G = get_graph()
    if client_id not in G.nodes:
        raise HTTPException(status_code=404, detail="Client not found")
    return _build_graph_delta(client_id)


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_program(client_id: str, G) -> dict[str, Any]:
    for _, dst, data in G.out_edges(client_id, data=True):
        if data.get("rel") == "FOLLOWS":
            return dict(G.nodes[dst])
    return {}


def _fmt_action(action: dict) -> dict:
    return {k: v for k, v in action.items() if k not in ("kind", "client_id")}


def _node_label(data: dict) -> str:
    kind = data.get("kind", "")
    if kind == "action":
        ts = data.get("ts", "")[:10]
        return f"{data.get('action_type', 'action')} {ts}"
    if kind == "decision_trace":
        return f"Decision: {data.get('action', '')} {data.get('ts', '')[:10]}"
    return data.get("label", data.get("name", kind))


def _build_graph_delta(client_id: str, new_trace_id: str | None = None) -> GraphPayload:
    sub = get_client_subgraph(client_id)
    nodes = []
    edges = []

    for nid, data in sub.nodes(data=True):
        nodes.append(GraphNode(
            id=nid,
            kind=data.get("kind", "entity"),
            label=_node_label(data),
            data={k: v for k, v in data.items() if k != "kind"},
            is_new=(nid == new_trace_id),
        ))

    for src, dst, data in sub.edges(data=True):
        edges.append(GraphEdge(
            source=src,
            target=dst,
            rel=data.get("rel", "RELATED"),
            probability=data.get("probability", 1.0),
        ))

    return GraphPayload(nodes=nodes, edges=edges)


def _build_graph_context_nodes(
    client_id: str,
    client_node: dict[str, Any],
    program: dict[str, Any],
    soreness_nodes: list[dict[str, Any]],
    decisions: list[dict[str, Any]],
    user_message: str,
) -> list[GraphContextNode]:
    msg_lower = user_message.lower()
    pain_keywords = ["pain", "sore", "hurt", "ache", "knee", "back", "shoulder", "injury"]
    is_pain_related = any(w in msg_lower for w in pain_keywords)

    nodes: list[GraphContextNode] = []

    # Always include client node
    injury_notes = client_node.get("injury_notes", "None")
    has_relevant_injury = is_pain_related and any(
        w in injury_notes.lower() for w in msg_lower.split()
        if len(w) > 3
    )
    nodes.append(GraphContextNode(
        id=client_id,
        kind="Client",
        label=client_node.get("name", client_id),
        reason=(
            f"Prior injury on record: '{injury_notes}' — cross-referenced with current pain report"
            if has_relevant_injury
            else "Client profile — goal and injury history"
        ),
        data={
            "goal": client_node.get("goal", ""),
            "injury_notes": injury_notes,
        },
    ))

    # Always include current program
    if program:
        nodes.append(GraphContextNode(
            id="program",
            kind="Program",
            label=program.get("label", "Current program"),
            reason="Current program — exercises and loads used to suggest alternatives",
            data={
                "sessions_per_week": program.get("sessions_per_week"),
                "focus": program.get("focus"),
                "exercises": program.get("exercises", []),
            },
        ))

    # Soreness nodes — all if pain-related, last 2 otherwise
    relevant_soreness = soreness_nodes if is_pain_related else soreness_nodes[-2:]

    # Detect overtraining pattern: same zone appears 2+ times
    zone_counts: dict[str, int] = {}
    for s in soreness_nodes:
        z = s.get("zone", "").lower()
        zone_counts[z] = zone_counts.get(z, 0) + 1

    for i, s in enumerate(relevant_soreness):
        zone = s.get("zone", "")
        zone_key = zone.lower()
        count = zone_counts.get(zone_key, 1)
        occurrence = sum(
            1 for prev in soreness_nodes[:soreness_nodes.index(s) + 1]
            if prev.get("zone", "").lower() == zone_key
        )

        if is_pain_related and count >= 2 and zone_key in msg_lower.replace("knee", "knee").lower() or "knee" in zone_key and is_pain_related:
            reason = (
                f"Overtraining signal — {zone} reported {count}x in 2 weeks "
                f"(occurrence {occurrence}/{count}). Recurring pain in the same zone."
            )
        elif is_pain_related:
            reason = f"Soreness event #{i + 1} — part of the injury pattern analyzed by the coach"
        else:
            reason = "Recent soreness — part of fatigue context"

        nodes.append(GraphContextNode(
            id=s["id"],
            kind="SorenessReported",
            label=f"Soreness — {zone} ({s['ts'][:10]})",
            reason=reason,
            data={"zone": zone, "intensity": s.get("intensity"), "ts": s["ts"][:10]},
        ))

    # Last decision trace
    if decisions:
        last = decisions[-1]
        nodes.append(GraphContextNode(
            id=last["id"],
            kind="DecisionTrace",
            label=f"Agent decision — {last.get('action', '')} ({last['ts'][:10]})",
            reason="Most recent agent decision — provides current training directive context",
            data={
                "action": last.get("action"),
                "rule_evaluated": last.get("rule_evaluated"),
                "ts": last["ts"][:10],
            },
        ))

    return nodes
