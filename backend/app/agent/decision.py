"""
Orchestrates: graph traversal → deterministic rule → LLM language → DecisionTrace node.
"""

from __future__ import annotations

from typing import Any

from app.graph.traversal import compute_signals
from app.graph.model import get_graph, add_decision_trace, get_client_decisions
from app.agent.rules import decide
from app.agent.llm import generate_recommendation, narrate_trace


def run_agent(client_id: str, persist: bool = True) -> dict[str, Any]:
    """
    persist=True  → triggered by a real event; writes a new DecisionTrace node.
    persist=False → read-only pass for GET endpoints; re-uses the last trace.
    """
    G = get_graph()
    client_data = dict(G.nodes[client_id])
    client_name = client_data.get("name", client_id)

    # 1. Traverse graph → signals (the decision clock)
    signals = compute_signals(client_id)

    # 2. Deterministic rule → action (NO LLM here)
    action, rule, exception = decide(signals)

    # 3. Retrieve current program node
    program_node = _get_program(client_id, G)

    if persist:
        # 4. LLM → language only
        lang = generate_recommendation(client_name, action, signals, program_node)
        narration = narrate_trace(client_name, action, rule, exception, signals)

        # 5. Emit DecisionTrace node back into the graph (learning loop)
        source_action_ids = [a["id"] for a in signals["recent_actions"][:3]]
        trace_id = add_decision_trace(
            client_id=client_id,
            inputs=signals,
            rule_evaluated=rule,
            exception_invoked=exception,
            action=action,
            outcome=lang["adjusted_program"][:120],
            source_node_ids=source_action_ids,
        )
    else:
        # Read-only: reuse last decision's language if it exists
        existing = get_client_decisions(client_id)
        if existing:
            last = existing[-1]
            lang = {
                "adjusted_program": last.get("outcome", ""),
                "checkin_message": "",
            }
            narration = ""
            trace_id = last["id"]
        else:
            # First ever load — persist once
            lang = generate_recommendation(client_name, action, signals, program_node)
            narration = narrate_trace(client_name, action, rule, exception, signals)
            source_action_ids = [a["id"] for a in signals["recent_actions"][:3]]
            trace_id = add_decision_trace(
                client_id=client_id,
                inputs=signals,
                rule_evaluated=rule,
                exception_invoked=exception,
                action=action,
                outcome=lang["adjusted_program"][:120],
                source_node_ids=source_action_ids,
            )

    return {
        "client_id": client_id,
        "client_name": client_name,
        "signals": signals,
        "decision": {
            "action": action,
            "rule_evaluated": rule,
            "exception_invoked": exception,
        },
        "recommendation": {
            "adjusted_program": lang["adjusted_program"],
            "checkin_message": lang.get("checkin_message", ""),
            "narration": narration if persist else "",
        },
        "trace_id": trace_id,
    }


def _get_program(client_id: str, G) -> dict[str, Any]:
    for _, dst, data in G.out_edges(client_id, data=True):
        if data.get("rel") == "FOLLOWS":
            return dict(G.nodes[dst])
    return {}
