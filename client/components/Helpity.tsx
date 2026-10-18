"use client";

import type { editor as MonacoNs } from "monaco-editor";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { button } from "@/components/button";
import { askAssistant, RateLimitError } from "@/lib/ai";
import {
  EMOTION_SPRITE,
  isVerityQuestion,
  spriteUrl,
  useAssistantMood,
  type Sprite,
} from "@/lib/ai/emotion";
import { useCursorFollower } from "@/lib/ai/useCursorFollower";
import { pop } from "@/lib/motion";

const SIZE = 56;
const FLAP_MS = 130;
/** Speaking time scales with the answer length, within these bounds. */
const TALK_MS_PER_CHAR = 35;
const TALK_MS_MIN = 1200;
const TALK_MS_MAX = 6000;
/** How long the model's chosen mood is held after it finishes speaking. */
const AFTERGLOW_MS = 3000;
/** How long the "highlight some code" nudge stays up. */
const HINT_MS = 4000;
/** Keep requests inside the limits enforced by app/api/ai/route.ts. */
const MAX_CODE = 30_000;
const MAX_SELECTION = 10_000;
const MAX_OUTPUT = 10_000;

/** Asked when Helpity is clicked while code is highlighted. */
const EXPLAIN_SELECTION =
  "Explain the highlighted code: what it does and anything worth noticing.";
const HIGHLIGHT_FIRST =
  "Highlight some code first, then click me and I'll explain it!";
/** Things Helpity says without asking Gemini, when the session tells it something happened. */
const NOTICES = {
  readOnly:
    "Sorry! You can't edit the teacher's code! Raise your hand to give it a try or highlight some code to ask a question!",
  canWrite: "Your teacher gave you a turn! You can type in the teacher's code now.",
  turnOver: "Your turn in the teacher's code is over. Nice work!",
} as const;
const NOTICE_MS = 6000;

export type HelpityNotice = { kind: keyof typeof NOTICES; id: number };

/** Asked when the student presses Explain in the output panel. */
const EXPLAIN_OUTPUT =
  "Explain the console output from running my code: what it means and which part of my code made it.";

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

/**
 * What Helpity's bubble shows. The flow is fixed: highlight code and click Helpity to get an
 * explanation; only after an answer can the student "Ask another question?".
 */
type Bubble =
  | { kind: "hint"; text: string }
  | { kind: "thinking" }
  | { kind: "answer"; text: string; failed: boolean };

/** What the assistant needs to know about the editor at the moment of asking. */
function readEditorContext(editor: MonacoEditor) {
  const model = editor.getModel();
  const cursor = editor.getPosition();
  const range = editor.getSelection();

  return {
    code: editor.getValue().slice(0, MAX_CODE),
    language: model?.getLanguageId() ?? "plaintext",
    cursor: cursor
      ? { line: cursor.lineNumber, column: cursor.column }
      : undefined,
    selection:
      model && range && !range.isEmpty()
        ? model.getValueInRange(range).slice(0, MAX_SELECTION)
        : undefined,
    selectionLines:
      range && !range.isEmpty()
        ? { start: range.startLineNumber, end: range.endLineNumber }
        : undefined,
  };
}

/**
 * The floating assistant. Highlight code and click it for an explanation; then "Ask another
 * question?" for follow-ups. Questions always use the code in `editor`, which the parent sets to
 * the code window the student is working in.
 */
export function Helpity({
  editor,
  explain,
  notice,
}: {
  editor: MonacoEditor | undefined;
  /** Console output to explain; each new `id` asks again. */
  explain?: { output: string; id: number };
  /** Something to say right away; each new `id` says it again. */
  notice?: HelpityNotice;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { emotion, angry, enrage, calm, set, flash } = useAssistantMood();
  const [flap, setFlap] = useState(false);
  const [fidget, setFidget] = useState<(typeof FIDGETS)[number]["name"]>();
  // Parked in the corner unless text is highlighted.
  const [following, setFollowing] = useState(false);
  const [bubble, setBubble] = useState<Bubble>();
  const [askingMore, setAskingMore] = useState(false);
  const [question, setQuestion] = useState("");
  const request = useRef<AbortController>(undefined);
  const talkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useCursorFollower(editor, ref, SIZE, following);

  /** Close the bubble and forget the conversation. */
  function reset() {
    request.current?.abort();
    clearTimeout(talkTimer.current);
    clearTimeout(hintTimer.current);
    setBubble(undefined);
    setAskingMore(false);
    setQuestion("");
  }

  /** A canned message: no Gemini call, and it goes away by itself. */
  function showHint(text: string, ms: number) {
    reset();
    setBubble({ kind: "hint", text });
    flash("thinking", 1200);
    hintTimer.current = setTimeout(() => setBubble(undefined), ms);
  }

  async function ask(text: string, output?: string) {
    if (!text || !editor) return;

    request.current?.abort();
    clearTimeout(talkTimer.current);
    clearTimeout(hintTimer.current);

    // The face stays angry until the next question. Only the Verity question itself gets an
    // angry answer, so Gemini never hears about it afterwards.
    const isAngry = isVerityQuestion(text);
    if (isAngry) enrage();
    else calm();

    const controller = new AbortController();
    request.current = controller;

    setBubble({ kind: "thinking" });
    set("thinking");

    try {
      // Always the editor the student is working in: its code, cursor and current highlight.
      const result = await askAssistant(
        {
          question: text,
          ...readEditorContext(editor),
          output,
          // No code goes along with a Verity question, so there is nothing to give feedback on.
          ...(isAngry && {
            angry: true,
            code: "",
            selection: undefined,
            selectionLines: undefined,
          }),
        },
        controller.signal,
      );
      setBubble({ kind: "answer", text: result.answer, failed: false });
      set("talking");

      const talkMs = Math.min(
        Math.max(result.answer.length * TALK_MS_PER_CHAR, TALK_MS_MIN),
        TALK_MS_MAX,
      );
      talkTimer.current = setTimeout(
        () => flash(result.emotion, AFTERGLOW_MS),
        talkMs,
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setBubble({
        kind: "answer",
        failed: true,
        text:
          error instanceof RateLimitError
            ? `Whoa, slow down! I need a little break. Ask me again in ${error.retryAfterSeconds} seconds.`
            : "Oops, I couldn't answer that. Try again in a moment.",
      });
      flash("error", AFTERGLOW_MS);
    }
  }

  // Helpity only leaves its corner while code is highlighted. Un-highlighting ends the chat.
  useEffect(() => {
    if (!editor) return;
    // A new editor starts from its own selection state.
    let wasFollowing = !editor.getSelection()?.isEmpty();
    queueMicrotask(() => setFollowing(wasFollowing));
    const sub = editor.onDidChangeCursorSelection((e) => {
      const next = !e.selection.isEmpty();
      if (wasFollowing && !next) {
        request.current?.abort();
        clearTimeout(talkTimer.current);
        setBubble(undefined);
        setAskingMore(false);
        setQuestion("");
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
      clearTimeout(hintTimer.current);
    },
    [],
  );

  // Clicking anywhere outside Helpity closes the bubble and drops any question still pending.
  const bubbleShown = !!bubble;
  useEffect(() => {
    if (!bubbleShown) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      request.current?.abort();
      clearTimeout(talkTimer.current);
      clearTimeout(hintTimer.current);
      setBubble(undefined);
      setAskingMore(false);
      setQuestion("");
      set("idle");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [bubbleShown, set]);

  // While idle, Helpity occasionally does a little trick.
  useEffect(() => {
    if (angry || emotion !== "idle") return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(
        () => {
          const trick = FIDGETS[Math.floor(Math.random() * FIDGETS.length)];
          setFidget(trick.name);
          timer = setTimeout(() => {
            setFidget(undefined);
            schedule();
          }, trick.ms);
        },
        FIDGET_MIN_MS + Math.random() * (FIDGET_MAX_MS - FIDGET_MIN_MS),
      );
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

  // Explain the output when the student asks from the output panel.
  const lastExplainId = useRef(explain?.id);
  useEffect(() => {
    if (!explain || explain.id === lastExplainId.current || !editor) return;
    lastExplainId.current = explain.id;
    void ask(EXPLAIN_OUTPUT, explain.output.slice(0, MAX_OUTPUT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explain, editor]);

  // Say what the session asked Helpity to say.
  const lastNoticeId = useRef(notice?.id);
  useEffect(() => {
    if (!notice || notice.id === lastNoticeId.current) return;
    lastNoticeId.current = notice.id;
    showHint(NOTICES[notice.kind], NOTICE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  if (!editor) return null;

  // Only waiting for an answer blocks clicks; the talking animation doesn't.
  const busy = bubble?.kind === "thinking";
  const sprite = angry
    ? "angry"
    : emotion === "talking" && flap
      ? "flat"
      : EMOTION_SPRITE[emotion];

  // The only way to summon Helpity: highlight code, then click. Monaco keeps its selection
  // while focus is on Helpity, so the highlight is still there when this runs.
  function handleClick() {
    if (busy) return;
    if (bubble && bubble.kind !== "hint") {
      reset();
      return;
    }
    if (!editor || !readEditorContext(editor).selection) {
      reset();
      showHint(HIGHLIGHT_FIRST, HINT_MS);
      return;
    }
    void ask(EXPLAIN_SELECTION);
  }

  function submitFollowUp(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setAskingMore(false);
    setQuestion("");
    void ask(text);
  }

  return (
    <div
      ref={ref}
      className="group pointer-events-none fixed top-0 left-0 z-50"
      style={{ width: SIZE, height: SIZE, willChange: "transform" }}
    >
      <button
        type="button"
        aria-label={
          following ? "Ask Helpity about the highlighted code" : "Helpity"
        }
        aria-expanded={!!bubble}
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

      <AnimatePresence>
        {bubble && (
          // data-side / data-vert are set by useCursorFollower so the bubble flips near edges.
          <motion.section
            {...pop}
            aria-live="polite"
            className="pointer-events-auto absolute top-full left-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-sm group-data-[side=left]:right-0 group-data-[side=left]:left-auto group-data-[vert=up]:top-auto group-data-[vert=up]:bottom-full group-data-[vert=up]:mt-0 group-data-[vert=up]:mb-2"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={reset}
              className="absolute top-2 right-2 rounded px-1 text-base leading-none text-muted transition hover:bg-surface-sunken hover:text-fg"
            >
              ×
            </button>

            {/* Right padding keeps the text clear of the × */}
            <div className="py-2.5 pr-8 pl-3 text-sm leading-5">
              {bubble.kind === "hint" && (
                <p className="text-muted">{bubble.text}</p>
              )}
              {bubble.kind === "thinking" && (
                <p className="text-muted">Hmm, let me look at that…</p>
              )}
              {bubble.kind === "answer" && (
                <p
                  className={`max-h-48 overflow-y-auto whitespace-pre-wrap ${bubble.failed ? "text-red-700" : ""}`}
                >
                  {bubble.text}
                </p>
              )}
            </div>

            {/* Follow-ups only after a real answer. */}
            {bubble.kind === "answer" && !bubble.failed && (
              <footer className="border-t border-border px-3 py-2">
                {askingMore ? (
                  <form onSubmit={submitFollowUp} className="flex gap-2">
                    <input
                      autoFocus
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about your code…"
                      maxLength={4000}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-muted/70 focus:outline-2 focus:outline-accent"
                    />
                    <button
                      type="submit"
                      disabled={busy || !question.trim()}
                      className={button.primary}
                    >
                      Ask
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAskingMore(true)}
                    disabled={busy}
                    className="text-sm font-semibold text-accent transition hover:underline disabled:opacity-50"
                  >
                    Ask another question?
                  </button>
                )}
              </footer>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
