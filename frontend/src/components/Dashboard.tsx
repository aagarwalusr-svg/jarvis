"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSpeechOutput } from "@/hooks/useSpeechOutput";
import {
  Activity,
  ArrowUp,
  AudioLines,
  Bot,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  ListTodo,
  Mail,
  Menu,
  Mic,
  Plus,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
const Core = dynamic(() => import("./Core"), { ssr: false });
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS = process.env.NEXT_PUBLIC_WS_URL || API.replace(/^http/, "ws");
type Conversation = { id: string; title: string; created_at: string };
type Message = { id: string; role: string; content: string };
type Provider = {
  id: string;
  label: string;
  model: string;
  configured: boolean;
};
type Task = { id: string; title: string; completed: boolean };
type Memory = { id: string; content: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        results: {
          [index: number]: { [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
const navigation = [
  { id: "dashboard", label: "Command center", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "memory", label: "Memory", icon: BrainCircuit },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "email", label: "Email", icon: Mail },
  { id: "settings", label: "Settings", icon: Settings2 },
];
const defaults: Provider[] = [
  { id: "openai", label: "OpenAI", model: "gpt-4.1-mini", configured: false },
  {
    id: "claude",
    label: "Anthropic Claude",
    model: "claude-sonnet-4-6",
    configured: false,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.5-flash",
    configured: false,
  },
  {
    id: "groq",
    label: "Groq",
    model: "llama-3.3-70b-versatile",
    configured: false,
  },
];

export default function Dashboard() {
  const [section, setSection] = useState("dashboard");
  const [mobile, setMobile] = useState(false);
  const [online, setOnline] = useState(false);
  const [providers, setProviders] = useState(defaults);
  const [provider, setProvider] = useState("groq");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [token, setToken] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");
  const [clock, setClock] = useState("");
  const [speechEngine, setSpeechEngine] = useState<"fish" | "browser">(
    "browser",
  );
  const [fishVoiceId, setFishVoiceId] = useState("");
  const {
    speak,
    stop: stopSpeech,
    speaking,
    speechError,
    clearSpeechError,
  } = useSpeechOutput(API, token, speechEngine);
  const socket = useRef<WebSocket | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const voiceRef = useRef(voice);
  const selection = useRef(0);
  const sending = useRef(false);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);
  const request = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Backend access token required. Enter it in Settings."
            : `Backend request failed (${response.status}).`,
        );
      return response.status === 204 ? (undefined as T) : response.json();
    },
    [token],
  );
  const refresh = useCallback(async () => {
    try {
      await request("/health");
      const [p, c, t, m, v] = await Promise.all([
        request<Provider[]>("/api/providers"),
        request<Conversation[]>("/api/conversations"),
        request<Task[]>("/api/tasks"),
        request<Memory[]>("/api/memory"),
        request<{ engine: "fish" | "browser"; voice_id: string }>("/api/voice"),
      ]);
      setOnline(true);
      setSpeechEngine(v.engine);
      setFishVoiceId(v.voice_id);
      setProviders(p);
      setConversations(c);
      setTasks(t);
      setMemories(m);
    } catch (e) {
      setOnline(false);
      setError(
        e instanceof Error
          ? e.message
          : "Cannot reach backend. Start FastAPI and PostgreSQL.",
      );
    }
  }, [request]);
  useEffect(() => {
    const saved = localStorage.getItem("jarvis-preferences");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (defaults.some((d) => d.id === p.provider)) setProvider(p.provider);
        if (typeof p.model === "string") setModel(p.model);
        setVoice(Boolean(p.voice));
      } catch {}
    }
    const win = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    setVoiceSupported(
      Boolean(win.SpeechRecognition || win.webkitSpeechRecognition),
    );
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
      socket.current?.close();
      recognition.current?.stop();
    };
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void request("/health")
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh, request]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);
  function preferences(p = provider, m = model, v = voice) {
    localStorage.setItem(
      "jarvis-preferences",
      JSON.stringify({ provider: p, model: m, voice: v }),
    );
  }
  function closeChat() {
    stopSpeech();
    selection.current++;
    socket.current?.close();
    socket.current = null;
    sending.current = false;
    setBusy(false);
  }
  async function selectConversation(id: string) {
    closeChat();
    const generation = selection.current;
    setConversation(id);
    setMessages([]);
    setError("");
    try {
      const rows = await request<Message[]>(
        `/api/conversations/${id}/messages`,
      );
      if (generation === selection.current) setMessages(rows);
    } catch (e) {
      setError(String(e));
    }
  }
  function newChat() {
    closeChat();
    setConversation(null);
    setMessages([]);
    setError("");
  }
  async function send(text = input) {
    const content = text.trim();
    if (!content || sending.current || content.length > 10000) return;
    sending.current = true;
    setBusy(true);
    setError("");
    let id = conversation;
    const generation = selection.current;
    try {
      if (!id) {
        const c = await request<Conversation>("/api/conversations", {
          method: "POST",
        });
        if (generation !== selection.current) return;
        id = c.id;
        setConversation(id);
        setConversations((prev) => [c, ...prev]);
      }
      setInput("");
      const payload = JSON.stringify({ content, provider, model });
      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(payload);
        return;
      }
      const ws = new WebSocket(`${WS}/ws/chat/${id}`);
      socket.current = ws;
      const readyTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) ws.close();
      }, 12000);
      ws.onopen = () => ws.send(JSON.stringify({ token }));
      ws.onmessage = (event) => {
        if (generation !== selection.current) return;
        const data = JSON.parse(event.data);
        if (data.type === "ready") {
          clearTimeout(readyTimeout);
          ws.send(payload);
        }
        if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
          if (data.message.role === "user")
            setConversations((prev) =>
              prev.map((c) =>
                c.id === id && c.title === "New conversation"
                  ? { ...c, title: content.slice(0, 80) }
                  : c,
              ),
            );
          if (data.message.role === "assistant" && voiceRef.current) {
            void speak(data.message.content);
          }
        }
        if (data.type === "done" || data.type === "error") {
          sending.current = false;
          setBusy(false);
          if (data.type === "error") setError(data.message);
        }
      };
      ws.onerror = () => {
        if (generation === selection.current)
          setError(
            "WebSocket connection failed. Check backend and access token.",
          );
      };
      ws.onclose = () => {
        clearTimeout(readyTimeout);
        if (generation === selection.current) {
          socket.current = null;
          if (sending.current)
            setError(
              "Chat connection closed before the answer completed. Check backend and access token.",
            );
          sending.current = false;
          setBusy(false);
        }
      };
    } catch (e) {
      sending.current = false;
      setBusy(false);
      setError(e instanceof Error ? e.message : "Unable to send message.");
    }
  }
  function microphone() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const win = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Voice input requires a browser with speech recognition, such as Chrome, on localhost or HTTPS.",
      );
      return;
    }
    stopSpeech();
    const r = new Constructor();
    recognition.current = r;
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) =>
      setInput(
        (prev) => `${prev}${prev ? " " : ""}${e.results[0][0].transcript}`,
      );
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      setError(`Microphone: ${e.error}. Check browser permissions.`);
    };
    try {
      r.start();
      setListening(true);
    } catch {
      setError("Unable to start microphone.");
    }
  }
  async function mutate(action: () => Promise<unknown>) {
    try {
      await action();
      setDraft("");
      setError("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }
  const configured = providers.find((p) => p.id === provider)?.configured;
  const title =
    navigation.find((n) => n.id === section)?.label || "Command center";
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setSection("dashboard");
          }}
        >
          <div className="brand-symbol">
            <Cpu size={23} />
          </div>
          <div>
            JARVIS<small>PERSONAL AI SYSTEM</small>
          </div>
        </a>
        <div className="sidebar-label">
          WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${section === n.id ? "selected" : ""}`}
              onClick={() => {
                setSection(n.id);
                setMobile(false);
                setDraft("");
              }}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "dashboard" && <span className="nav-dot" />}
              {n.id === "tasks" &&
                tasks.filter((t) => !t.completed).length > 0 && (
                  <span className="nav-count">
                    {tasks.filter((t) => !t.completed).length}
                  </span>
                )}
            </button>
          ))}
          <a href="/personas" className="nav-item">
            <Sparkles size={18} />
            <span>Character studio</span>
          </a>
        </nav>
        <div className="sidebar-label history-label">
          CONVERSATIONS{" "}
          <button
            title="New conversation"
            aria-label="New conversation"
            onClick={() => {
              newChat();
              setSection("dashboard");
            }}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="history">
          {conversations.length ? (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`history-row ${conversation === c.id ? "current" : ""}`}
              >
                <button
                  onClick={() => {
                    void selectConversation(c.id);
                    setSection("dashboard");
                    setMobile(false);
                  }}
                >
                  {c.title}
                </button>
                <button
                  title="Delete conversation"
                  aria-label={`Delete ${c.title}`}
                  onClick={() =>
                    void mutate(async () => {
                      await request(`/api/conversations/${c.id}`, {
                        method: "DELETE",
                      });
                      if (conversation === c.id) newChat();
                    })
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          ) : (
            <p>
              Your conversations will
              <br />
              appear here.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="secure-card">
            <ShieldCheck size={17} />
            <div>
              Local command center<small>Keys stay on your backend</small>
            </div>
          </div>
          <div className="profile">
            <div className="avatar">OP</div>
            <div>
              Operator<small>Personal workspace</small>
            </div>
            <button
              aria-label="Open settings"
              onClick={() => setSection("settings")}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className={`status ${online ? "online" : ""}`}>
              <i />
              {online ? "SYSTEM ONLINE" : "BACKEND OFFLINE"}
            </span>
            <span className="clock">{clock || "--:--:--"}</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> YOUR INTELLIGENCE, CONNECTED
              </div>
              <h1>
                {section === "dashboard"
                  ? "Good to have you back, Operator."
                  : title}
              </h1>
              <p>
                {section === "dashboard"
                  ? "Your personal AI command center. Ready when you are."
                  : "One workspace for everything you need."}
              </p>
            </div>
            <div className="version">
              <Radio size={14} /> JARVIS v0.1 <span>STAGE 01</span>
            </div>
          </div>
          {(error || speechError) && (
            <div className="error-banner" role="alert">
              <span>{error || speechError}</span>
              <button
                aria-label="Dismiss error"
                onClick={() => {
                  setError("");
                  clearSpeechError();
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {section === "dashboard" ? (
            <>
              <div className="stat-grid">
                <div className="stat">
                  <span>
                    <Activity size={16} /> SYSTEM STATUS
                  </span>
                  <strong>
                    {online ? "Connected" : "Standby"}
                    <i className={online ? "green" : ""} />
                  </strong>
                  <small>
                    {online
                      ? "Backend & memory available"
                      : "Awaiting backend connection"}
                  </small>
                </div>
                <div className="stat">
                  <span>
                    <BrainCircuit size={16} /> MEMORY BANK
                  </span>
                  <strong>
                    {memories.length.toString().padStart(2, "0")}
                    <em>saved notes</em>
                  </strong>
                  <small>Persistent context for your AI</small>
                </div>
                <div className="stat">
                  <span>
                    <ListTodo size={16} /> ACTIVE TASKS
                  </span>
                  <strong>
                    {tasks
                      .filter((t) => !t.completed)
                      .length.toString()
                      .padStart(2, "0")}
                    <em>in progress</em>
                  </strong>
                  <small>
                    {tasks.filter((t) => t.completed).length} completed tasks
                  </small>
                </div>
                <div className="stat">
                  <span>
                    <Zap size={16} /> AI PROVIDER
                  </span>
                  <strong className="provider-stat">
                    {providers.find((p) => p.id === provider)?.label}
                    <span className="mini-badge">
                      {configured ? "READY" : "KEY NEEDED"}
                    </span>
                  </strong>
                  <small>{model}</small>
                </div>
              </div>
              <div className="command-grid">
                <section className="panel core-panel">
                  <div className="panel-heading">
                    <h2>
                      <Cpu size={16} /> Neural core
                    </h2>
                    <span className="tiny-label">
                      {busy ? "PROCESSING" : "STANDBY"}
                      <i />
                    </span>
                  </div>
                  <Core active={busy || listening || speaking} />
                  <div className="core-caption">
                    <span className="eyebrow">
                      JUST A RATHER VERY INTELLIGENT SYSTEM
                    </span>
                    <h2>J.A.R.V.I.S.</h2>
                    <p>
                      {listening
                        ? "Listening to your command…"
                        : busy
                          ? "Thinking through your request…"
                          : "At your service."}
                    </p>
                    <div
                      className={`wave ${busy || listening ? "active" : ""}`}
                    >
                      {Array.from({ length: 37 }, (_, i) => (
                        <i
                          key={i}
                          style={{
                            height: `${(8 + Math.sin(i * 1.6) ** 2 * 23).toFixed(2)}px`,
                            animationDelay: `${(i * 0.045).toFixed(2)}s`,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      className={`voice-command ${listening ? "listening" : ""}`}
                      onClick={microphone}
                      title={
                        voiceSupported
                          ? "Dictate a message"
                          : "Speech recognition may be unavailable in this browser"
                      }
                    >
                      {listening ? <Square size={15} /> : <Mic size={15} />}
                      {listening ? "Stop listening" : "Voice command"}
                    </button>
                    <small className="voice-note">
                      Dictate, review, then send your command
                    </small>
                  </div>
                  <div className="core-footer">
                    <span>
                      <i /> THREE.JS HOLOGRAM
                    </span>
                    <span>NEURAL INTERFACE</span>
                  </div>
                </section>
                <section className="panel chat-panel">
                  <div className="panel-heading">
                    <h2>
                      <Sparkles size={16} /> JARVIS assistant
                    </h2>
                    <div className="chat-tools">
                      <button
                        aria-label={
                          voice
                            ? "Disable speech output"
                            : "Enable speech output"
                        }
                        className={voice ? "enabled" : ""}
                        onClick={() => {
                          setVoice(!voice);
                          preferences(provider, model, !voice);
                          if (voice) stopSpeech();
                        }}
                      >
                        {voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      </button>
                      <button
                        aria-label="New chat"
                        title="New chat"
                        onClick={newChat}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="chat-messages" aria-live="polite">
                    {!messages.length ? (
                      <div className="chat-welcome">
                        <div className="assistant-logo">
                          <Sparkles size={25} />
                        </div>
                        <h3>What can I help you with?</h3>
                        <p>
                          Think bigger. Plan smarter. Build something great.
                          <br />
                          I’m here to help you make it happen.
                        </p>
                        <div className="suggestions">
                          {[
                            "Plan my day",
                            "Help me write code",
                            "Brainstorm a project",
                          ].map((s) => (
                            <button key={s} onClick={() => setInput(s)}>
                              <span>{s}</span>
                              <ArrowUp size={13} />
                            </button>
                          ))}
                        </div>
                        {!configured && (
                          <div className="key-hint">
                            Connect an API key on the backend to begin.
                            <button onClick={() => setSection("settings")}>
                              Open settings <ChevronRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div className={`message ${m.role}`} key={m.id}>
                          <div className="message-avatar">
                            {m.role === "assistant" ? (
                              <Sparkles size={13} />
                            ) : (
                              "OP"
                            )}
                          </div>
                          <div>
                            <small>
                              {m.role === "assistant" ? "JARVIS" : "YOU"}
                            </small>
                            <p>{m.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {busy && (
                      <div className="thinking">
                        <span />
                        <span />
                        <span /> JARVIS is thinking
                      </div>
                    )}
                    <div ref={end} />
                  </div>
                  <div className="composer-area">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                      }}
                      className="composer"
                    >
                      <textarea
                        aria-label="Message JARVIS"
                        placeholder="Ask JARVIS anything…"
                        rows={2}
                        value={input}
                        maxLength={10000}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                      />
                      <div className="composer-bottom">
                        <span>
                          <span className="model-dot" />
                          {model}
                        </span>
                        <div>
                          <button
                            type="button"
                            aria-label={
                              listening ? "Stop microphone" : "Start microphone"
                            }
                            onClick={microphone}
                            className={listening ? "enabled" : ""}
                          >
                            <Mic size={17} />
                          </button>
                          <button
                            type="submit"
                            aria-label="Send message"
                            className="send"
                            disabled={busy || !input.trim()}
                          >
                            <ArrowUp size={18} />
                          </button>
                        </div>
                      </div>
                    </form>
                    <div className="composer-footnote">
                      <ShieldCheck size={11} />
                      <span>
                        Keys stay server-side · AI responses may be inaccurate
                      </span>
                      <kbd>↵ send</kbd>
                    </div>
                  </div>
                </section>
              </div>
              <div className="lower-grid">
                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <h2>
                      <Zap size={16} /> Quick actions
                    </h2>
                    <span className="tiny-label">YOUR NEXT MOVE</span>
                  </div>
                  <div className="quick-actions">
                    <button onClick={() => setSection("tasks")}>
                      <ListTodo />
                      <div>
                        Create a task<small>Turn ideas into action</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setSection("memory")}>
                      <BrainCircuit />
                      <div>
                        Save a memory<small>Keep what matters</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => setSection("settings")}>
                      <Settings2 />
                      <div>
                        Configure AI<small>Choose your intelligence</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </section>
                <section className="panel connection-panel">
                  <div className="panel-heading">
                    <h2>
                      <AudioLines size={16} /> Connection overview
                    </h2>
                  </div>
                  <div className="connection-row">
                    <span>API gateway</span>
                    <strong className={online ? "green-text" : "muted"}>
                      {online ? "Connected" : "Offline"}
                    </strong>
                  </div>
                  <div className="connection-row">
                    <span>AI provider</span>
                    <strong>
                      {configured ? "Configured" : "Awaiting API key"}
                    </strong>
                  </div>
                  <div className="connection-row">
                    <span>Voice interface</span>
                    <strong>
                      {voiceSupported
                        ? "Browser supported"
                        : "Browser unsupported"}
                    </strong>
                  </div>
                </section>
              </div>
            </>
          ) : section === "settings" ? (
            <section className="panel settings-panel">
              <div className="panel-heading">
                <h2>
                  <Settings2 size={16} /> Intelligence configuration
                </h2>
              </div>
              <div className="settings-body">
                <p>
                  Choose a provider and model. API keys are read from the
                  backend environment and never sent to this browser.
                </p>
                <div className="provider-options">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      className={provider === p.id ? "chosen" : ""}
                      onClick={() => {
                        setProvider(p.id);
                        setModel(p.model);
                        preferences(p.id, p.model);
                      }}
                    >
                      <Sparkles size={20} />
                      <strong>{p.label}</strong>
                      <small>
                        {p.configured ? "Key configured" : "Key not configured"}
                      </small>
                      {provider === p.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <label>
                  Model
                  <input
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      preferences(provider, e.target.value);
                    }}
                    placeholder="Provider model ID"
                  />
                </label>
                <label>
                  Backend access token
                  <input
                    type="password"
                    value={token}
                    autoComplete="off"
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Optional JARVIS_ACCESS_TOKEN"
                  />
                  <small>
                    Kept only in this page’s memory. Required if backend token
                    protection is enabled.
                  </small>
                </label>
                <div className="speech-settings">
                  <AudioLines size={19} />
                  <div>
                    <strong>
                      Voice output ·{" "}
                      {speechEngine === "fish"
                        ? "Fish Audio"
                        : "Browser speech"}
                    </strong>
                    <p>
                      {speechEngine === "fish"
                        ? `Voice ${fishVoiceId}`
                        : "Set FISH_API_KEY and FISH_VOICE_ID on the backend to enable your Fish Audio voice."}
                    </p>
                  </div>
                  {speaking && (
                    <button className="primary-button" onClick={stopSpeech}>
                      Stop speech
                    </button>
                  )}
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={voice}
                    onChange={(e) => {
                      setVoice(e.target.checked);
                      preferences(provider, model, e.target.checked);
                      if (!e.target.checked) stopSpeech();
                    }}
                  />{" "}
                  Read assistant responses aloud
                </label>
                <div className="setup-note">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>Configure secrets securely</strong>
                    <p>
                      Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or
                      GROQ_API_KEY in the root .env file, then restart FastAPI.
                      Browser speech recognition may use your browser vendor’s
                      cloud service. Microphone access requires localhost or
                      HTTPS.
                    </p>
                  </div>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setError("");
                    void refresh();
                  }}
                >
                  Refresh connection status
                </button>
              </div>
            </section>
          ) : section === "tasks" || section === "memory" ? (
            <section className="panel collection-panel">
              <div className="panel-heading">
                <h2>
                  {section === "tasks" ? (
                    <ListTodo size={16} />
                  ) : (
                    <BrainCircuit size={16} />
                  )}
                  {section === "tasks" ? "Your tasks" : "Persistent memories"}
                </h2>
                <span className="tiny-label">POSTGRESQL</span>
              </div>
              <div className="collection-body">
                <p>
                  {section === "memory"
                    ? "Save useful context. Your latest 20 notes are included with future AI requests."
                    : "Keep track of your next steps. Changes are saved to your workspace."}
                </p>
                <form
                  className="collection-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!draft.trim()) return;
                    void mutate(() =>
                      request(
                        section === "tasks" ? "/api/tasks" : "/api/memory",
                        {
                          method: "POST",
                          body: JSON.stringify(
                            section === "tasks"
                              ? { title: draft.trim() }
                              : { content: draft.trim() },
                          ),
                        },
                      ),
                    );
                  }}
                >
                  <input
                    aria-label={section === "tasks" ? "New task" : "New memory"}
                    value={draft}
                    maxLength={section === "tasks" ? 300 : 10000}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      section === "tasks"
                        ? "What needs to get done?"
                        : "What should JARVIS remember?"
                    }
                  />
                  <button className="primary-button" disabled={!draft.trim()}>
                    <Plus size={16} />
                    Add {section === "tasks" ? "task" : "memory"}
                  </button>
                </form>
                {section === "tasks" ? (
                  tasks.length ? (
                    tasks.map((t) => (
                      <div className="collection-row" key={t.id}>
                        <button
                          className={`task-check ${t.completed ? "checked" : ""}`}
                          aria-label={
                            t.completed
                              ? `Reopen ${t.title}`
                              : `Complete ${t.title}`
                          }
                          onClick={() =>
                            void mutate(() =>
                              request(`/api/tasks/${t.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  completed: !t.completed,
                                }),
                              }),
                            )
                          }
                        >
                          {t.completed && <Check size={14} />}
                        </button>
                        <span className={t.completed ? "completed" : ""}>
                          {t.title}
                        </span>
                        <button
                          aria-label={`Delete ${t.title}`}
                          onClick={() =>
                            void mutate(() =>
                              request(`/api/tasks/${t.id}`, {
                                method: "DELETE",
                              }),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <ListTodo size={32} />
                      <h3>A clear runway.</h3>
                      <p>Add your first task to get started.</p>
                    </div>
                  )
                ) : memories.length ? (
                  memories.map((m) => (
                    <div className="collection-row" key={m.id}>
                      <BrainCircuit size={19} />
                      <span>{m.content}</span>
                      <button
                        aria-label="Delete memory"
                        onClick={() =>
                          void mutate(() =>
                            request(`/api/memory/${m.id}`, {
                              method: "DELETE",
                            }),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <BrainCircuit size={32} />
                    <h3>Make it personal.</h3>
                    <p>Save your first memory above.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="panel future-panel">
              <div className="empty-state">
                <Bot size={42} />
                <span className="mini-badge">FUTURE MODULE</span>
                <h2>{title} integration</h2>
                <p>
                  {section === "agents"
                    ? "Specialized agents and computer automation will join your workspace in a future stage."
                    : `Connect your ${section} in a future stage with scoped permissions and explicit approval for actions.`}
                </p>
                <p>
                  This integration is not connected yet. Chat, tasks, and memory
                  are available now.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setSection("dashboard")}
                >
                  Return to command center
                </button>
              </div>
            </section>
          )}
          <div className="hud-dock">
            <span>
              <ShieldCheck size={13} />{" "}
              {online ? "LOCAL SYSTEM CONNECTED" : "SYSTEM STANDBY"}
            </span>
            <button
              onClick={microphone}
              className={listening ? "listening" : ""}
            >
              <Mic size={18} />
              <div>
                {listening ? "LISTENING" : "TALK TO JARVIS"}
                <small>
                  {listening
                    ? "Tap to stop"
                    : "Review your command before sending"}
                </small>
              </div>
            </button>
            <span>
              {speechEngine === "fish" ? "FISH AUDIO VOICE" : "BROWSER VOICE"}
              <AudioLines size={14} />
            </span>
          </div>
          <footer className="page-footer">
            <span>JARVIS COMMAND CENTER</span>
            <span>
              Built for what comes next. <span className="cyan">✧</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
