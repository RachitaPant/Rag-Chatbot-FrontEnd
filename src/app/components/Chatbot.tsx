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
  loadingSession?: boolean;
}

export default function ChatBox({
  messages,
  onSend,
  loadingSession,
}: ChatBoxProps) {
  //state
  const [input, setInput] = useState("");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  //ref
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-play the latest bot audio, but keep control
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.audio) {
      toggleAudio(lastMsg.audio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  //handlers

  const handleSend = () => {
    if (!input.trim() || loadingSession) return;
    onSend(input);
    setInput("");
  };
  const toggleAudio = (url: string) => {
    if (currentAudio && isPlaying === url) {
      currentAudio.pause();
      setIsPlaying(null);
      return;
    }
    if (currentAudio) {
      currentAudio.pause();
    }

    const audio = new Audio(url);
    setCurrentAudio(audio);
    setIsPlaying(url);

    audio.play().catch((err) => console.error("Audio playback failed:", err));

    audio.onended = () => {
      setIsPlaying(null);
      setCurrentAudio(null);
    };
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg(index);
      setTimeout(() => setCopiedMsg(null), 1500); // reset after 1.5s
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200">
      {/* Optional Header */}
      <div className="border-b border-neutral-800 px-4 py-3 text-center text-sm text-gray-400">
        Lexcapital Assitant
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {loadingSession ? (
          <div className="flex justify-center items-center h-full">
            {/* Loader while session starts */}
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-150"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
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
                  className={`relative max-w-xs px-3 py-2 rounded-xl text-sm leading-snug group ${
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

                  {/*  Play/Pause Button */}
                  {msg.audio && !msg.loading && (
                    <button
                      onClick={() => toggleAudio(msg.audio!)}
                      className="absolute bottom-1 right-1 w-5 h-5 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center p-2 transition text-xs"
                      title={
                        isPlaying === msg.audio ? "Pause audio" : "Play audio"
                      }
                    >
                      {isPlaying === msg.audio ? "⏸" : "▶"}
                    </button>
                  )}

                  {/*  Copy Button */}
                  {!msg.loading && (
                    <button
                      onClick={() => copyToClipboard(msg.text, i)}
                      className="absolute top-1 right-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedMsg === i ? "copied" : "📋"}
                    </button>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <img
                    src={msg.avatarUrl || "/user.png"}
                    alt="you"
                    className="w-6 h-6 p-1 rounded-full border border-blue-600"
                  />
                )}
              </motion.div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-grow bg-neutral-800 border border-neutral-700 rounded-full px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={input}
            disabled={loadingSession}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              loadingSession
                ? "Initializing session..."
                : "Type your message..."
            }
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loadingSession}
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-full text-white transition  disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
