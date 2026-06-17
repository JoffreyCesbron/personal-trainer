export interface ActionEvent {
  id: string;
  type: string;
  ts: string;
  [key: string]: unknown;
}

export interface ClientState {
  id: string;
  name: string;
  goal: string;
  program: {
    label: string;
    sessions_per_week: number;
    focus: string;
    exercises: { name: string; sets: number; reps: string; load_kg: number | null }[];
  };
  recent_actions: ActionEvent[];
}

export interface Signals {
  adherence_14d: number;
  sessions_14d: number;
  skips_14d: number;
  soreness_count_7d: number;
  avg_soreness_intensity_7d: number;
  prs_14d: number;
  avg_rpe_7d: number;
  drop_off_probability: number;
  recent_actions: ActionEvent[];
}

export interface Decision {
  action: "DELOAD" | "REDUCE" | "MAINTAIN" | "PROGRESS";
  rule_evaluated: string;
  exception_invoked: string | null;
}

export interface Recommendation {
  adjusted_program: string;
  checkin_message: string;
  narration: string;
}

export interface DecisionResult {
  signals: Signals;
  decision: Decision;
  recommendation: Recommendation;
  trace_id: string;
}

export interface ClientResponse {
  client_state: ClientState;
  decision: DecisionResult;
}

export interface GraphNode {
  id: string;
  kind: string;
  label: string;
  data: Record<string, unknown>;
  is_new: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  rel: string;
  probability: number;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EventResponse {
  client_state: ClientState;
  decision: DecisionResult;
  graph_delta: GraphPayload;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GraphContextNode {
  id: string;
  kind: string;
  label: string;
  reason: string;
  data: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  graph_context: GraphContextNode[];
}
