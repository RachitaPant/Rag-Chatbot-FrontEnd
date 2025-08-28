"use client";
import { useState } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

export default function Home() {
  const [messages, setMessages] = useState<{ sender: string; text: any }[]>([]);

  const sendMessage = async (text: any) => {
    setMessages([...messages, { sender: "You", text }]);
    const res = await axios.post("http://localhost:8000/ask", {
      question: text,
    });
    setMessages((prev) => [...prev, { sender: "Bot", text: res.data.answer }]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
