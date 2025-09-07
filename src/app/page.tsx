"use client";
import { useState, useEffect, useRef } from "react";
import ChatBox from "./components/Chatbot";

type Message = {
  sender: "You" | "Bot";
  text: string;
  audio?: string;
  loading?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
  const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || "ws://127.0.0.1:8000";

  // Start session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = localStorage.getItem("chat_session");
        let session = stored;

        if (!stored) {
          const res = await fetch(`${API_BASE}/start-session`);
          const data = await res.json();
          session = data.session_id;
          if (session !== null) {
            localStorage.setItem("chat_session", session);
          }
        }

        setSessionId(session);

        // Load old history
        const res = await fetch(`${API_BASE}/history/${session}`);
        const data = await res.json();
        if (data?.history) {
          const pastMessages: Message[] = [];
          data.history.forEach((h: { question: string; answer: string }) => {
            pastMessages.push({ sender: "You", text: h.question });
            pastMessages.push({ sender: "Bot", text: h.answer });
          });
          setMessages(pastMessages);
        }

        // Initialize WebSocket
        wsRef.current = new WebSocket(`${WS_BASE}/ws/chat`);

        wsRef.current.onopen = () => console.log("WebSocket connected");
        wsRef.current.onclose = () => console.log("WebSocket disconnected");
        wsRef.current.onerror = (err) => console.error("WebSocket error:", err);

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.status === "processing") {
            console.log("Bot is processing...");
            return;
          }

          const audioUrl = data.audio_url?.startsWith("http")
            ? data.audio_url
            : data.audio_url
            ? `${API_BASE}${data.audio_url}`
            : undefined;

          const botMessage: Message = {
            sender: "Bot",
            text: data.answer || "I couldn’t generate an answer.",
            audio: audioUrl,
          };

          // Replace the loading placeholder with real message
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = botMessage;
            return updated;
          });
        };
      } catch (err) {
        console.error("Error initializing session:", err);
      } finally {
        setLoadingSession(false);
      }
    };

    initSession();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Send message over WebSocket
  const sendMessage = (text: string) => {
    if (
      !sessionId ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      console.warn("WebSocket not connected yet.");
      return;
    }

    // Show user's message
    setMessages((prev) => [...prev, { sender: "You", text }]);

    // Placeholder for bot typing
    setMessages((prev) => [
      ...prev,
      { sender: "Bot", text: "Typing...", loading: true },
    ]);

    wsRef.current.send(
      JSON.stringify({
        session_id: sessionId,
        question: text,
      })
    );
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-cover items-center justify-center text-white"
      style={{ backgroundImage: "url('/dummy-bg.jpg')" }}
    >
      <ChatBox
        messages={messages}
        onSend={sendMessage}
        loadingSession={loadingSession}
      />
    </div>
  );
}
