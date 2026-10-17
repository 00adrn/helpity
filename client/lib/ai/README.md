# AI helper

- `index.ts`: `askAssistant({ question, code, language, cursor?, selection? }, signal?)` posts to `/api/ai` and returns `{ answer, emotion }`. The route at `app/api/ai/route.ts` calls Gemini on the server so `GEMINI_API_KEY` stays out of browser code, and asks for JSON so the model's mood arrives alongside the answer.
- `emotion.ts`: the emotion-to-sprite map (`public/helpity/`) and `useAssistantMood()`. Happy is the default face; `flat` and `open` only show while `talking`.
- `useCursorFollower.ts`: moves an element to trail Monaco's text cursor, leaning as it moves.
- The UI lives in `components/Helpity.tsx`: click the face to ask a question. While the request runs it shows `thinking`, then `talking` for a time based on answer length, then the mood the model picked (`happy` or `thinking`). Failures show `error`.

Set `GEMINI_API_KEY` in `client/.env.local`. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`. Add user authentication and request limits before exposing this endpoint publicly.

Later: streaming (so `talking` follows real tokens), conversation history, and an explicit action for applying suggested edits to the shared document.
