import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const GEMINI_MODEL = "gemini-1.5-pro";

// --- Lazy singletons ---
let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getProvider(): "anthropic" | "gemini" {
  return process.env.AI_PROVIDER?.toLowerCase() === "gemini" ? "gemini" : "anthropic";
}

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    anthropicClient = new Anthropic({ apiKey: key });
  }
  return anthropicClient;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    geminiClient = new GoogleGenerativeAI(key);
  }
  return geminiClient;
}

/**
 * Returns a provider-agnostic wrapper with the generateContent(prompt) interface
 * used by research.ts, generate.ts, extract.ts, and optimize.ts.
 * Routes to Anthropic or Gemini based on AI_PROVIDER env var.
 */
function makeModel(maxTokens: number, temperature: number) {
  return {
    generateContent: async (prompt: string) => {
      if (getProvider() === "gemini") {
        const model = getGeminiClient().getGenerativeModel({
          model: GEMINI_MODEL,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        });
        const result = await model.generateContent(prompt);
        return { response: { text: () => result.response.text() } };
      } else {
        const response = await getAnthropicClient().messages.create({
          model: CLAUDE_MODEL,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: "user", content: prompt }],
        });
        const text =
          response.content[0].type === "text" ? response.content[0].text : "";
        return { response: { text: () => text } };
      }
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

/**
 * Multi-turn chat: sends a conversation with a system prompt.
 * Routes to Anthropic (native system param) or Gemini (systemInstruction + startChat).
 * Returns the assistant's response text — same format regardless of provider.
 */
export async function sendChatMessage(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens = 2048
): Promise<string> {
  if (getProvider() === "gemini") {
    const model = getGeminiClient().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { temperature: 1.0, maxOutputTokens: maxTokens },
      systemInstruction: system,
    });

    // Convert user/assistant history to Gemini's user/model format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  } else {
    const response = await getAnthropicClient().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
