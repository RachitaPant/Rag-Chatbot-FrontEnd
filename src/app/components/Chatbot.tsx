import { useState, useRef, useEffect } from "react";

type Message = {
  sender: string;
  text: string;
  audio?: string;
  loading?: boolean;
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
    <div className="flex flex-col w-full max-w-3xl h-screen bg-[#d27b67] shadow-2xl rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#e4a496] text-white text-xl font-semibold px-6 py-4 border-b border-white">
        Lexi Capital Helper Bot
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.sender === "You" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`relative max-w-md px-4 py-3 rounded-2xl shadow-md break-words ${
                msg.sender === "You"
                  ? "bg-[#d0afa8] text-white rounded-br-none"
                  : "bg-gray-800 text-gray-200 rounded-bl-none"
              }`}
            >
              {msg.loading ? (
                <div className="flex space-x-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                </div>
              ) : (
                <p>{msg.text}</p>
              )}

              {msg.audio && !msg.loading && (
                <button
                  onClick={() => playAudio(msg.audio!)}
                  className="absolute bottom-1 right-2 w-7 h-7 bg-[#d27b67] hover:bg-[#542b22] rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-110"
                  title="Play audio"
                >
                  <svg
                    className="w-5 h-5 text-white ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6 4l12 6-12 6V4z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 p-4 bg-[#e2aea2] border-t border-white">
        <input
          type="text"
          className="flex-grow bg-[#d27b67] text-white border border-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-[#d27b67] hover:bg-[#e1c8c3] px-5 py-2 rounded-full text-white transition"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
