import type { ClientResponse, EventResponse, GraphPayload } from "./types";

const BASE = "/api";

export async function fetchClient(clientId: string): Promise<ClientResponse> {
  const res = await fetch(`${BASE}/clients/${clientId}`);
  if (!res.ok) throw new Error(`fetchClient failed: ${res.status}`);
  return res.json();
}

export async function fetchClients(): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${BASE}/clients`);
  if (!res.ok) throw new Error(`fetchClients failed: ${res.status}`);
  return res.json();
}

export async function reportSoreness(
  clientId: string,
  zone: string,
  intensity: number
): Promise<EventResponse> {
  const res = await fetch(`${BASE}/events/${clientId}/soreness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone, intensity }),
  });
  if (!res.ok) throw new Error(`reportSoreness failed: ${res.status}`);
  return res.json();
}

export async function fetchGraph(clientId: string): Promise<GraphPayload> {
  const res = await fetch(`${BASE}/graph/${clientId}`);
  if (!res.ok) throw new Error(`fetchGraph failed: ${res.status}`);
  return res.json();
}

export async function sendChatMessage(
  clientId: string,
  message: string,
  history: { role: string; content: string }[]
): Promise<import("./types").ChatResponse> {
  const res = await fetch(`${BASE}/chat/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json();
}
