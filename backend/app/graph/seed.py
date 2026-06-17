"""
Synthetic seed data — 2 clients, ~2-3 weeks of realistic traces.
Called once at startup to populate the context graph.
"""

from datetime import datetime, timedelta

from .model import add_entity, add_action, add_edge, get_graph

# ── helpers ──────────────────────────────────────────────────────────────────

def _day(offset: int) -> datetime:
    """offset days relative to 2026-06-01 (reference Monday)."""
    return datetime(2026, 6, 1) + timedelta(days=offset)


# ── public entry point ────────────────────────────────────────────────────────

CLIENTS: dict[str, dict] = {}  # client_id -> metadata


def seed() -> None:
    if get_graph().number_of_nodes() > 0:
        return  # already seeded

    _seed_alice()
    _seed_bob()


# ── Alice — adherence drop + soreness → agent deload ─────────────────────────

def _seed_alice() -> None:
    alice_id = add_entity("Client", {
        "name": "Alice Martin",
        "age": 32,
        "goal": "Lose 5 kg while keeping strength",
        "injury_notes": "Left knee tendinitis (resolved)",
    }, node_id="client_alice")

    goal_id = add_entity("Goal", {
        "label": "Fat loss + strength maintenance",
        "target_weight_kg": 62,
        "current_weight_kg": 67,
    }, node_id="goal_alice")

    program_id = add_entity("Program", {
        "label": "Alice — Week 3",
        "sessions_per_week": 4,
        "focus": "Full body moderate intensity",
        "exercises": [
            {"name": "Squat", "sets": 4, "reps": "8", "load_kg": 50},
            {"name": "Romanian Deadlift", "sets": 3, "reps": "10", "load_kg": 40},
            {"name": "Push-up", "sets": 3, "reps": "12", "load_kg": None},
            {"name": "Cable Row", "sets": 3, "reps": "10", "load_kg": 35},
        ],
    }, node_id="program_alice")

    add_edge(alice_id, goal_id, "HAS_GOAL")
    add_edge(alice_id, program_id, "FOLLOWS", probability=1.0)

    CLIENTS["client_alice"] = {
        "id": alice_id,
        "name": "Alice Martin",
        "goal_id": goal_id,
        "program_id": program_id,
    }

    # Week 1 — good adherence
    add_action("SessionLogged", alice_id, {"load_kg": 50, "RPE": 7, "session": "Full body A"}, _day(0))
    add_action("SessionLogged", alice_id, {"load_kg": 40, "RPE": 6, "session": "Full body B"}, _day(2))
    add_action("SessionLogged", alice_id, {"load_kg": 52, "RPE": 7, "session": "Full body A"}, _day(4))
    add_action("SessionLogged", alice_id, {"load_kg": 40, "RPE": 7, "session": "Full body B"}, _day(6))

    # Week 2 — first skip + soreness appears
    add_action("SessionLogged", alice_id, {"load_kg": 52, "RPE": 8, "session": "Full body A"}, _day(7))
    add_action("SorenessReported", alice_id, {"zone": "left knee", "intensity": 4}, _day(8))
    add_action("SessionSkipped", alice_id, {"reason": "knee pain"}, _day(9))
    add_action("SessionLogged", alice_id, {"load_kg": 45, "RPE": 6, "session": "Full body B"}, _day(11))
    add_action("SessionSkipped", alice_id, {"reason": "fatigue"}, _day(13))

    # Week 3 — adherence drops further, more soreness
    add_action("SessionLogged", alice_id, {"load_kg": 45, "RPE": 8, "session": "Full body A"}, _day(14))
    add_action("SorenessReported", alice_id, {"zone": "lower back", "intensity": 5}, _day(15))
    add_action("SessionSkipped", alice_id, {"reason": "soreness"}, _day(16))
    add_action("SorenessReported", alice_id, {"zone": "left knee", "intensity": 6}, _day(17))

    # Probabilistic edges seeded from history
    add_edge("client_alice", "goal_alice", "TARGETS", probability=1.0)


# ── Bob — good adherence, recent PR ──────────────────────────────────────────

def _seed_bob() -> None:
    bob_id = add_entity("Client", {
        "name": "Bob Dupont",
        "age": 27,
        "goal": "Gain muscle mass (bulk)",
        "injury_notes": "None",
    }, node_id="client_bob")

    goal_id = add_entity("Goal", {
        "label": "Hypertrophy — 5 kg lean mass in 6 months",
        "target_weight_kg": 82,
        "current_weight_kg": 77,
    }, node_id="goal_bob")

    program_id = add_entity("Program", {
        "label": "Bob — Push/Pull/Legs",
        "sessions_per_week": 5,
        "focus": "Hypertrophy",
        "exercises": [
            {"name": "Bench Press", "sets": 4, "reps": "6-8", "load_kg": 90},
            {"name": "Overhead Press", "sets": 3, "reps": "8", "load_kg": 60},
            {"name": "Deadlift", "sets": 3, "reps": "5", "load_kg": 140},
            {"name": "Pull-up", "sets": 4, "reps": "8", "load_kg": None},
            {"name": "Leg Press", "sets": 4, "reps": "12", "load_kg": 180},
        ],
    }, node_id="program_bob")

    add_edge(bob_id, goal_id, "HAS_GOAL")
    add_edge(bob_id, program_id, "FOLLOWS", probability=1.0)

    CLIENTS["client_bob"] = {
        "id": bob_id,
        "name": "Bob Dupont",
        "goal_id": goal_id,
        "program_id": program_id,
    }

    # Week 1
    add_action("SessionLogged", bob_id, {"load_kg": 90, "RPE": 7, "session": "Push"}, _day(0))
    add_action("SessionLogged", bob_id, {"load_kg": 140, "RPE": 8, "session": "Pull"}, _day(1))
    add_action("SessionLogged", bob_id, {"load_kg": 180, "RPE": 7, "session": "Legs"}, _day(3))
    add_action("SessionLogged", bob_id, {"load_kg": 92, "RPE": 7, "session": "Push"}, _day(4))
    add_action("SessionLogged", bob_id, {"load_kg": 142, "RPE": 8, "session": "Pull"}, _day(6))

    # Week 2
    add_action("SessionLogged", bob_id, {"load_kg": 95, "RPE": 8, "session": "Push"}, _day(7))
    add_action("PRHit", bob_id, {"exercise": "Bench Press", "load_kg": 100, "reps": 3}, _day(8))
    add_action("SessionLogged", bob_id, {"load_kg": 145, "RPE": 8, "session": "Pull"}, _day(9))
    add_action("SessionLogged", bob_id, {"load_kg": 185, "RPE": 7, "session": "Legs"}, _day(10))
    add_action("SessionLogged", bob_id, {"load_kg": 95, "RPE": 7, "session": "Push"}, _day(11))

    # Week 3 — still consistent
    add_action("SessionLogged", bob_id, {"load_kg": 145, "RPE": 7, "session": "Pull"}, _day(14))
    add_action("SessionLogged", bob_id, {"load_kg": 185, "RPE": 8, "session": "Legs"}, _day(15))
    add_action("SessionLogged", bob_id, {"load_kg": 97, "RPE": 7, "session": "Push"}, _day(16))
    add_action("SorenessReported", bob_id, {"zone": "shoulders", "intensity": 3}, _day(17))
