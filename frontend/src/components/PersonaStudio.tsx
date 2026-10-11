"use client";
import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Sparkles,
} from "lucide-react";
import cast from "../../../shared/personas.json";

type Character = (typeof cast.characters)[number];
type Expression = "focused" | "happy" | "disappointed";
function Portrait({
  character,
  expression,
  profile = false,
}: {
  character: Character;
  expression: Expression;
  profile?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const sister = character.id === "jaden";
  const jersey = sister ? "#36bba9" : "#3169d6";
  return (
    <svg
      viewBox="0 0 400 480"
      role="img"
      aria-label={`${character.name}, fictional age ${character.story_age}, ${expression} ${profile ? "profile" : "front"} character draft`}
    >
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor="#234c63" />
          <stop offset="1" stopColor="#102b37" />
        </linearGradient>
      </defs>
      <rect width="400" height="480" fill={`url(#${id})`} />
      <circle cx="200" cy="190" r="145" fill="#81d6d7" opacity=".07" />
      <path
        d="M0 360h400M0 390h400M200 345v135M0 445l200-80 200 80"
        stroke="#7ac9ca"
        opacity=".14"
        fill="none"
      />
      <ellipse cx="203" cy="436" rx="81" ry="13" fill="#051e2a" opacity=".5" />
      <g transform={sister ? "translate(12 38) scale(.94)" : "translate(0 0)"}>
        {sister && (
          <path d="M232 98c62-20 78 38 41 109 4-54-4-78-34-79" fill="#291b21" />
        )}
        <path
          d="M176 328l-6 79h23l15-75M213 330l7 78h23l-4-82"
          fill="#bb7c57"
          stroke="#985d45"
          strokeWidth="3"
        />
        <path
          d="M169 398l-15 24q-6 14 14 14h30l-3-33M219 402l-2 31h44q14-6 2-17l-21-16"
          fill="#e8f0ed"
          stroke="#c7ddd9"
          strokeWidth="3"
        />
        <path d="M158 426h36m25 0h42" stroke={jersey} strokeWidth="5" />
        <path
          d="M168 277h72l13 61-45-1-8-22-7 22h-38z"
          fill={jersey}
          stroke="#19496d"
          strokeWidth="3"
        />
        <path d="M168 282l-9 48m80-48 10 48" stroke="#e2f7f3" strokeWidth="5" />
        <path
          d="M161 191q-17 4-24 42l-12 49q-8 21 7 27 16 4 20-19l19-48M239 192q20 8 26 40l14 40q11 16-2 25-15 6-24-13l-20-46"
          fill="#c99169"
          stroke="#ad7253"
          strokeWidth="3"
        />
        <path
          d="M175 185l-17 14 11 83h72l4-83-22-14z"
          fill={jersey}
          stroke="#e1f8f0"
          strokeWidth="4"
        />
        <path
          d="M180 185q21 23 40 0"
          fill="#b57957"
          stroke="#e3f7f4"
          strokeWidth="4"
        />
        <text
          x="202"
          y="250"
          textAnchor="middle"
          fill="#f5fcff"
          fontFamily="Arial"
          fontWeight="bold"
          fontSize="36"
        >
          {sister ? "2" : "1"}
        </text>
        <path d="M185 160v27q17 14 32 0v-27" fill="#bb7b57" />
        <ellipse cx="165" cy="132" rx="9" ry="14" fill="#c48b64" />
        <ellipse cx="239" cy="132" rx="9" ry="14" fill="#c48b64" />
        <path
          d="M164 104q6-48 43-45 37 1 36 48v41q-8 37-40 40-33-3-41-39z"
          fill="#d09b73"
          stroke="#ad7454"
          strokeWidth="2"
        />
        {sister ? (
          <path
            d="M161 128q-18-65 32-69 41-11 54 39l-6 33-10-43q-19 13-55 13z"
            fill="#2e2025"
          />
        ) : (
          <>
            <path
              d="M162 113q-8-56 42-57 52 1 40 58l-13-21q-19 7-54 1z"
              fill="#2b2024"
            />
            {[173, 188, 204, 220, 233].map((x, i) => (
              <circle
                key={x}
                cx={x}
                cy={i % 2 ? 70 : 78}
                r="12"
                fill="#32262a"
              />
            ))}
          </>
        )}
        {profile ? (
          <>
            <path
              d="M216 119l14-3"
              stroke="#3b2825"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="223" cy="132" rx="4" ry="6" fill="#302422" />
            <path
              d="M237 129l12 18-13 5"
              fill="#ce9068"
              stroke="#ac714f"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            <path
              d={
                expression === "focused"
                  ? "M174 117l15 3m28 0 14-3"
                  : "M175 117q7-5 14 0m27 0q7-5 14 0"
              }
              stroke="#3c2928"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="183" cy="132" rx="5" ry="7" fill="#372824" />
            <ellipse cx="223" cy="132" rx="5" ry="7" fill="#372824" />
            <circle cx="185" cy="130" r="1.6" fill="white" />
            <circle cx="225" cy="130" r="1.6" fill="white" />
            <path
              d="M202 133l-4 15h8"
              stroke="#ad7454"
              strokeWidth="2"
              fill="none"
            />
          </>
        )}
        <path
          d={
            expression === "happy"
              ? "M186 157q17 22 34 0z"
              : expression === "disappointed"
                ? "M189 166q14-12 27 0"
                : "M191 160q12 5 24 0"
          }
          fill={expression === "happy" ? "#fff0df" : "none"}
          stroke="#754c40"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx="130"
          cy="301"
          r="33"
          fill="#da803d"
          stroke="#864d30"
          strokeWidth="3"
        />
        <path
          d="M97 301h66m-33-33v66m-25-54q40 21 48 42m-44 1q10-39 39-44"
          stroke="#79482f"
          strokeWidth="2"
          fill="none"
        />
      </g>
      <text
        x="25"
        y="30"
        fill="#87c3c9"
        fontSize="10"
        fontFamily="monospace"
        letterSpacing="2"
      >
        CHARACTER DRAFT / {sister ? "02" : "01"}
      </text>
    </svg>
  );
}
function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function PersonaStudio() {
  const [selected, setSelected] = useState("julian");
  const [expression, setExpression] = useState<Expression>("focused");
  const [profile, setProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("groq");
  const [token, setToken] = useState("");
  const [prompt, setPrompt] = useState(
    "Your sibling challenges you to a friendly shooting contest. What do you say?",
  );
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const character = cast.characters.find((c) => c.id === selected)!;
  const visual = `${character.visual_prompt}\nExpression: ${expression}. View: ${profile ? "side profile" : "full-body front"}.\n${cast.continuity.rules.join(" ")}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(visual);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(
        "Clipboard unavailable. Use Export character pack to save the prompt.",
      );
    }
  }
  async function preview() {
    setBusy(true);
    setError("");
    setReply("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/personas/${selected}/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: prompt, provider }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Preview failed (${response.status})`,
        );
      setReply(data.reply);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not reach the AI backend.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="persona-studio">
      <header>
        <Link href="/">
          <ArrowLeft size={15} /> JARVIS workspace
        </Link>
        <span>CAST DEVELOPMENT · CHAPTER 01</span>
        <button
          onClick={() =>
            download(
              "newman-childhood-cast.json",
              JSON.stringify(cast, null, 2),
              "application/json",
            )
          }
        >
          <Download size={15} />
          Export both personas
        </button>
      </header>
      <main>
        <div className="studio-heading">
          <div>
            <p className="studio-kicker">BEFORE THE SPOTLIGHT</p>
            <h1>
              Small players.
              <br />
              <em>Big dreams.</em>
            </h1>
            <p>Two siblings. One court. Start with the characters.</p>
          </div>
          <div className="studio-disclosure">
            FICTIONAL CHARACTER STUDY
            <small>
              Inspired by public basketball personas.
              <br />
              Invented ages and characterization.
            </small>
          </div>
        </div>
        <div className="cast-tabs">
          {cast.characters.map((c) => (
            <button
              key={c.id}
              aria-pressed={selected === c.id}
              disabled={busy}
              className={selected === c.id ? "active" : ""}
              onClick={() => {
                setSelected(c.id);
                setReply("");
                setError("");
              }}
            >
              <span>0{c.id === "julian" ? 1 : 2}</span>
              <div>
                {c.name}
                <small>
                  Story age {c.story_age} · {c.role}
                </small>
              </div>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
        <div className="studio-grid">
          <section className="portrait-panel">
            <div className="portrait-preview">
              <Portrait
                character={character}
                expression={expression}
                profile={profile}
              />
            </div>
            <div className="portrait-controls">
              <span>EXPRESSION</span>
              <div>
                {(["focused", "happy", "disappointed"] as Expression[]).map(
                  (e) => (
                    <button
                      key={e}
                      aria-pressed={e === expression}
                      className={e === expression ? "active" : ""}
                      onClick={() => setExpression(e)}
                    >
                      {e}
                    </button>
                  ),
                )}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={profile}
                  onChange={(e) => setProfile(e.target.checked)}
                />{" "}
                Profile study
              </label>
            </div>
            <p>
              Original SVG visual draft · reference direction, not a real
              childhood photograph
            </p>
          </section>
          <section className="persona-details">
            <p className="studio-kicker">
              CHARACTER BIBLE / 0{selected === "julian" ? 1 : 2}
            </p>
            <h2>{character.name}</h2>
            <div className="persona-tags">
              <span>Age {character.story_age} in this story</span>
              <span>{character.appearance.stature}</span>
            </div>
            <h3>Who they are</h3>
            <div className="trait-list">
              {character.personality.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="motivation-grid">
              <div>
                <h3>The dream</h3>
                <p>{character.goal}</p>
              </div>
              <div>
                <h3>Room to grow</h3>
                <p>{character.growth_edge}</p>
              </div>
            </div>
            <h3>Keep the look consistent</h3>
            <p>
              {character.appearance.hair}. {character.appearance.face}.{" "}
              {character.appearance.skin}.
            </p>
            <p>
              {character.signature_outfit.jersey};{" "}
              {character.signature_outfit.shorts};{" "}
              {character.signature_outfit.shoes}.
            </p>
            <blockquote>
              “{character.sample_line}”
              <small>Written sample dialogue · fictional</small>
            </blockquote>
            <div className="detail-actions">
              <button onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                {copied ? "Copied" : "Copy image prompt"}
              </button>
              <button
                onClick={() =>
                  download(
                    `${selected}-persona.json`,
                    JSON.stringify(
                      { ...character, current_visual_prompt: visual },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                <Download size={15} />
                Export character pack
              </button>
              <button
                onClick={() => {
                  const svg = document.querySelector(".portrait-preview svg");
                  if (svg)
                    download(
                      `${selected}-${expression}.svg`,
                      new XMLSerializer().serializeToString(svg),
                      "image/svg+xml",
                    );
                }}
              >
                Save illustration
              </button>
            </div>
          </section>
        </div>
        <section className="studio-bottom">
          <div className="reference-panel">
            <p className="studio-kicker">REFERENCE PACK PLAN</p>
            <h2>One identity, every shot.</h2>
            <p>
              Use the same appearance and outfit for the six reference views
              below. Exported packs contain full visual prompts, character
              instructions, and continuity rules.
            </p>
            <div className="reference-views">
              {character.reference_views.map((v, i) => (
                <span key={v}>
                  <b>0{i + 1}</b>
                  {v}
                </span>
              ))}
            </div>
            <small>
              These are reference prompts. Generated image packs and video
              episodes come in the next stage.
            </small>
          </div>
          <div className="dialogue-panel">
            <p className="studio-kicker">PERSONA VOICE TEST</p>
            <h2>
              How would {selected === "julian" ? "Julian" : "Jaden"} respond?
            </h2>
            <p>
              One-turn AI dialogue preview. Uses your backend provider key; does
              not save a conversation.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void preview();
              }}
            >
              <div className="preview-options">
                <label>
                  Provider
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="groq">Groq</option>
                    <option value="claude">Claude</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                  </select>
                </label>
                <label>
                  Backend token (optional)
                  <input
                    aria-label="Persona backend token"
                    type="password"
                    value={token}
                    autoComplete="off"
                    onChange={(e) => setToken(e.target.value)}
                  />
                </label>
              </div>
              <textarea
                aria-label="Character situation"
                value={prompt}
                maxLength={10000}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
              <button disabled={busy || !prompt.trim()}>
                <Sparkles size={15} />
                {busy ? "Writing dialogue…" : "Preview character dialogue"}
              </button>
            </form>
            {error && (
              <p role="alert" className="studio-error">
                {error}
              </p>
            )}
            {reply && (
              <blockquote aria-live="polite">
                {reply}
                <small>AI-generated fictional dialogue</small>
              </blockquote>
            )}
          </div>
        </section>
        <footer>
          CHAPTER 01 / CHARACTER CREATION
          <span>No episodes yet. Build the cast first.</span>
        </footer>
      </main>
    </div>
  );
}
