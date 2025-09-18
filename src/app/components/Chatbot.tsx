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
import Image from "next/image"; // Import Next.js Image component

type Message = {
  sender: string;
  text: string;
  audio?: string;
  loading?: boolean;
  avatarUrl?: string;
  source?: "websocket" | "voice" | "user";
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
  const [lastVoiceTranscriptionId, setLastVoiceTranscriptionId] = useState<
    string | null
  >(null);

  const botIsTyping = !!(
    messages.length &&
    messages[messages.length - 1].loading &&
    messages[messages.length - 1].source !== "voice"
  );

  // Refs
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const voiceModeRef = useRef(voiceMode);

  // Hooks
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Update ref when voiceMode changes
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // Memoized handlers
  const toggleAudio = useCallback(
    (url: string) => {
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
    },
    [currentAudio, isPlaying]
  );

  const copyToClipboard = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg(index);
      setTimeout(() => setCopiedMsg(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const fetchLivekitToken = useCallback(async () => {
    if (livekitToken) return;
    try {
      console.log("Fetching token from:", `${API_BASE}/livekit/token`);
      const res = await fetch(`${API_BASE}/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName,
          participant_name: "user",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! status: ${res.status}, message: ${errorText}`
        );
      }

      const data = await res.json();
      if (data.token) {
        setLivekitToken(data.token);
        console.log("Token fetched successfully");
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
        `Failed to connect to voice assistant: ${(err as Error).message}`
      );
    }
  }, [API_BASE, roomName, livekitToken]);

  const handleSend = useCallback(() => {
    if (!input.trim() || loadingSession || voiceMode) return;
    if (listening) {
      SpeechRecognition.stopListening();
    }
    onSend(input);
    setInput("");
    resetTranscript();
  }, [input, loadingSession, voiceMode, listening, onSend, resetTranscript]);

  const toggleVoiceMode = useCallback(async () => {
    if (voiceMode) {
      setVoiceMode(false);
      setLivekitToken("");
      SpeechRecognition.stopListening();
      if (currentAudio) {
        currentAudio.pause();
        setIsPlaying(null);
        setCurrentAudio(null);
      }
    } else {
      await fetchLivekitToken();
    }
  }, [voiceMode, currentAudio, fetchLivekitToken]);

  // Auto-scroll and audio handling
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!voiceMode) {
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg?.audio &&
        !lastMsg.loading &&
        lastMsg.source === "websocket"
      ) {
        toggleAudio(lastMsg.audio);
      }
    }
  }, [messages, voiceMode, toggleAudio]);

  // Handle speech recognition transcript
  useEffect(() => {
    if (transcript && listening && !voiceMode) {
      setInput(transcript);
    }
  }, [transcript, listening, voiceMode]);

  // Check speech recognition support
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setSttError("Speech recognition not supported in this browser.");
    }
  }, [browserSupportsSpeechRecognition]);

  const VoiceAssistant = () => {
    const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
    const transcriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastProcessedTextRef = useRef<string | null>(null);

    useEffect(() => {
      console.log("Voice assistant state:", state);
    }, [state]);

    useEffect(() => {
      if (!voiceModeRef.current || !agentTranscriptions?.length) return;

      if (transcriptionTimeoutRef.current) {
        clearTimeout(transcriptionTimeoutRef.current);
      }

      transcriptionTimeoutRef.current = setTimeout(() => {
        const latestTranscription =
          agentTranscriptions[agentTranscriptions.length - 1];

        if (
          !latestTranscription.text ||
          latestTranscription.text.trim().length < 3
        ) {
          return;
        }

        const currentText = latestTranscription.text.trim();
        const transcriptionId = `${Date.now()}-${currentText.slice(0, 20)}`;

        if (
          transcriptionId !== lastVoiceTranscriptionId &&
          currentText !== lastProcessedTextRef.current
        ) {
          console.log("Adding voice transcription:", currentText);

          setMessages((prev) => {
            const filtered = prev.filter(
              (msg) => !(msg.loading && msg.source === "voice")
            );

            const isDuplicate = filtered.some(
              (msg) =>
                msg.sender === "Assistant" &&
                msg.text === currentText &&
                msg.source === "voice"
            );

            if (!isDuplicate) {
              return [
                ...filtered,
                {
                  sender: "Assistant",
                  text: currentText,
                  avatarUrl: "/bot.png",
                  source: "voice",
                },
              ];
            }
            return filtered;
          });

          setLastVoiceTranscriptionId(transcriptionId);
          lastProcessedTextRef.current = currentText;
        }
      }, 750);

      return () => {
        if (transcriptionTimeoutRef.current) {
          clearTimeout(transcriptionTimeoutRef.current);
        }
      };
    }, [agentTranscriptions]); // Removed lastVoiceTranscriptionId

    return (
      <div className="voice-mode mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Voice Assistant: {state}</p>
          <div className="text-xs text-green-400">🎤 Voice Mode Active</div>
        </div>
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

  // Filter messages based on mode
  const filteredMessages = voiceMode
    ? messages
    : messages.filter((msg) => msg.source !== "voice");

  // Configuration check
  if (!API_BASE || !LIVEKIT_URL) {
    return (
      <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200 justify-center items-center">
        <p className="text-red-400">
          Configuration error: API_BASE or LIVEKIT_URL is missing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen bg-neutral-900 text-gray-200">
      <div className="border-b border-neutral-800 px-4 py-3 text-center text-sm text-gray-400 flex items-center justify-between">
        <span>Lexcapital Assistant</span>
        {voiceMode && (
          <span className="text-green-400 text-xs">🎤 Voice Mode</span>
        )}
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
          filteredMessages.map((msg, i) => {
            const isUser = msg.sender === "You";
            const isVoiceMessage = msg.source === "voice";

            return (
              <motion.div
                key={`${i}-${msg.source}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={`flex items-end gap-2 ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <Image
                    src={msg.avatarUrl || "/bot.png"}
                    alt="bot"
                    width={24}
                    height={24}
                    className={`rounded-full border p-1 ${
                      isVoiceMessage ? "border-green-500" : "border-neutral-700"
                    }`}
                  />
                )}
                <div
                  className={`relative max-w-xs px-3 py-2 rounded-xl text-sm leading-snug group ${
                    isUser
                      ? "bg-blue-700 text-white"
                      : isVoiceMessage
                      ? "bg-green-800 text-gray-200"
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

                  {msg.audio &&
                    !msg.loading &&
                    !voiceMode &&
                    msg.source === "websocket" && (
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
                      {copiedMsg === i ? "✓" : "📋"}
                    </button>
                  )}
                </div>
                {isUser && (
                  <Image
                    src={msg.avatarUrl || "/user.png"}
                    alt="you"
                    width={24}
                    height={24}
                    className="p-1 rounded-full border border-blue-600"
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
          <p className="text-orange-400 mb-2 text-sm">
            Connecting to LiveKit...
          </p>
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
            className={`flex-grow bg-neutral-800 border border-neutral-700 rounded-full px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
              voiceMode ? "cursor-not-allowed" : ""
            }`}
            value={input}
            disabled={loadingSession || voiceMode}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              loadingSession
                ? "Initializing session..."
                : voiceMode
                ? "Voice mode active - use microphone"
                : "Type your message..."
            }
            onKeyDown={(e) => e.key === "Enter" && !voiceMode && handleSend()}
          />

          <button
            onClick={toggleVoiceMode}
            className={`px-3 py-2 rounded-full transition ${
              voiceMode
                ? "bg-red-600 hover:bg-red-500"
                : "bg-green-600 hover:bg-green-500"
            } text-white`}
            title={voiceMode ? "Exit voice mode" : "Enter voice mode"}
            disabled={botIsTyping}
          >
            {voiceMode ? "🔇 Exit Voice" : "🎤 Voice"}
          </button>

          <button
            onClick={handleSend}
            disabled={loadingSession || !input.trim() || voiceMode}
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-full text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
