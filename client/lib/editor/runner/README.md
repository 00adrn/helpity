# Runner

Runs student JavaScript in a throwaway Web Worker so an infinite loop can't freeze the page.

- `types.ts` defines the shapes shared by the worker and the main-thread code: `RunResult` is what a run returns, and `WorkerRequest` / `WorkerMessage` are the messages passed between the page and the worker.

The worker (`worker.ts`) and the runner function (`runCode.ts`) are added in the next steps.
