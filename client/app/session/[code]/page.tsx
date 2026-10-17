import { Suspense } from "react";

import { SessionView } from "@/components/SessionView";

export default function SessionPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    // params is runtime data, so it is awaited inside the Suspense boundary.
    <Suspense fallback={<p className="p-6">Loading session…</p>}>
      {params.then(({ code }) => (
        <SessionView key={code.toUpperCase()} code={code.toUpperCase()} />
      ))}
    </Suspense>
  );
}
