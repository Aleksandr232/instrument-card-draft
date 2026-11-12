import { groundCard } from "./ground.js";
import { requestCard } from "./llm.js";
import { localCard } from "./local.js";
import { toMarkdown, toPlainText } from "./format.js";
import { parseProduct } from "./validate.js";

export async function generateCard(raw, options = {}) {
  const product = parseProduct(raw);
  const warnings = [];
  let notice = "";
  const forceLocal = options.generator === "local";
  const forceLlm = options.generator === "llm";
  const hasKey = Boolean(process.env.OPENAI_API_KEY);

  if (forceLlm && !hasKey) {
    const error = new Error("OPENAI_API_KEY не задан. Добавьте ключ в .env или соберите черновик без модели.");
    error.status = 400;
    throw error;
  }

  let generator = "local";
  let model = null;
  let draft = null;
  let fromModel = false;

  if (!forceLocal && hasKey) {
    try {
      const llm = await requestCard(product);
      draft = llm.card;
      model = llm.model;
      generator = "llm";
      fromModel = true;
    } catch (error) {
      if (forceLlm) throw error;
      notice = `${error.message} Черновик собран локально по входным данным.`;
    }
  }

  if (!draft) {
    draft = localCard(product);
    if (!forceLocal && !hasKey) {
      notice = "OPENAI_API_KEY не задан: черновик собран локально, без выдуманных характеристик.";
    }
  }

  const card = groundCard(draft, product, warnings, { fromModel });
  return {
    ok: true,
    generator,
    model,
    missingFields: product.missingFields,
    notice,
    warnings,
    card,
    markdown: toMarkdown(card, product, warnings),
    text: toPlainText(card, product, warnings)
  };
}
