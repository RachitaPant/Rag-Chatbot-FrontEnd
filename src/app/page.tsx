"use client";
import { useState } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

type Message = {
  sender: "You" | "Bot";
  text: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async (text: string) => {
    setMessages([...messages, { sender: "You", text }]);

    const res = await axios.post<{ answer: string }>(
      "https://rag-chatbot-backend-user.onrender.com/ask",
      { question: text }
    );

    setMessages((prev) => [...prev, { sender: "Bot", text: res.data.answer }]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
