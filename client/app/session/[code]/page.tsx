import { Suspense } from "react";


import { SessionView } from "@/components/SessionView";

export default function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    // params is runtime data, so it is awaited inside the Suspense boundary.
    <Suspense fallback={<p className="p-6">Loading session…</p>}>
      {params.then(({ code }) => (
        // Sessions are always entered and left with a full page load (see JoinFlow, the teach
        // page and SessionView's exit), so this page is never kept hidden and restored by Next:
        // its code editors can't survive that.
        <SessionView key={code.toUpperCase()} code={code.toUpperCase()} />
      ))}
    </Suspense>
  );
}
