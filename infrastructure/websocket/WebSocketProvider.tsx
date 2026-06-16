"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import type { WsEvent, WsMessageHandler } from "./types";
import { requestWsTicket, TicketError } from "../api/ws-tickets-client";

interface WebSocketContextValue {
  subscribe: (handler: WsMessageHandler) => () => void;
  unreadCount: number;
  resetUnread: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket should be used within WebSocketProvider");
  return ctx;
}

interface Props {
  children: ReactNode;
  wsUrl: string;
  role?: string;
  enabled?: boolean;
}

export function WebSocketProvider({ children, wsUrl, role, enabled = true }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const handlersRef = useRef<Set<WsMessageHandler>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const subscribe = useCallback((handler: WsMessageHandler) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function connect() {
      try {
        const ticket = await requestWsTicket();
        if (cancelled) return;

        const url = `${wsUrl}?ticket=${ticket}&role=${role || ""}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data: WsEvent = JSON.parse(event.data);
            handlersRef.current.forEach((handler) => {
              try {
                handler(data);
              } catch (e) {
                console.error("WebSocket handler error:", e);
              }
            });
            setUnreadCount((prev) => prev + 1);
          } catch (e) {
            console.error("WebSocket parse error:", e);
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            reconnectTimer.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err: unknown) {
        if (err instanceof TicketError && err.status >= 400 && err.status < 500) {
          return;
        }
        console.warn("WebSocket connect error, retrying in 5s:", err);
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [enabled, wsUrl, role]);

  return (
    <WebSocketContext.Provider value={{ subscribe, unreadCount, resetUnread }}>
      {children}
    </WebSocketContext.Provider>
  );
}
