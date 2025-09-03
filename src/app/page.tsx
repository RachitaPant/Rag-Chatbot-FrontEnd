"use client";
import { useState } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

type Message = {
  sender: "You" | "Bot";
  text: string;
  audio?: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const API_BASE = "https://rag-chatbot-backend-user.onrender.com";

  const sendMessage = async (text: string) => {
    setMessages((prev) => [...prev, { sender: "You", text }]);

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

      setMessages((prev) => [...prev, botMessage]);

      // Play audio if available
      if (botMessage.audio) {
        const audio = new Audio(botMessage.audio);
        audio.play().catch((err) => {
          console.error("Audio playback failed:", err);
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "Bot", text: "Something went wrong. Please try again." },
      ]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
