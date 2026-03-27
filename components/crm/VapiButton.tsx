"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

const readClientEnv = (value?: string) => (value ?? "").trim();

const isPlaceholderValue = (value: string) =>
  !value ||
  value.includes("your_vapi_") ||
  value.includes("placeholder") ||
  value === "your_public_key" ||
  value === "your_assistant_id";

const parseVapiError = (error: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = (error ?? {}) as any;
  const status = e?.statusCode ?? e?.status ?? e?.error?.status ?? "Unknown";
  const code =
    e?.code ??
    e?.errorCode ??
    e?.error?.code ??
    e?.errorMsg ??
    "Unknown";
  const message =
    e?.error?.message ??
    e?.errorMsg ??
    e?.message?.msg ??
    e?.message ??
    "Connection failed";

  return {
    status: String(status),
    code: String(code),
    message: String(message),
  };
};

const VapiButton = () => {
  const [callStatus, setCallStatus] = useState<"inactive" | "loading" | "active">("inactive");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);

  useEffect(() => {
    // Only import and instantiate on the client side
    import("@vapi-ai/web").then((VapiModule) => {
      const Vapi = VapiModule.default;
      const pubKey = readClientEnv(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
      
      // Log environment for debugging
      console.log("[Vapi] SDK import successful. Public key present:", !!pubKey);
      
      // If undefined, pass a throwaway to avoid instantiation crashes, but toggleCall will prevent actual calls
      const vapiInstance = new Vapi(pubKey || "public-key-placeholder");
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        setCallStatus("active");
        setIsChatOpen(true);
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", text: "Call connected. The agent is listening..." }]);
      });
      
      vapiInstance.on("call-end", () => {
        setCallStatus("inactive");
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", text: "Call ended." }]);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("message", (msg: any) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString() + Math.random(),
              role: msg.role === "assistant" ? "assistant" : "user",
              text: msg.transcript,
            },
          ]);
        } else if (msg.type === "function-call") {
          console.log("[Vapi] Function call:", msg.functionCall.name);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString() + Math.random(),
              role: "system",
              text: `Executing tool: ${msg.functionCall.name}...`,
            },
          ]);
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapiInstance.on("error", (e: any) => {
        console.error("[Vapi] Detailed error:", e);
        const parsedError = parseVapiError(e);
        console.error(
          `[Vapi] Error Status: ${parsedError.status}, Code: ${parsedError.code}, Message: ${parsedError.message}`,
        );
        setCallStatus("inactive");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            text:
              parsedError.status === "400"
                ? `Vapi rejected the request (400). Verify NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID are correct for this environment and redeploy. Message: ${parsedError.message}`
                : `Error: ${parsedError.message} (Code: ${parsedError.code}, Status: ${parsedError.status})`,
          },
        ]);
      });
    }).catch(err => {
      console.error("[Vapi] Failed to load SDK:", err);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", text: `SDK Load Error: ${err.message}` }]);
    });

    return () => {
      if (vapiRef.current) {
        vapiRef.current.removeAllListeners("call-start");
        vapiRef.current.removeAllListeners("call-end");
        vapiRef.current.removeAllListeners("message");
        vapiRef.current.removeAllListeners("error");
      }
    };
  }, []);

  const toggleCall = async () => {
    if (!vapiRef.current) return;

    const pubKey = readClientEnv(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
    const astId = readClientEnv(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);

    if (isPlaceholderValue(pubKey) || isPlaceholderValue(astId)) {
      alert(
        "Vapi config missing or placeholder. Set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID, then redeploy (Vercel) or restart dev server.",
      );
      return;
    }

    if (pubKey.startsWith("sk_")) {
      alert(
        "You are using a secret key in NEXT_PUBLIC_VAPI_PUBLIC_KEY. Use the Vapi public web key only.",
      );
      return;
    }

    if (callStatus === "active") {
      vapiRef.current.stop();
    } else {
      setCallStatus("loading");
      setMessages([]); // Clear chat for new call
      setIsChatOpen(true);
      try {
        await vapiRef.current.start(astId);
      } catch (error) {
        const parsedError = parseVapiError(error);
        console.error("Error starting Vapi call:", error);
        setCallStatus("inactive");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "system",
            text:
              parsedError.status === "400"
                ? `Call start rejected (400). The assistant ID may be invalid for this public key or env vars were changed without redeploy. Message: ${parsedError.message}`
                : `Failed to start call: ${parsedError.message}`,
          },
        ]);
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Toggle Chat Visibility Button (only shows when there are messages and chat is closed) */}
        {!isChatOpen && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsChatOpen(true)}
            className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </motion.button>
        )}

        {/* Start/Stop Call Button */}
        <motion.button
          onClick={toggleCall}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!vapiRef.current || callStatus === "loading"}
          className={`relative flex items-center gap-2 p-2 px-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-all overflow-hidden ${
            callStatus === "active"
              ? "bg-rose-50 text-rose-600 border-2 border-rose-200"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
          }`}
        >
          {callStatus === "active" && (
            <span className="absolute inset-0 block rounded-full opacity-20 bg-rose-500 animate-pulse" />
          )}
          
          {callStatus === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : callStatus === "active" ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          
          {callStatus === "active" ? "End Call" : "Voice AI"}
        </motion.button>
      </div>

      {/* Floating Chat Window Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-[9999]"
          >
            {/* Chat Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${callStatus === "active" ? "bg-rose-500 animate-pulse" : "bg-slate-500"}`} />
                  {callStatus === "active" && (
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-rose-500 animate-ping opacity-75" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Voice Assistant</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {callStatus === "active" ? "Live Call" : "Disconnected"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-300 hover:text-white" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                  <MessageSquare className="w-12 h-12 text-slate-300" />
                  <p className="text-sm text-slate-500 font-medium px-8">
                    Start a call to see the live conversation transcript here.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "self-end" : msg.role === "assistant" ? "self-start" : "self-center text-center max-w-[95%]"
                    }`}
                  >
                    {msg.role !== "system" && (
                      <span className={`text-[10px] mb-1 font-bold uppercase tracking-wider ${msg.role === "user" ? "text-slate-400 pr-2" : "text-indigo-600 pl-2"}`}>
                        {msg.role === "user" ? "You" : "AI Agent"}
                      </span>
                    )}
                    
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-tr-sm"
                          : msg.role === "assistant"
                          ? "bg-white border text-slate-700 border-slate-100 rounded-tl-sm"
                          : "bg-transparent border-0 opacity-60 text-xs italic py-1 px-4 text-center rounded-full shadow-none w-full"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Status Footer */}
            <div className="p-3 bg-white border-t border-slate-100 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center gap-2">
                {callStatus === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
                {callStatus === "loading" ? "Connecting..." : callStatus === "active" ? "Say something..." : "Press Voice AI to begin"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VapiButton;
