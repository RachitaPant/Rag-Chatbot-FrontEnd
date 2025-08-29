"use client";
import { useState } from "react";
import axios from "axios";
import ChatBox from "../app/components/Chatbot";

export default function Home() {
  const [messages, setMessages] = useState<
    { sender: string; text: any; audio?: string }[]
  >([]);

  const sendMessage = async (text: any) => {
    setMessages((prev) => [...prev, { sender: "You", text }]);

    const res = await axios.post("http://localhost:8000/ask", {
      question: text,
    });

    const botMessage = {
      sender: "Bot",
      text: res.data.answer,
      audio: `http://localhost:8000${res.data.audio_url}`, // 👈 audio from backend
    };

    setMessages((prev) => [...prev, botMessage]);

    // 🔊 Auto-play bot response
    const audio = new Audio(botMessage.audio);
    audio.play();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <ChatBox messages={messages} onSend={sendMessage} />
    </div>
  );
}
