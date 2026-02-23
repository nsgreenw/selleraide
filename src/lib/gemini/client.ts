import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    anthropicClient = new Anthropic({ apiKey: key });
  }
  return anthropicClient;
}

/**
 * Returns a Claude-backed wrapper with the same `generateContent()` interface
 * used by research.ts, generate.ts, extract.ts, and optimize.ts.
 */
function makeModel(maxTokens: number, temperature: number) {
  return {
    generateContent: async (prompt: string) => {
      const response = await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      });
      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return { response: { text: () => text } };
    },
  };
}

/** General-purpose model (gathering/extraction). Temperature 1.0 for natural conversation. */
export function getGeminiModel() {
  return makeModel(4096, 1.0);
}

/** Research model. Slightly lower temperature for more focused output. */
export function getGeminiResearchModel() {
  return makeModel(4096, 0.7);
}

/** Generation model. Low temperature for structured, deterministic JSON output. */
export function getGeminiGenerateModel() {
  return makeModel(8192, 0.4);
}
