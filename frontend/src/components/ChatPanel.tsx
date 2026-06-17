import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api/client";
import type { ChatMessage, GraphContextNode } from "../api/types";
import { useEphemeralGraph } from "../context/EphemeralGraph";

interface AssistantMessage {
  role: "assistant";
  content: string;
  graphContext?: GraphContextNode[];
}

interface UserMessage {
  role: "user";
  content: string;
}

type Message = UserMessage | AssistantMessage;

const KIND_COLORS: Record<string, string> = {
  Client:         "bg-indigo-100 text-indigo-700 border-indigo-200",
  Program:        "bg-amber-100 text-amber-700 border-amber-200",
  SorenessReported: "bg-orange-100 text-orange-700 border-orange-200",
  DecisionTrace:  "bg-violet-100 text-violet-700 border-violet-200",
};

function GraphExplained({ nodes }: { nodes: GraphContextNode[] }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Graph nodes consulted
      </p>
      {nodes.map((n) => {
        const isOvertraining = n.reason.toLowerCase().includes("overtraining") || n.reason.toLowerCase().includes("prior injury");
        return (
          <div
            key={n.id}
            className={`border rounded-lg p-3 text-xs ${
              isOvertraining
                ? "bg-red-50 text-red-800 border-red-200"
                : KIND_COLORS[n.kind] ?? "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{n.label}</span>
              <div className="flex items-center gap-1.5">
                {isOvertraining && (
                  <span className="bg-red-200 text-red-700 px-1.5 py-0.5 rounded text-xs font-bold">
                    ⚠ overtraining signal
                  </span>
                )}
                <span className="opacity-50 font-mono">{n.kind}</span>
              </div>
            </div>
            <p className="opacity-80 mb-1">{n.reason}</p>
            <div className="font-mono opacity-60 space-y-0.5">
              {Object.entries(n.data)
                .filter(([, v]) => v != null && v !== "" && !Array.isArray(v))
                .map(([k, v]) => (
                  <div key={k}>
                    {k}: <span className="font-semibold">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const INITIAL_MESSAGE: AssistantMessage = {
  role: "assistant",
  content: "Hi! I'm your virtual coach. Ask me anything about your training, recovery, or program.",
};

const REST_KEYWORDS = ["rest", "days off", "back off", "overtraining", "reduce", "stop training", "pause"];

function suggestsRest(text: string): boolean {
  const lower = text.toLowerCase();
  return REST_KEYWORDS.some((w) => lower.includes(w));
}

interface Props {
  clientId: string;
  onAcceptRestDay: () => void;
  onReset: () => void;
}

const PAIN_ZONES: { keywords: string[]; zone: string; intensity: number }[] = [
  { keywords: ["knee", "genou"], zone: "left knee", intensity: 6 },
  { keywords: ["back", "dos"], zone: "lower back", intensity: 5 },
  { keywords: ["shoulder", "épaule"], zone: "shoulder", intensity: 5 },
];

function detectPainZone(text: string) {
  const lower = text.toLowerCase();
  return PAIN_ZONES.find((p) => p.keywords.some((k) => lower.includes(k))) ?? null;
}

export function ChatPanel({ clientId, onAcceptRestDay, onReset }: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [openGraphIdx, setOpenGraphIdx] = useState<number | null>(null);
  const [acceptedIdx, setAcceptedIdx] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { addSorenessNode, clear: clearEphemeral } = useEphemeralGraph();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, openGraphIdx]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: UserMessage = { role: "user", content: text };
    const next: Message[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setOpenGraphIdx(null);

    const historyForApi: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const [resp] = await Promise.all([
        sendChatMessage(clientId, text, historyForApi),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
      const assistantMsg: AssistantMessage = {
        role: "assistant",
        content: resp.reply,
        graphContext: resp.graph_context,
      };
      setMessages([...next, assistantMsg]);

      // If the user reported pain, inject a soreness node into the graph
      const painZone = detectPainZone(text);
      if (painZone) {
        addSorenessNode(painZone.zone, painZone.intensity);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, I couldn't reach the server right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col" style={{ height: 380 }}>
      {/* header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <p className="text-sm font-semibold text-slate-900">Virtual Coach</p>
        <span className="text-xs text-slate-400">Powered by Claude · context-aware</span>
        <button
          onClick={() => {
            setMessages([INITIAL_MESSAGE]);
            setOpenGraphIdx(null);
            setAcceptedIdx(null);
            clearEphemeral();
            onReset();
          }}
          className="ml-auto text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
          title="Reset conversation"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
                  C
                </span>
              )}
              <div className="flex flex-col items-start max-w-xs">
                <div
                  className={`text-sm px-3 py-2 rounded-2xl leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>

                {m.role === "assistant" && (
                  <div className="mt-1.5 ml-1 flex flex-col gap-1 items-start">
                    {(m as AssistantMessage).graphContext?.length ? (
                      <button
                        onClick={() => setOpenGraphIdx(openGraphIdx === i ? null : i)}
                        className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="2" strokeWidth={2} />
                          <circle cx="19" cy="5" r="2" strokeWidth={2} />
                          <circle cx="19" cy="19" r="2" strokeWidth={2} />
                          <path strokeLinecap="round" strokeWidth={2} d="M7 11.5l10-5M7 12.5l10 5" />
                        </svg>
                        {openGraphIdx === i ? "Hide graph" : "Graph explained"}
                      </button>
                    ) : null}

                    {suggestsRest(m.content) && acceptedIdx !== i && (
                      <button
                        onClick={() => { setAcceptedIdx(i); onAcceptRestDay(); }}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept program change
                      </button>
                    )}
                    {acceptedIdx === i && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Program updated — rest day set
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* graph explained panel */}
            {m.role === "assistant" && openGraphIdx === i && (m as AssistantMessage).graphContext?.length ? (
              <div className="ml-8 mt-1">
                <GraphExplained nodes={(m as AssistantMessage).graphContext!} />
              </div>
            ) : null}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <span className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
              C
            </span>
            <div className="bg-slate-100 text-slate-400 text-sm px-3 py-2 rounded-2xl rounded-bl-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask your coach…"
          className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
