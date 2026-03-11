// Thin client for calling the Netlify chat function used by the IA modules.
// Keeps the same endpoint and payload structure as the existing implementation.

const CHAT_ENDPOINT = "/.netlify/functions/chat";

export async function sendChat({ messages, system, max_tokens }) {
  const body = { messages };
  if (system) body.system = system;
  if (typeof max_tokens === "number" && max_tokens > 0) body.max_tokens = max_tokens;

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}

