// ─── Shared AI-response hardening ───────────────────────────────────────
// The model is asked for raw JSON, but real responses occasionally arrive
// with fences, preamble, or trailing prose. These helpers make every route
// tolerant of that — and let routes retry once instead of surfacing a
// "please try again" to the user on the app's core action.

/** Structural type — avoids coupling to SDK type names across versions. */
interface MessageLike {
  content: Array<{ type: string; text?: string }>
}

/** Pull the first text block out of a messages.create response safely. */
export function messageText(msg: MessageLike): string {
  const block = msg.content.find(b => b.type === 'text' && typeof b.text === 'string')
  return block?.text ?? ''
}

/** Extract the JSON object from model output (fences, preamble, trailing prose). */
export function extractJsonObject(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    const lines = t.split('\n')
    t = lines.slice(1, lines.at(-1)?.trim() === '```' ? -1 : undefined).join('\n').trim()
  }
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last > first) t = t.slice(first, last + 1)
  return t
}

/** Parse model output into a JSON object, throwing SyntaxError when hopeless. */
export function parseModelJson<T = Record<string, unknown>>(msg: MessageLike): T {
  return JSON.parse(extractJsonObject(messageText(msg))) as T
}
