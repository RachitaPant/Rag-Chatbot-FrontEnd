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

  const sendMessage = async (text: string) => {
    setMessages((prev) => [...prev, { sender: "You", text }]);

    const res = await axios.post<{ answer: string; audio_url?: string }>(
      "https://rag-chatbot-backend-user.onrender.com/ask", 
      { question: text }
    );

    const botMessage: Message = {
      sender: "Bot",
      text: res.data.answer,
      audio: res.data.audio_url
        ? `https://rag-chatbot-backend-user.onrender.com${res.data.audio_url}`
        : undefined,
    };

    setMessages((prev) => [...prev, botMessage]);

  
    if (botMessage.audio) {
      const audio = new Audio(botMessage.audio);
      audio.play();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
