"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import {
  LiveKitRoom,
  VoiceAssistantControlBar,
  BarVisualizer,
  useVoiceAssistant,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";

type Message = {
  sender: string;
  text: string;
  audio?: string;
  loading?: boolean;
  avatarUrl?: string;
};

interface ChatBoxProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onSend: (message: string) => void;
  loadingSession?: boolean;
}

export default function ChatBox({
  messages,
  setMessages,
  onSend,
  loadingSession,
}: ChatBoxProps) {
  // State
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
  const LIVEKIT_URL =
    process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://your-project.livekit.cloud";

  const [livekitToken, setLivekitToken] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [roomName] = useState("lexcapital-room");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const botIsTyping = !!(
    messages.length && messages[messages.length - 1].loading
  );

  // Check for configuration errors at the start
  if (!API_BASE || !LIVEKIT_URL) {
    console.error("API_BASE or LIVEKIT_URL is not configured.");
    return (
      <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200 justify-center items-center">
        <p className="text-red-400">
          Configuration error: API_BASE or LIVEKIT_URL is missing.
        </p>
      </div>
    );
  }

  // Ref
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Handlers
  const toggleAudio = (url: string) => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(null);
      setCurrentAudio(null);
      if (isPlaying === url) return;
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
      setTimeout(() => setCopiedMsg(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  const fetchLivekitToken = useCallback(async () => {
    if (livekitToken) return;
    try {
      console.log("Fetching token from:", `${API_BASE}/livekit/token`);
      console.log("Request payload:", {
        room_name: roomName,
        participant_name: "user",
      });
      const res = await fetch(`${API_BASE}/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: "user",
        }),
      });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! status: ${res.status}, message: ${errorText}`
        );
      }
      const data = await res.json();
      console.log("Response data:", data);
      if (data.token) {
        setLivekitToken(data.token);
        console.log("Token fetched successfully:", data.token);
        console.log(
          "LIVEKIT_URL:",
          LIVEKIT_URL,
          "tokenLen:",
          data.token.length
        );
        setVoiceMode(true);
      } else {
        console.error("Token fetch failed, no token in response:", data);
        setConnectionError(
          "Failed to fetch LiveKit token: No token in response."
        );
      }
    } catch (err) {
      console.error("Error fetching LiveKit token:", err);
      setConnectionError(
        `Failed to connect to voice assistant: ${err.message}`
      );
    }
  }, [API_BASE, roomName, livekitToken]);

  const handleSend = () => {
    if (!input.trim() || loadingSession) return;
    if (listening) {
      SpeechRecognition.stopListening();
    }
    onSend(input);
    setInput("");
    resetTranscript();
  };

  const toggleVoiceMode = async () => {
    if (voiceMode) {
      setVoiceMode(false);
      SpeechRecognition.stopListening();
    } else {
      await fetchLivekitToken();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.audio && !lastMsg.loading && !voiceMode) {
      toggleAudio(lastMsg.audio);
    }

    if (transcript && listening && !voiceMode) {
      setInput(transcript);
      const isUserMsg = messages.some(
        (msg) => msg.sender === "You" && msg.text === transcript
      );
      if (!isUserMsg) {
        setMessages((prev) => [
          ...prev.filter((msg) => !msg.loading),
          { sender: "You", text: transcript },
        ]);
      }
    }
  }, [messages, transcript, listening, voiceMode, setMessages]);

  // Check speech recognition support once on mount
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setSttError("Speech recognition not supported in this browser.");
    }
  }, [browserSupportsSpeechRecognition]);

  // Voice Assistant Component
  const VoiceAssistant = () => {
    const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();

    useEffect(() => {
      console.log("Voice assistant state:", state);
      console.log("Audio track:", audioTrack);
      console.log("Agent transcriptions:", agentTranscriptions);
    }, [state, audioTrack, agentTranscriptions]);

    useEffect(() => {
      if (voiceMode && agentTranscriptions?.length > 0) {
        const latestTranscription =
          agentTranscriptions[agentTranscriptions.length - 1];

        const isDuplicate = messages.some(
          (msg) =>
            msg.sender === "Assistant" && msg.text === latestTranscription.text
        );

        if (latestTranscription.text && !isDuplicate) {
          setMessages((prev) => [
            ...prev.filter((msg) => !msg.loading),
            {
              sender: "Assistant",
              text: latestTranscription.text,
              avatarUrl: "/bot.png",
            },
          ]);
        }
      }
    }, [agentTranscriptions, voiceMode, setMessages, messages]);

    return (
      <div className="voice-mode mb-4">
        <p className="text-xs text-gray-500">Voice Assistant State: {state}</p>
        <VoiceAssistantControlBar />
        <BarVisualizer
          trackRef={audioTrack}
          state={state}
          barCount={5}
          style={{ height: "50px" }}
        />
        <RoomAudioRenderer />
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200">
      <div className="border-b border-neutral-800 px-4 py-3 text-center text-sm text-gray-400">
        Lexcapital Assistant
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
        {loadingSession ? (
          <div className="flex justify-center items-center h-full">
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
                {!isUser && (
                  <img
                    src={msg.avatarUrl || "/bot.png"}
                    alt="bot"
                    className="w-6 h-6 rounded-full border border-neutral-700 p-1"
                  />
                )}
                <div
                  className={`relative max-w-xs px-3 py-2 rounded-xl text-sm leading-snug group ${
                    isUser
                      ? "bg-blue-700 text-white"
                      : "bg-neutral-800 text-gray-200"
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex flex-col">
                      <div className="flex space-x-1 mb-1">
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-150"></span>
                        <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-300"></span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  {msg.audio && !msg.loading && !voiceMode && (
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
                  {!msg.loading && (
                    <button
                      onClick={() => copyToClipboard(msg.text, i)}
                      className="absolute top-1 right-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      {copiedMsg === i ? "copied" : "📋"}
                    </button>
                  )}
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
          })
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-neutral-800 px-4 py-3">
        {sttError && (
          <div className="mb-2 text-xs text-red-400">{sttError}</div>
        )}
        {connectionError && (
          <div className="mb-2 text-xs text-red-400">{connectionError}</div>
        )}
        {voiceMode && !livekitToken && (
          <p className="text-red-400">Connecting to LiveKit...</p>
        )}
        {voiceMode && livekitToken && (
          <LiveKitRoom
            token={livekitToken}
            serverUrl={LIVEKIT_URL}
            data-lk-theme="default"
            style={{ height: "150px" }}
          >
            <VoiceAssistant />
          </LiveKitRoom>
        )}
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
            onClick={toggleVoiceMode}
            className={`px-3 py-2 rounded-full ${
              voiceMode ? "bg-red-600" : "bg-neutral-700"
            } text-white`}
            title={voiceMode ? "Stop voice" : "Start voice"}
            disabled={botIsTyping}
          >
            {voiceMode ? "Stop" : "🎤 Voice Mode"}
          </button>
          <button
            onClick={handleSend}
            disabled={loadingSession || !input.trim()}
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-full text-white transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
