import { vi } from "vitest";

// Fake Gemini REST reply so no test ever reaches the real API.
export function stubGeminiFetch() {
  const fetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        candidates: [
          { content: { parts: [{ text: "Hello from fake Gemini." }] } },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
