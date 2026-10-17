"use client";

import type { editor as MonacoNs } from "monaco-editor";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { askAssistant, RateLimitError } from "@/lib/ai";
import {
  EMOTION_SPRITE,
  isVerityQuestion,
  spriteUrl,
  useAssistantMood,
  type Sprite,
} from "@/lib/ai/emotion";
import { useCursorFollower } from "@/lib/ai/useCursorFollower";

const SIZE = 56;
const FLAP_MS = 130;
/** Speaking time scales with the answer length, within these bounds. */
const TALK_MS_PER_CHAR = 35;
const TALK_MS_MIN = 1200;
const TALK_MS_MAX = 6000;
/** How long the model's chosen mood is held after it finishes speaking. */
const AFTERGLOW_MS = 3000;
/** Keep requests inside the limits enforced by app/api/ai/route.ts. */
const MAX_CODE = 30_000;
const MAX_SELECTION = 10_000;

/** Asked when Helpity is clicked while code is highlighted. */
const EXPLAIN_SELECTION = "Explain the highlighted code: what it does and anything worth noticing.";

/** Idle tricks (see .helpity-fidget-* in globals.css) and how long each plays. */
const FIDGETS = [
  { name: "hop", ms: 600 },
  { name: "wiggle", ms: 700 },
  { name: "spin", ms: 800 },
  { name: "squish", ms: 600 },
  { name: "peek", ms: 1100 },
] as const;
const FIDGET_MIN_MS = 2500;
const FIDGET_MAX_MS = 6000;

const ALL_SPRITES: Sprite[] = ["flat", "happy", "think", "open", "angry"];
type MonacoEditor = MonacoNs.IStandaloneCodeEditor;

/** What the assistant needs to know about the editor at the moment of asking. */
function readEditorContext(editor: MonacoEditor) {
  const model = editor.getModel();
  const cursor = editor.getPosition();
  const range = editor.getSelection();

  return {
    code: editor.getValue().slice(0, MAX_CODE),
    language: model?.getLanguageId() ?? "plaintext",
    cursor: cursor ? { line: cursor.lineNumber, column: cursor.column } : undefined,
    selection:
      model && range && !range.isEmpty()
        ? model.getValueInRange(range).slice(0, MAX_SELECTION)
        : undefined,
  };
}

/** The floating assistant: trails the text cursor, answers questions, and shows its mood. */
export function Helpity({ editor }: { editor: MonacoEditor | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const { emotion, angry, enrage, calm, set, flash } = useAssistantMood();
  const [flap, setFlap] = useState(false);
  const [fidget, setFidget] = useState<(typeof FIDGETS)[number]["name"]>();
  const [open, setOpen] = useState(false);
  // Parked in the corner unless text is highlighted.
  const [following, setFollowing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>();
  const request = useRef<AbortController>(undefined);
  const talkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useCursorFollower(editor, ref, SIZE, following);

  // Helpity only leaves its corner while code is highlighted.
  useEffect(() => {
    if (!editor) return;
    let wasFollowing = false;
    const sub = editor.onDidChangeCursorSelection((e) => {
      const next = !e.selection.isEmpty();
      // Heading back to the corner closes the prompt, and drops any question still pending.
      if (wasFollowing && !next) {
        request.current?.abort();
        clearTimeout(talkTimer.current);
        setOpen(false);
        setAnswer(undefined);
        set("idle");
      }
      wasFollowing = next;
      setFollowing(next);
    });
    return () => sub.dispose();
  }, [editor, set]);

  // Cancel anything in flight when Helpity goes away.
  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(talkTimer.current);
    },
    [],
  );

  // While idle, Helpity occasionally does a little trick.
  useEffect(() => {
    if (angry || emotion !== "idle") return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        const trick = FIDGETS[Math.floor(Math.random() * FIDGETS.length)];
        setFidget(trick.name);
        timer = setTimeout(() => {
          setFidget(undefined);
          schedule();
        }, trick.ms);
      }, FIDGET_MIN_MS + Math.random() * (FIDGET_MAX_MS - FIDGET_MIN_MS));
    };

    schedule();
    return () => {
      clearTimeout(timer);
      setFidget(undefined);
    };
  }, [emotion, angry]);

  // Mouth flap while talking.
  useEffect(() => {
    if (emotion !== "talking") return;
    const id = setInterval(() => setFlap((f) => !f), FLAP_MS);
    return () => clearInterval(id);
  }, [emotion]);

  if (!editor) return null;

  const busy = emotion === "thinking" || emotion === "talking";
  const sprite = angry ? "angry" : emotion === "talking" && flap ? "flat" : EMOTION_SPRITE[emotion];

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question.trim());
  }

  // Clicking while code is highlighted explains it right away; otherwise toggle the panel.
  // Monaco keeps its selection while focus is elsewhere, so the highlight is still there.
  function handleClick() {
    const hasSelection = !!editor && !!readEditorContext(editor).selection;
    if (hasSelection && !busy) {
      setOpen(true);
      void ask(EXPLAIN_SELECTION);
    } else {
      setOpen((o) => !o);
    }
  }

  async function ask(text: string) {
    if (!text || !editor) return;

    request.current?.abort();
    clearTimeout(talkTimer.current);

    // The face stays angry until the next question. Only the Verity question itself gets an
    // angry answer, so Gemini never hears about it afterwards.
    const isAngry = isVerityQuestion(text);
    if (isAngry) enrage();
    else calm();

    const controller = new AbortController();
    request.current = controller;

    setAnswer(undefined);
    set("thinking");

    try {
      const result = await askAssistant({
          question: text,
          ...readEditorContext(editor),
          // No code goes along with a Verity question, so there is nothing to give feedback on.
          ...(isAngry && { angry: true, code: "", selection: undefined }),
        }, controller.signal);
      setQuestion("");
      setAnswer(result.answer);
      set("talking");

      const talkMs = Math.min(
        Math.max(result.answer.length * TALK_MS_PER_CHAR, TALK_MS_MIN),
        TALK_MS_MAX,
      );
      talkTimer.current = setTimeout(() => flash(result.emotion, AFTERGLOW_MS), talkMs);
    } catch (error) {
      if (controller.signal.aborted) return;
      setAnswer(
        error instanceof RateLimitError
          ? `Whoa, slow down! I need a little break. Ask me again in ${error.retryAfterSeconds} seconds.`
          : "Oops, I couldn't answer that. Try again in a moment.",
      );
      flash("error", AFTERGLOW_MS);
    }
  }

  return (
    <div
      ref={ref}
      className="group pointer-events-none fixed top-0 left-0 z-50"
      style={{ width: SIZE, height: SIZE, willChange: "transform" }}
    >
      <button
        type="button"
        aria-label="Helpity assistant"
        aria-expanded={open}
        onClick={handleClick}
        className={`helpity helpity-${angry ? "angry" : emotion} pointer-events-auto block h-full w-full cursor-pointer`}
      >
        <span className="helpity-body">
          <span
            className={`helpity-fidget ${!angry && emotion === "idle" && fidget ? `helpity-fidget-${fidget}` : ""}`}
          >
            {/* Every sprite stays mounted so swapping faces never flashes while loading. */}
            {ALL_SPRITES.map((name) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={name}
                src={spriteUrl(name)}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full select-none"
                style={{ opacity: name === sprite ? 1 : 0 }}
              />
            ))}
          </span>
        </span>
      </button>

      {(open || answer) && (
        // data-side / data-vert are set by useCursorFollower so the panel flips near edges.
        <div
          className="pointer-events-auto absolute top-full left-0 mt-2 w-72 rounded-2xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-lg group-data-[side=left]:right-0 group-data-[side=left]:left-auto group-data-[vert=up]:top-auto group-data-[vert=up]:bottom-full group-data-[vert=up]:mt-0 group-data-[vert=up]:mb-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {answer && (
            <div className="mb-2 flex items-start gap-2">
              <p className="max-h-48 flex-1 overflow-y-auto whitespace-pre-wrap">{answer}</p>
              <button
                type="button"
                aria-label="Dismiss answer"
                onClick={() => setAnswer(undefined)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                ×
              </button>
            </div>
          )}
          {open && (
            <form onSubmit={submit} className="flex gap-2">
              <input
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about your code…"
                maxLength={4000}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
              />
              <button
                type="submit"
                disabled={busy || !question.trim()}
                className="rounded-lg bg-yellow-400 px-3 py-1 font-medium text-black disabled:opacity-50"
              >
                Ask
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
