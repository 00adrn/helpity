"use client";

import { useRouter } from "next/navigation";
import { Fragment, useLayoutEffect, type ReactNode } from "react";

/**
 * Start this page fresh whenever it's reached by a normal navigation (a link, router.push or
 * router.replace), e.g. after leaving a session. With cacheComponents, Next keeps recently
 * visited pages alive and restores them as they were, which left the join and teacher flows
 * stuck mid-way ("Joining…"). Browser back/forward still restores the page.
 */
export function FreshOnNavigate({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}

/**
 * Clear a page's "busy" flag (e.g. "Joining…") whenever the user comes back to it: when Next
 * hides it on navigation, and when the browser restores it from its back/forward cache. Otherwise
 * pressing Back after joining shows a button stuck mid-action.
 */
export function useResetBusyOnReturn(setBusy: (busy: false) => void) {
  useLayoutEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pageshow", onShow);
      setBusy(false);
    };
  }, [setBusy]);
}
