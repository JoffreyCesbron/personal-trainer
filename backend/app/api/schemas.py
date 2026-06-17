from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class SorenessEvent(BaseModel):
    zone: str
    intensity: int  # 1-10


class ClientState(BaseModel):
    id: str
    name: str
    goal: str
    program: dict[str, Any]
    recent_actions: list[dict[str, Any]]


class DecisionResult(BaseModel):
    signals: dict[str, Any]
    decision: dict[str, Any]
    recommendation: dict[str, Any]
    trace_id: str


class GraphNode(BaseModel):
    id: str
    kind: str
    label: str
    data: dict[str, Any]
    is_new: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    rel: str
    probability: float = 1.0


class GraphPayload(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class EventResponse(BaseModel):
    client_state: ClientState
    decision: DecisionResult
    graph_delta: GraphPayload


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class GraphContextNode(BaseModel):
    id: str
    kind: str
    label: str
    reason: str          # why this node was relevant
    data: dict[str, Any]


class ChatResponse(BaseModel):
    reply: str
    graph_context: list[GraphContextNode] = []
