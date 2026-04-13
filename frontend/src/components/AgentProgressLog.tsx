"use client";

import { useEffect, useRef, useState } from "react";
import { getStreamUrl } from "@/lib/api";

interface LogEntry {
  step?: number;
  type: string;
  message?: string;
  code_preview?: string;
  observation?: string;
  status?: string;
}

interface AgentProgressLogProps {
  searchId: string;
  onComplete?: () => void;
}

export function AgentProgressLog({ searchId, onComplete }: AgentProgressLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(getStreamUrl(searchId));

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data: LogEntry = JSON.parse(event.data);

        if (data.type === "heartbeat") return;

        if (data.type === "done") {
          setLogs((prev) => [...prev, { type: "complete", message: "Research complete" }]);
          eventSource.close();
          onComplete?.();
          return;
        }

        setLogs((prev) => [...prev, data]);
      } catch {
        // skip unparseable messages
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => eventSource.close();
  }, [searchId, onComplete]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Agent Progress</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"}`} />
          {connected ? "Live" : "Connecting..."}
        </div>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-2">
        {logs.length === 0 && (
          <p className="text-muted-foreground">Waiting for agent to start...</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted-foreground shrink-0 w-6 text-right">
              {log.step != null ? `${log.step}.` : ""}
            </span>
            <div className="space-y-1 min-w-0">
              {log.message && (
                <p className={log.type === "complete" ? "text-green-600 dark:text-green-400 font-semibold" : ""}>
                  {log.message}
                </p>
              )}
              {log.code_preview && (
                <pre className="text-muted-foreground bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {log.code_preview}
                </pre>
              )}
              {log.observation && (
                <p className="text-muted-foreground truncate">{log.observation}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
