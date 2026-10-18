"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FreshOnNavigate } from "@/components/FreshOnNavigate";
import { HelpityLogo } from "@/components/HelpityLogo";

// three.js needs WebGL, so the bouncing ball only loads in the browser.
const BouncingHelpity = dynamic(() => import("@/components/BouncingHelpity"), { ssr: false });

/** The landing page: enter a join code (goes to the lobby at /join/CODE), or start a session at /teach. */
export default function Home() {
  return (
    <FreshOnNavigate>
      <Landing />
    </FreshOnNavigate>
  );
}

function Landing() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-bg px-6">
      <BouncingHelpity />
      <div className="relative z-10 flex w-full flex-col items-center">
        <h1>
          <HelpityLogo size="lg" />
        </h1>
        <p className="mt-6 text-center text-lg text-muted">
          Code with someone you can ask anything to!
        </p>

        {/* The main action: type the code from the board. The lobby then asks for a nickname. */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (joinCode) router.push(`/join/${joinCode}`);
          }}
          className="mt-10 flex w-full max-w-[420px] gap-2"
        >
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            aria-label="Join code"
            placeholder="Join code"
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="h-14 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-center text-2xl font-bold tracking-[2.4px] text-fg shadow-sm placeholder:font-semibold placeholder:tracking-normal placeholder:text-muted/60 focus:outline-2 focus:outline-accent"
          />
          <button
            type="submit"
            disabled={!joinCode}
            className="h-14 shrink-0 rounded-xl bg-accent px-6 text-lg font-bold text-on-accent shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
          >
            Join
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Educator?{" "}
          <Link href="/teach" className="font-semibold text-accent underline-offset-2 hover:underline">
            Start a new session
          </Link>
        </p>
      </div>
    </main>
  );
}
