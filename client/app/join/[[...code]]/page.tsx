import { Suspense } from "react";

import { FreshOnNavigate } from "@/components/FreshOnNavigate";
import { JoinFlow } from "@/components/JoinFlow";

/** The student lobby: /join, or /join/CODE from a shared link with the code filled in. */
export default function JoinPage({ params }: { params: Promise<{ code?: string[] }> }) {
  return (
    // params is runtime data, so it is awaited inside the Suspense boundary.
    <Suspense fallback={null}>
      {params.then(({ code }) => (
        <FreshOnNavigate>
          <JoinFlow initialCode={code?.[0] ?? ""} />
        </FreshOnNavigate>
      ))}
    </Suspense>
  );
}
