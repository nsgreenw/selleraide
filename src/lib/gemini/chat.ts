import type {
  ConversationStatus,
  Conversation,
  ListingContent,
  Message,
  ProductContext,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiModel } from "./client";
import { buildSystemPrompt } from "./prompts/system";
import { researchProduct } from "./research";
import { generateListing } from "./generate";

interface ChatResult {
  response: string;
  updatedStatus?: ConversationStatus;
  listing?: ListingContent;
  assistantMessage?: Message;
}

/**
 * Core multi-turn conversation handler.
 * Manages the conversation lifecycle: gathering -> researching -> generating -> refining.
 */
export async function handleChatMessage(
  conversationId: string,
  userMessage: string,
  supabase: SupabaseClient,
  options?: { aplusModuleCount?: number }
): Promise<ChatResult> {
  // 1. Fetch conversation with messages
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error(
      `Failed to fetch conversation: ${convError?.message ?? "not found"}`
    );
  }

  const conv = conversation as Conversation;

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) {
    throw new Error(`Failed to fetch messages: ${msgError.message}`);
  }

  const messageHistory = (messages ?? []) as Message[];

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(conv.marketplace);

  // 3. Determine current status and handle phase transitions
  let currentStatus = conv.status;
  let productContext: ProductContext = conv.product_context ?? {};
  let listing: ListingContent | undefined;

  // --- RESEARCHING phase: run product research ---
  if (currentStatus === "researching") {
    try {
      const researchData = await researchProduct(
        productContext,
        conv.marketplace
      );
      productContext = { ...productContext, research_data: researchData };

      // Persist updated product context with research data
      await supabase
        .from("conversations")
        .update({
          product_context: productContext,
          status: "generating",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      currentStatus = "generating";
    } catch {
      // If research fails, continue to generating with what we have
      await supabase
        .from("conversations")
        .update({
          status: "generating",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      currentStatus = "generating";
    }
  }

  // --- GENERATING phase: generate the listing ---
  if (currentStatus === "generating") {
    try {
      const productContextWithCount = {
        ...productContext,
        aplus_module_count: options?.aplusModuleCount ?? 4,
      };
      listing = await generateListing(productContextWithCount, conv.marketplace);

      // Transition to refining
      await supabase
        .from("conversations")
        .update({
          status: "refining",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      currentStatus = "refining";

      // Build a summary response about the generated listing
      const assistantResponse = buildListingResponse(listing, conv.marketplace);

      // Save assistant message
      const savedMsg = await saveAssistantMessage(
        supabase,
        conversationId,
        assistantResponse,
        { phase: "generating", has_listing: true }
      );

      return {
        response: assistantResponse,
        updatedStatus: "refining",
        listing,
        assistantMessage: savedMsg,
      };
    } catch (err) {
      console.error("Listing generation failed:", err instanceof Error ? err.message : err);

      const reason = err instanceof Error && err.message.includes("429")
        ? "The AI service is temporarily busy."
        : "I encountered an issue generating your listing.";
      const errorMsg = `${reason} Let me try a different approach. Could you confirm the key details of your product?`;

      // Fall back to gathering on generation failure
      await supabase
        .from("conversations")
        .update({
          status: "gathering",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      const savedErrMsg = await saveAssistantMessage(supabase, conversationId, errorMsg, {
        phase: "generating",
        error: err instanceof Error ? err.message : "Unknown error",
      });

      return { response: errorMsg, updatedStatus: "gathering", assistantMessage: savedErrMsg };
    }
  }

  // --- GATHERING and REFINING phases: use conversational Gemini ---
  const geminiMessages = buildGeminiHistory(
    systemPrompt,
    messageHistory,
    userMessage,
    currentStatus,
    productContext
  );

  const chat = getGeminiModel().startChat({
    history: geminiMessages.slice(0, -1),
  });

  const lastMessage = geminiMessages[geminiMessages.length - 1];
  const result = await chat.sendMessage(
    lastMessage.parts.map((p) => p.text).join("")
  );
  const assistantResponse = result.response.text();

  // --- Post-response processing for GATHERING phase ---
  let updatedStatus: ConversationStatus | undefined;

  if (currentStatus === "gathering") {
    // Extract product context from the conversation so far
    const updatedContext = await extractProductContext(
      [...messageHistory, { role: "user", content: userMessage } as Message],
      assistantResponse,
      productContext
    );

    if (updatedContext) {
      productContext = updatedContext;

      // Persist updated product context
      await supabase
        .from("conversations")
        .update({
          product_context: productContext,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    // Check if we have enough info to transition to researching
    if (hasEnoughContext(productContext)) {
      updatedStatus = "researching";

      await supabase
        .from("conversations")
        .update({
          status: "researching",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }
  }

  // Save assistant message
  const savedMsg = await saveAssistantMessage(supabase, conversationId, assistantResponse, {
    phase: currentStatus,
  });

  return {
    response: assistantResponse,
    updatedStatus,
    listing,
    assistantMessage: savedMsg,
  };
}

/**
 * Builds Gemini chat history from the conversation messages.
 * Maps system/user/assistant messages to the Gemini Content format.
 */
function buildGeminiHistory(
  systemPrompt: string,
  messageHistory: Message[],
  userMessage: string,
  status: ConversationStatus,
  productContext: ProductContext
): Array<{
  role: "user" | "model";
  parts: Array<{ text: string }>;
}> {
  const history: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  // Gemini uses the first user message to carry the system prompt context
  // We prepend the system prompt to the first user message
  let systemPrepended = false;

  // Add status context to the system prompt
  let statusContext = "";
  if (status === "refining") {
    statusContext =
      "\n\nThe listing has been generated. The user may now request refinements to specific fields. Only modify what they ask about.";
  } else if (status === "gathering") {
    const collected: string[] = [];
    if (productContext.product_name)
      collected.push(`Product: ${productContext.product_name}`);
    if (productContext.brand) collected.push(`Brand: ${productContext.brand}`);
    if (productContext.category)
      collected.push(`Category: ${productContext.category}`);
    if (productContext.key_features?.length)
      collected.push(
        `Features: ${productContext.key_features.join(", ")}`
      );
    if (productContext.target_audience)
      collected.push(`Audience: ${productContext.target_audience}`);

    if (collected.length > 0) {
      statusContext = `\n\nInformation gathered so far:\n${collected.join("\n")}`;
    }
  }

  const fullSystemPrompt = systemPrompt + statusContext;

  for (const msg of messageHistory) {
    if (msg.role === "system") {
      // System messages are skipped — handled via prepended system prompt
      continue;
    }

    if (msg.role === "user") {
      const text = !systemPrepended
        ? `[System Instructions]\n${fullSystemPrompt}\n\n[User Message]\n${msg.content}`
        : msg.content;
      history.push({ role: "user", parts: [{ text }] });
      systemPrepended = true;
    } else if (msg.role === "assistant") {
      history.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  // Add the new user message
  const newUserText = !systemPrepended
    ? `[System Instructions]\n${fullSystemPrompt}\n\n[User Message]\n${userMessage}`
    : userMessage;
  history.push({ role: "user", parts: [{ text: newUserText }] });

  return history;
}

/**
 * Extracts structured product context from conversation messages
 * by asking Gemini to parse the information shared so far.
 */
async function extractProductContext(
  messages: Message[],
  latestAssistantResponse: string,
  existingContext: ProductContext
): Promise<ProductContext | null> {
  const conversationText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n---\n");

  const prompt = `Extract product information from this conversation between a seller and an assistant. Return ONLY a JSON object with the fields that have been mentioned. Do not invent information.

CONVERSATION (user messages):
${conversationText}

LATEST ASSISTANT RESPONSE:
${latestAssistantResponse}

ALREADY EXTRACTED:
${JSON.stringify(existingContext, null, 2)}

Return a JSON object with ONLY the fields where you have information. Use these field names:
{
  "product_name": "string or null",
  "brand": "string or null",
  "category": "string or null",
  "key_features": ["feature1", "feature2"] or null,
  "target_audience": "string or null",
  "differentiators": ["diff1", "diff2"] or null,
  "price_point": "string or null",
  "compliance_info": "string or null"
}

Merge with the already-extracted data — keep existing values unless the user has provided an update. Respond with ONLY the JSON object.`;

  try {
    const result = await getGeminiModel().generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Merge with existing context, preserving research_data
    const merged: ProductContext = {
      ...existingContext,
    };

    if (parsed.product_name) merged.product_name = String(parsed.product_name);
    if (parsed.brand) merged.brand = String(parsed.brand);
    if (parsed.category) merged.category = String(parsed.category);
    if (Array.isArray(parsed.key_features) && parsed.key_features.length > 0) {
      merged.key_features = parsed.key_features.map(String);
    }
    if (parsed.target_audience)
      merged.target_audience = String(parsed.target_audience);
    if (
      Array.isArray(parsed.differentiators) &&
      parsed.differentiators.length > 0
    ) {
      merged.differentiators = parsed.differentiators.map(String);
    }
    if (parsed.price_point) merged.price_point = String(parsed.price_point);
    if (parsed.compliance_info)
      merged.compliance_info = String(parsed.compliance_info);

    return merged;
  } catch {
    // Extraction is best-effort; return null on failure
    return null;
  }
}

/**
 * Checks whether we have enough product context to proceed to research.
 * Requires at minimum: product_name, category, and at least 3 key features.
 */
function hasEnoughContext(ctx: ProductContext): boolean {
  const hasName = !!ctx.product_name && ctx.product_name.trim().length > 0;
  const hasCategory = !!ctx.category && ctx.category.trim().length > 0;
  const hasFeatures =
    Array.isArray(ctx.key_features) && ctx.key_features.length >= 3;

  return hasName && hasCategory && hasFeatures;
}

/**
 * Builds a human-readable response summarizing the generated listing.
 */
function buildListingResponse(
  listing: ListingContent,
  marketplace: string
): string {
  const parts: string[] = [];

  parts.push(
    `Great news! I have generated your ${marketplace} listing. Here is a summary:\n`
  );
  parts.push(`**Title:** ${listing.title}\n`);

  if (listing.bullets && listing.bullets.length > 0) {
    parts.push("**Bullet Points:**");
    for (let i = 0; i < listing.bullets.length; i++) {
      parts.push(`${i + 1}. ${listing.bullets[i]}`);
    }
    parts.push("");
  }

  parts.push(
    `**Description:** ${listing.description.substring(0, 200)}${listing.description.length > 200 ? "..." : ""}\n`
  );

  if (listing.backend_keywords) {
    parts.push(`**Backend Keywords:** ${listing.backend_keywords}\n`);
  }

  parts.push(
    "The listing is now ready for your review. You can ask me to refine any specific field — for example, \"make the title shorter\" or \"add more detail to bullet 3\"."
  );

  return parts.join("\n");
}

/**
 * Saves an assistant message to the database and returns it.
 */
async function saveAssistantMessage(
  supabase: SupabaseClient,
  conversationId: string,
  content: string,
  metadata: Record<string, unknown>
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content,
      metadata,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to save assistant message: ${error?.message ?? "no data returned"}`);
  }

  return data as Message;
}
