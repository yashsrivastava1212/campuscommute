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

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const date = formatDateLabel(msg.sentAt);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

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
      <div className="card p-5 text-body-md text-on-variant">
        Join the carpool to access trip discussion.
      </div>
    );
  }

  const grouped = groupMessagesByDate(messages);

  return (
    <div className="card p-5">
      <h2 className="text-title-lg text-on-surface">Trip Discussion</h2>

      <div className="mt-5 max-h-80 space-y-6 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-body-md text-on-variant">No messages yet. Say hello to your group.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="relative mb-4 flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-label-md text-on-variant">{group.date}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <ul className="space-y-4">
                {group.messages.map((m) => (
                  <li key={m.id}>
                    {m.isSystem ? (
                      <p className="font-mono text-mono-sm text-slate-member">{m.body}</p>
                    ) : (
                      <div>
                        <p className="text-label-md font-semibold text-on-surface">
                          {m.displayName ?? "Member"}
                          <span className="ml-2 font-normal text-slate-member">
                            {new Date(m.sentAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        <p className="mt-0.5 text-body-md text-on-surface">{m.body}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="rounded-full border border-border bg-surface-muted px-3 py-1 text-label-md text-on-variant transition-colors hover:border-border-hover hover:bg-white"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text && send(text)}
        />
        <button onClick={() => text && send(text)} className="btn-primary w-auto shrink-0 px-5">
          Send
        </button>
      </div>
      {error && <p className="mt-2 text-body-md text-error">{error}</p>}
    </div>
  );
}
