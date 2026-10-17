# Runner

Runs student JavaScript in a throwaway Web Worker so an infinite loop can't freeze the page.

- `types.ts` defines the messages and results shared by the worker and the page.
- `runCode()` captures console output for the Run button.
- `runTests()` checks the selected preset's cases in the student's private editor. Each case evaluates fresh code, ignores starter demo calls, and reports its expected and actual result.

Both actions have a five-second timeout and can be stopped.
