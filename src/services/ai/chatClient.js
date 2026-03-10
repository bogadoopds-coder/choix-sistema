// Thin client for calling the Netlify chat function used by the IA modules.
// Keeps the same endpoint and payload structure as the existing implementation.

const CHAT_ENDPOINT = "/.netlify/functions/chat";

export async function sendChat({ messages, system }) {
  const body = { messages };
  if (system) body.system = system;

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}

