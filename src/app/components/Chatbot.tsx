"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

type Message = {
  sender: string;
  text: string;
  audio?: string;
  loading?: boolean;
  avatarUrl?: string;
};

interface ChatBoxProps {
  messages: Message[];
  onSend: (message: string) => void;
}

export default function ChatBox({ messages, onSend }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch((err) => console.error("Audio playback failed:", err));
  };

  return (
    <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200">
      {/* Optional Header */}
      <div className="border-b border-neutral-800 px-4 py-3 text-center text-sm text-gray-400">
        Lexi Capital
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {messages.map((msg, i) => {
          const isUser = msg.sender === "You";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className={`flex items-end gap-2 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <img
                  src={msg.avatarUrl || "/bot.png"}
                  alt="bot"
                  className="w-6 h-6 rounded-full border border-neutral-700 p-1"
                />
              )}

              {/* Message Bubble */}
              <div
                className={`relative max-w-xs px-3 py-2 rounded-xl text-sm leading-snug ${
                  isUser
                    ? "bg-blue-700 text-white"
                    : "bg-neutral-800 text-gray-200"
                }`}
              >
                {msg.loading ? (
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-300"></span>
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
                {msg.audio && !msg.loading && (
                  <button
                    onClick={() => playAudio(msg.audio!)}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition"
                    title="Play audio"
                  >
                    ▶
                  </button>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <img
                  src={msg.avatarUrl || "/user.png"}
                  alt="you"
                  className="w-6 h-6  p-1 rounded-full border border-blue-600"
                />
              )}
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-grow bg-neutral-800 border border-neutral-700 rounded-full px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-full text-white transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
