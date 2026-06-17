"""
Deterministic decision rules.
Input: signals dict from traversal.compute_signals()
Output: (action, rule_name, exception | None)

The LLM is NOT involved here. This is the graph decision.
"""

from __future__ import annotations

from typing import Any


def decide(signals: dict[str, Any]) -> tuple[str, str, str | None]:
    """
    Returns (action, rule_evaluated, exception_invoked).

    Rules (evaluated in priority order):
    1. DELOAD   — adherence < 60% AND soreness_count >= 2
    2. DELOAD   — avg soreness intensity >= 6 (regardless of adherence)
    3. REDUCE   — adherence < 75% OR soreness_count >= 1
    4. PROGRESS — adherence >= 90% AND prs > 0 AND avg_rpe <= 7
    5. MAINTAIN — default
    """
    adherence = signals["adherence_14d"]
    soreness_count = signals["soreness_count_7d"]
    avg_soreness = signals["avg_soreness_intensity_7d"]
    prs = signals["prs_14d"]
    avg_rpe = signals["avg_rpe_7d"]

    # Rule 1 — combined fatigue + drop-off signal
    if adherence < 0.60 and soreness_count >= 2:
        return (
            "DELOAD",
            "adherence_14d < 60% AND soreness_count_7d >= 2",
            None,
        )

    # Rule 2 — high pain intensity overrides everything
    if avg_soreness >= 6.0:
        return (
            "DELOAD",
            "avg_soreness_intensity_7d >= 6",
            "high_pain_override",
        )

    # Rule 3 — moderate fatigue
    if adherence < 0.75 or soreness_count >= 1:
        return (
            "REDUCE",
            "adherence_14d < 75% OR soreness_count_7d >= 1",
            None,
        )

    # Rule 4 — momentum detected
    if adherence >= 0.90 and prs > 0 and avg_rpe <= 7.0:
        return (
            "PROGRESS",
            "adherence_14d >= 90% AND prs_14d > 0 AND avg_rpe_7d <= 7",
            None,
        )

    return ("MAINTAIN", "default", None)
