# AI helper

`index.ts` sends a question, the current file's code, and its language to `/api/ai`. The route at `app/api/ai/route.ts` calls Gemini on the server so `GEMINI_API_KEY` stays out of browser code.

For a first integration, call `askAssistant({ question, code: connection.text.toString(), language: file.language })` from your assistant UI and show the returned answer. Later, add conversation history, selected-code context, streaming, and an explicit action for applying suggested edits to the shared document.

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in `client/.env.local`. Add user authentication and request limits before exposing this endpoint publicly.
