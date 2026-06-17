"""
Context graph model.

Nodes fall into two categories:
- Entity nodes  : Client, Goal, Injury, Exercise, MuscleGroup, Program
- Action nodes  : timestamped events that form the trajectory
- DecisionTrace : agent decision, also injected back into the graph
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

import networkx as nx

# ── singleton graph ──────────────────────────────────────────────────────────
_graph: nx.DiGraph = nx.DiGraph()


def get_graph() -> nx.DiGraph:
    return _graph


def clear_graph() -> None:
    _graph.clear()


# ── node constructors ────────────────────────────────────────────────────────

def _node_id() -> str:
    return str(uuid.uuid4())


def add_entity(
    kind: str,
    attrs: dict[str, Any],
    node_id: str | None = None,
) -> str:
    nid = node_id or _node_id()
    _graph.add_node(nid, kind=kind, **attrs)
    return nid


def add_action(
    action_type: str,
    client_id: str,
    attrs: dict[str, Any],
    ts: datetime | None = None,
) -> str:
    nid = _node_id()
    _graph.add_node(
        nid,
        kind="action",
        action_type=action_type,
        client_id=client_id,
        ts=(ts or datetime.utcnow()).isoformat(),
        **attrs,
    )
    _graph.add_edge(client_id, nid, rel="HAS_ACTION")
    return nid


def add_decision_trace(
    client_id: str,
    inputs: dict[str, Any],
    rule_evaluated: str,
    exception_invoked: str | None,
    action: str,
    outcome: str,
    source_node_ids: list[str],
) -> str:
    nid = _node_id()
    _graph.add_node(
        nid,
        kind="decision_trace",
        client_id=client_id,
        ts=datetime.utcnow().isoformat(),
        inputs=inputs,
        rule_evaluated=rule_evaluated,
        exception_invoked=exception_invoked,
        action=action,
        outcome=outcome,
    )
    _graph.add_edge(client_id, nid, rel="HAS_DECISION")
    for src in source_node_ids:
        _graph.add_edge(src, nid, rel="CAUSED", probability=1.0)
    return nid


def add_edge(src: str, dst: str, rel: str, probability: float = 1.0) -> None:
    _graph.add_edge(src, dst, rel=rel, probability=probability)


def get_client_subgraph(client_id: str) -> nx.DiGraph:
    """Return the subgraph reachable from client_id (max depth 3)."""
    nodes = nx.single_source_shortest_path_length(_graph, client_id, cutoff=3)
    return _graph.subgraph(list(nodes.keys())).copy()


def get_client_actions(client_id: str) -> list[dict[str, Any]]:
    """Return all action nodes for a client, sorted chronologically."""
    actions = []
    for nid, data in _graph.nodes(data=True):
        if data.get("client_id") == client_id and data.get("kind") == "action":
            actions.append({"id": nid, **data})
    return sorted(actions, key=lambda n: n["ts"])


def get_client_decisions(client_id: str) -> list[dict[str, Any]]:
    decisions = []
    for nid, data in _graph.nodes(data=True):
        if data.get("client_id") == client_id and data.get("kind") == "decision_trace":
            decisions.append({"id": nid, **data})
    return sorted(decisions, key=lambda n: n["ts"])
