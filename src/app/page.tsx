"use client";
import { useState } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

type Message = {
  sender: "You" | "Bot";
  text: string;
  audio?: string;
  loading?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const API_BASE = "https://rag-chatbot-backend-user.onrender.com";

  const sendMessage = async (text: string) => {
    setMessages((prev) => [...prev, { sender: "You", text }]);

    // show temporary bot "typing..."
    setMessages((prev) => [
      ...prev,
      { sender: "Bot", text: "Typing...", loading: true },
    ]);

    try {
      const res = await axios.post<{ answer: string; audio_url?: string }>(
        `${API_BASE}/ask`,
        { question: text }
      );

      const audioUrl = res.data.audio_url
        ? `${API_BASE}${res.data.audio_url}`
        : undefined;

      const botMessage: Message = {
        sender: "Bot",
        text: res.data.answer,
        audio: audioUrl,
      };

      // replace the loading message with actual bot response
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = botMessage;
        return updated;
      });

      if (botMessage.audio) {
        const audio = new Audio(botMessage.audio);
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          sender: "Bot",
          text: "Something went wrong. Please try again.",
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
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
