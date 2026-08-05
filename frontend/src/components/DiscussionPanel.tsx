"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Message = {
  id: string;
  body: string;
  isSystem: boolean;
  sentAt: string;
  displayName: string | null;
};

const QUICK_REPLIES = ["At main gate", "Running 10 min late", "Taxi arrived"];

export function DiscussionPanel({ carpoolId, isMember }: { carpoolId: string; isMember: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function load() {
    if (!isMember) return;
    apiFetch<{ messages: Message[] }>(`/api/v1/carpools/${carpoolId}/discussion/messages`)
      .then((data) => setMessages(data.messages))
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [carpoolId, isMember]);

  async function send(body: string) {
    setError("");
    try {
      await apiFetch(`/api/v1/carpools/${carpoolId}/discussion/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setText("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    }
  }

  if (!isMember) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Join the carpool to access trip discussion.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trip Discussion</h2>
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <li key={m.id} className={`text-sm ${m.isSystem ? "text-slate-400 italic" : ""}`}>
            {!m.isSystem && <span className="font-medium">{m.displayName ?? "Member"}: </span>}
            {m.body}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text && send(text)}
        />
        <button onClick={() => text && send(text)} className="btn-primary w-auto px-4 py-2">
          Send
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
