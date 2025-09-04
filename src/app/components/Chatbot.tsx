"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const botIsTyping = !!(messages.length && messages[messages.length - 1].loading);
  const [input, setInput] = useState("");


  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setSttError("Speech recognition not supported in this browser.");
    }
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
  if (!listening) return;
  // Only update input if user hasn't typed anything yet
  setInput(transcript);
}, [transcript, listening]);

  const handleSend = () => {
  const trimmed = input.trim();
  if (!trimmed) return;

  // Stop the mic automatically
  if (listening) {
    SpeechRecognition.stopListening();
  }

  onSend(trimmed);
  setInput(""); // reset after sending
  resetTranscript(); // reset speech recognition transcript
};


  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true, language: "en-US" });
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200">
      <div className="border-b border-neutral-800 px-4 py-3 text-center text-sm text-gray-400">
        Lexi Capital
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {messages.map((msg, i) => {
          const isUser = msg.sender === "You";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <img
                  src={msg.avatarUrl || "/bot.png"}
                  alt="bot"
                  className="w-6 h-6 rounded-full border border-neutral-700 p-1"
                />
              )}
              <div
                className={`relative max-w-xs px-3 py-2 rounded-xl text-sm leading-snug ${
                  isUser ? "bg-blue-700 text-white" : "bg-neutral-800 text-gray-200"
                }`}
              >
                <p>{msg.text}</p>
              </div>
              {isUser && (
                <img
                  src={msg.avatarUrl || "/user.png"}
                  alt="you"
                  className="w-6 h-6 p-1 rounded-full border border-blue-600"
                />
              )}
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-neutral-800 px-4 py-3">
        {sttError && <div className="mb-2 text-xs text-red-400">{sttError}</div>}

        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-grow bg-neutral-800 border border-neutral-700 rounded-full px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)} // allow manual edits
            placeholder="Type your message or use the mic…"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            onClick={toggleListening}
            className={`px-3 py-2 rounded-full ${listening ? "bg-red-600" : "bg-neutral-700"} text-white`}
            title={listening ? "Stop listening" : "Start speaking"}
            disabled={botIsTyping} // disable when bot is typing
          >
            {listening ? "Stop" : "🎤"}
          </button>

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
