"use client";

import type { ReactNode } from "react";

export type MobileTab<Id extends string> = { id: Id; label: string; icon: ReactNode; content: ReactNode };

/**
 * The phone session layout: one full-screen panel at a time, picked from a bottom tab bar.
 * Every panel stays mounted (just hidden), so editors keep their code, cursor and connection.
 */
export function MobileTabs<Id extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: MobileTab<Id>[];
  active: Id;
  onChange(id: Id): void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="flex min-h-0 flex-1 p-2"
        >
          {tab.content}
        </div>
      ))}

      <nav
        role="tablist"
        aria-label="Code windows"
        className="flex shrink-0 border-t border-border bg-wood pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                selected ? "text-accent" : "text-muted"
              }`}
            >
              {/* The selected tab's icon sits in a soft pill, like native tab bars. */}
              <span
                className={`flex h-7 w-14 items-center justify-center rounded-full text-lg transition ${
                  selected ? "bg-accent-subtle/60" : ""
                }`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
