import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(key);
}

export function getGeminiModel() {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

export function getGeminiResearchModel() {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4096,
    },
  });
}

export function getGeminiGenerateModel() {
  return getGenAI().getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.4,
      topP: 0.85,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
}
