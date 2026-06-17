"""
Pure graph traversal — no FastAPI, no LLM.
Computes signals from the context graph for a given client.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from .model import get_graph, get_client_actions


def compute_signals(client_id: str) -> dict[str, Any]:
    actions = get_client_actions(client_id)
    now = datetime.utcnow()
    window_14d = now - timedelta(days=14)
    window_7d = now - timedelta(days=7)

    recent_14 = [a for a in actions if datetime.fromisoformat(a["ts"]) >= window_14d]
    recent_7 = [a for a in actions if datetime.fromisoformat(a["ts"]) >= window_7d]

    sessions_14 = [a for a in recent_14 if a["action_type"] == "SessionLogged"]
    skips_14 = [a for a in recent_14 if a["action_type"] == "SessionSkipped"]
    soreness_7 = [a for a in recent_7 if a["action_type"] == "SorenessReported"]
    prs_14 = [a for a in recent_14 if a["action_type"] == "PRHit"]

    # adherence = sessions / (sessions + skips) over 14 days
    total_planned = len(sessions_14) + len(skips_14)
    adherence_14d = len(sessions_14) / total_planned if total_planned > 0 else 1.0

    # average soreness intensity (0 if none)
    avg_soreness = (
        sum(a.get("intensity", 0) for a in soreness_7) / len(soreness_7)
        if soreness_7 else 0.0
    )

    # drop-off probability — simple heuristic from graph edges
    drop_off_prob = _compute_dropoff_prob(client_id, adherence_14d, skips_14)

    # average RPE over last 7 days
    rpe_values = [a.get("RPE", 0) for a in recent_7 if a["action_type"] == "SessionLogged" and a.get("RPE")]
    avg_rpe_7d = sum(rpe_values) / len(rpe_values) if rpe_values else 0.0

    return {
        "adherence_14d": round(adherence_14d, 2),
        "sessions_14d": len(sessions_14),
        "skips_14d": len(skips_14),
        "soreness_count_7d": len(soreness_7),
        "avg_soreness_intensity_7d": round(avg_soreness, 1),
        "prs_14d": len(prs_14),
        "avg_rpe_7d": round(avg_rpe_7d, 1),
        "drop_off_probability": round(drop_off_prob, 2),
        "recent_actions": [_fmt(a) for a in sorted(actions, key=lambda x: x["ts"], reverse=True)[:10]],
    }


def _compute_dropoff_prob(client_id: str, adherence: float, skips: list[dict]) -> float:
    """
    Heuristic drop-off probability from seeded edge weights.
    SessionSkipped(monday) -[PREDICTS p=0.7]-> WeekSkipped is modelled here
    as a function of adherence and consecutive skips.
    """
    G = get_graph()
    base = 1.0 - adherence  # low adherence → higher drop-off risk

    # check if any skip edge in the graph carries a PREDICTS weight
    boost = 0.0
    for nid, data in G.nodes(data=True):
        if data.get("client_id") == client_id and data.get("action_type") == "SessionSkipped":
            for _, _, edata in G.out_edges(nid, data=True):
                if edata.get("rel") == "PREDICTS":
                    boost = max(boost, edata.get("probability", 0.0))

    return min(base + boost * 0.3, 1.0)


def _fmt(action: dict) -> dict:
    return {
        "id": action["id"],
        "type": action["action_type"],
        "ts": action["ts"],
        **{k: v for k, v in action.items() if k not in ("id", "action_type", "ts", "kind", "client_id")},
    }
