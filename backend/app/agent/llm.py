"""
Anthropic API calls — language generation ONLY.
The decision has already been made before any of these are called.
Falls back to static text if the API key is absent or invalid.
"""

from __future__ import annotations

import os
from typing import Any


def _is_fallback() -> bool:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    return not key or key.startswith("sk-ant-dummy") or key == "dummy"


def _client():
    import anthropic
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


# ── recommendation ────────────────────────────────────────────────────────────

def generate_recommendation(
    client_name: str,
    action: str,
    signals: dict[str, Any],
    current_program: dict[str, Any],
) -> dict[str, str]:
    if _is_fallback():
        return _fallback_recommendation(action)
    try:
        return _call_generate(client_name, action, signals, current_program)
    except Exception:
        return _fallback_recommendation(action)


def narrate_trace(
    client_name: str,
    action: str,
    rule: str,
    exception: str | None,
    signals: dict[str, Any],
) -> str:
    if _is_fallback():
        return _fallback_narration(action)
    try:
        return _call_narrate(client_name, action, rule, exception, signals)
    except Exception:
        return _fallback_narration(action)


# ── chat ──────────────────────────────────────────────────────────────────────

def chat_with_coach(
    client_name: str,
    user_message: str,
    graph_context: dict[str, Any],
    history: list[dict[str, str]],
) -> str:
    if _is_fallback():
        return _fallback_chat(user_message, graph_context)
    try:
        return _call_chat(client_name, user_message, graph_context, history)
    except Exception:
        return _fallback_chat(user_message, graph_context)


# ── real API calls ────────────────────────────────────────────────────────────

def _call_generate(
    client_name: str,
    action: str,
    signals: dict[str, Any],
    current_program: dict[str, Any],
) -> dict[str, str]:
    prompt = f"""You are a fitness coach assistant. The agent has already made its decision.
Your only job is to translate it into human language.

Client: {client_name}
Decision: {action}
Signals:
- Adherence (14d): {signals["adherence_14d"] * 100:.0f}%
- Soreness events (7d): {signals["soreness_count_7d"]} (avg intensity {signals["avg_soreness_intensity_7d"]}/10)
- PRs hit (14d): {signals["prs_14d"]}
- Average RPE (7d): {signals["avg_rpe_7d"]}
- Drop-off probability: {signals["drop_off_probability"] * 100:.0f}%

Current program: {current_program.get("label", "N/A")}
Exercises: {current_program.get("exercises", [])}

Based on the decision "{action}", produce:
1. ADJUSTED_PROGRAM: A short paragraph describing the adjusted program for next week
   (keep it concrete — exercise names, load changes, session count).
2. CHECKIN_MESSAGE: A 2-3 sentence check-in message to send to the client
   (warm, direct, coach tone — no emojis).

Format your response EXACTLY as:
ADJUSTED_PROGRAM: <text>
CHECKIN_MESSAGE: <text>"""

    msg = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_llm_output(msg.content[0].text)


def _call_narrate(
    client_name: str,
    action: str,
    rule: str,
    exception: str | None,
    signals: dict[str, Any],
) -> str:
    prompt = f"""You are a fitness coach assistant explaining a decision made by the system.

Client: {client_name}
Decision: {action}
Rule triggered: {rule}
Exception: {exception or "none"}
Signals: adherence={signals["adherence_14d"]*100:.0f}%, soreness={signals["soreness_count_7d"]}, avg_intensity={signals["avg_soreness_intensity_7d"]}, drop-off risk={signals["drop_off_probability"]*100:.0f}%

Write 2-3 sentences in plain English explaining WHY this decision was made.
Be specific about which signals triggered the rule. No jargon, no emojis."""

    msg = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


def _call_chat(
    client_name: str,
    user_message: str,
    graph_context: dict[str, Any],
    history: list[dict[str, str]],
) -> str:
    soreness_history = graph_context.get("soreness_nodes", [])
    injury_notes = graph_context.get("injury_notes", "None")
    current_program = graph_context.get("current_program", {})
    signals = graph_context.get("signals", {})
    current_action = graph_context.get("current_action", "MAINTAIN")

    soreness_lines = "\n".join(
        f"  - {s['ts'][:10]}: {s['zone']} (intensity {s['intensity']}/10)"
        for s in soreness_history
    ) or "  None recorded"

    exercises = current_program.get("exercises", [])
    program_lines = "\n".join(
        f"  - {e['name']}: {e['sets']}x{e['reps']}"
        + (f" @ {e['load_kg']}kg" if e.get("load_kg") else "")
        for e in exercises
    ) or "  N/A"

    system = f"""You are a virtual fitness coach for {client_name}. You have access to her full training history from the context graph.

== CONTEXT GRAPH DATA ==
Injury history: {injury_notes}

All soreness events from graph (chronological):
{soreness_lines}

Current program ({current_program.get("label", "N/A")}):
{program_lines}

Training signals:
- 14-day adherence: {signals.get("adherence_14d", 0) * 100:.0f}%
- Soreness events this week: {signals.get("soreness_count_7d", 0)}
- Current agent decision: {current_action}

== YOUR ROLE ==
- Answer warmly and specifically — always reference actual data from her history.
- If she reports pain, look at the PATTERN across all soreness events. If the same zone appears multiple times, or she has a prior injury there, flag it as a likely overtraining signal.
- Be direct: name the pattern ("you've reported knee pain 3 times in 2 weeks"), explain the risk, and give a concrete recommendation (reduce load, rest, or adapt exercises).
- If overtraining is suspected, say so clearly and recommend backing off — not pushing through.
- Be concise: 3-5 sentences. No emojis. No generic advice."""

    messages = history[-6:] + [{"role": "user", "content": user_message}]

    msg = _client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=system,
        messages=messages,
    )
    return msg.content[0].text.strip()


# ── fallback static responses ─────────────────────────────────────────────────

_ACTION_PROGRAM: dict[str, str] = {
    "DELOAD": (
        "Next week is a deload: drop to 3 sessions, reduce all loads by 40%, "
        "cap sets at 2 per exercise. Focus on movement quality, not performance."
    ),
    "REDUCE": (
        "Reduce to 3 sessions this week. Lower loads by 15-20% across the board "
        "and cut one set per exercise. Prioritise recovery."
    ),
    "MAINTAIN": (
        "Keep the current program as-is: same loads, same volume, same frequency. "
        "Stay consistent and track RPE carefully."
    ),
    "PROGRESS": (
        "Good momentum — add 2.5 kg to the main compound lifts and one extra set "
        "to the accessory work. Aim for the same RPE range."
    ),
}

_ACTION_CHECKIN: dict[str, str] = {
    "DELOAD": (
        "Hey, your body has been sending clear signals — it's time for a proper deload. "
        "This week we're pulling back significantly. Trust the process: recovery is where progress is made."
    ),
    "REDUCE": (
        "I've noticed your adherence has dipped and you've had some soreness lately. "
        "Let's dial things back a notch this week — lighter loads, fewer sets. "
        "Better to train at 80% than to skip sessions entirely."
    ),
    "MAINTAIN": (
        "You're tracking well. Stick with the current program this week — "
        "consistency here is what builds long-term results. Keep it up."
    ),
    "PROGRESS": (
        "You've been crushing it — great adherence and a new PR this cycle. "
        "We're adding a bit more load this week to keep the momentum going. "
        "Stay focused on your technique as the weights go up."
    ),
}

_ACTION_NARRATION: dict[str, str] = {
    "DELOAD": (
        "Attendance dropped below 60% and multiple soreness events were logged — "
        "the body is showing signs of accumulated fatigue. A full deload was triggered to allow proper recovery."
    ),
    "REDUCE": (
        "Attendance fell below 75% and recent soreness was detected. "
        "Load is being reduced as a precaution before fatigue compounds further."
    ),
    "MAINTAIN": (
        "All signals are within normal range — solid attendance, no significant soreness, consistent effort. "
        "No change to the program is needed."
    ),
    "PROGRESS": (
        "High attendance, a new personal record, and manageable effort levels. "
        "The body has adapted and is ready for a small increase in load."
    ),
}


def _fallback_recommendation(action: str) -> dict[str, str]:
    return {
        "adjusted_program": _ACTION_PROGRAM.get(action, _ACTION_PROGRAM["MAINTAIN"]),
        "checkin_message": _ACTION_CHECKIN.get(action, _ACTION_CHECKIN["MAINTAIN"]),
    }


def _fallback_narration(action: str) -> str:
    return _ACTION_NARRATION.get(action, _ACTION_NARRATION["MAINTAIN"])


def _fallback_chat(user_message: str, graph_context: dict[str, Any]) -> str:
    msg_lower = user_message.lower()
    soreness_nodes = graph_context.get("soreness_nodes", [])
    injury_notes = graph_context.get("injury_notes", "")

    pain_keywords = ["knee", "pain", "sore", "hurt", "ache", "mal", "genou", "douleur"]
    if not any(w in msg_lower for w in pain_keywords):
        return (
            "Based on your recent training data, things are progressing. "
            "Let me know if you have any specific questions about your program or recovery."
        )

    knee_events = [s for s in soreness_nodes if "knee" in s.get("zone", "").lower()]
    all_event_count = len(soreness_nodes)
    has_prior_injury = "knee" in injury_notes.lower()

    if knee_events or has_prior_injury:
        dates = ", ".join(s["ts"][:10] for s in soreness_nodes)
        zones = ", ".join(f"{s['zone']} ({s['intensity']}/10)" for s in soreness_nodes)
        return (
            f"Looking at your history, you've had {all_event_count} soreness events over the past two weeks: {zones}. "
            f"{'You also have a history of left knee tendinitis. ' if has_prior_injury else ''}"
            "This pattern — repeated pain in the same area combined with missed sessions — is a classic overtraining signal. "
            "I strongly recommend taking 3-4 days off completely, then coming back with a reduced load: "
            "drop Squats in favour of Leg Press or Hip Thrusts to spare the knee, reduce all loads by 20%, "
            "and cap sessions at 3 this week. Pushing through right now risks turning a warning into a real injury."
        )

    return (
        f"You've reported {all_event_count} soreness event(s) recently. "
        "Let's take it easy this week — reduce loads by 15-20% and avoid exercises that aggravate the painful area. "
        "If the pain persists beyond a few days, consider a full rest day before your next session."
    )


def _parse_llm_output(text: str) -> dict[str, str]:
    adjusted = ""
    checkin = ""
    for line in text.splitlines():
        if line.startswith("ADJUSTED_PROGRAM:"):
            adjusted = line[len("ADJUSTED_PROGRAM:"):].strip()
        elif line.startswith("CHECKIN_MESSAGE:"):
            checkin = line[len("CHECKIN_MESSAGE:"):].strip()
    return {"adjusted_program": adjusted, "checkin_message": checkin}
