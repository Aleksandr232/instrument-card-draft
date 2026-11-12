import { SYSTEM_PROMPT, userPrompt } from "./prompt.js";

export class LlmError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

function baseUrl() {
  return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function extractJson(content) {
  const trimmed = String(content ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new LlmError("Модель вернула ответ без JSON.");
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new LlmError("Модель вернула JSON, который не удалось разобрать.");
  }
}

async function complete(body) {
  let response;
  try {
    response = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000)
    });
  } catch (error) {
    const reason = error.name === "TimeoutError" ? "истекло время ожидания" : "нет соединения";
    throw new LlmError(`Не удалось обратиться к LLM API: ${reason}.`);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `ответ ${response.status}`;
    const llmError = new LlmError(`LLM API отклонил запрос: ${message}`, response.status);
    llmError.payload = message;
    throw llmError;
  }
  return payload?.choices?.[0]?.message?.content || "";
}

export async function requestCard(product) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const body = {
    model,
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(product) }
    ]
  };

  let content;
  try {
    content = await complete({ ...body, response_format: { type: "json_object" } });
  } catch (error) {
    const unsupported = error.status === 400 && /response_format|json_object|unknown/i.test(error.message);
    if (!unsupported) throw error;
    content = await complete(body);
  }

  return { model, card: extractJson(content) };
}
