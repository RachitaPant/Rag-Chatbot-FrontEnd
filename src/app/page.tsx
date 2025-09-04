"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

interface HistoryItem {
  question: string;
  answer: string;
}

type Message = {
  sender: "You" | "Bot";
  text: string;
  audio?: string;
  loading?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true); // 🔹 New

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

  // 🔹 Start session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = localStorage.getItem("chat_session");
        if (stored) {
          setSessionId(stored);
          // load old history
          const res = await axios.get<{
            session_id: string;
            history: HistoryItem[];
          }>(`${API_BASE}/history/${stored}`);

          if (res.data?.history) {
            const pastMessages: Message[] = [];
            res.data.history.forEach((h: HistoryItem) => {
              pastMessages.push({ sender: "You", text: h.question });
              pastMessages.push({ sender: "Bot", text: h.answer });
            });
            setMessages(pastMessages);
          }
        } else {
          // start new session
          const res = await axios.get<{ session_id: string }>(
            `${API_BASE}/start-session`
          );
          setSessionId(res.data.session_id);
          localStorage.setItem("chat_session", res.data.session_id);
        }
      } catch (err) {
        console.error("Error initializing session:", err);
      } finally {
        setLoadingSession(false); // ✅ done loading
      }
    };
    initSession();
  }, []);

  // 🔹 Send message
  const sendMessage = async (text: string) => {
    if (!sessionId) {
      console.warn("No session yet — message ignored:", text);
      return;
    }

    // show user's message
    setMessages((prev) => [...prev, { sender: "You", text }]);
    // placeholder for bot
    setMessages((prev) => [
      ...prev,
      { sender: "Bot", text: "Typing...", loading: true },
    ]);

    try {
      const res = await axios.post<{ answer: string; audio_url?: string }>(
        `${API_BASE}/ask`,
        { session_id: sessionId, question: text },
        {
          headers: { "Content-Type": "application/json" }, // enforce JSON
        }
      );

      const audioUrl = res.data.audio_url?.startsWith("http")
        ? res.data.audio_url
        : res.data.audio_url
        ? `${API_BASE}${res.data.audio_url}`
        : undefined;

      const botMessage: Message = {
        sender: "Bot",
        text: res.data.answer || "I couldn’t generate an answer.",
        audio: audioUrl,
      };

      // replace typing placeholder with actual answer
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = botMessage;
        return updated;
      });
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          sender: "Bot",
          text: "⚠️ Something went wrong. Please try again.",
        };
        return updated;
      });
    }
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
