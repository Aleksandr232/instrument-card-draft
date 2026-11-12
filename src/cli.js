import { readFile } from "node:fs/promises";
import { loadEnv } from "./env.js";
import { generateCard } from "./pipeline.js";

await loadEnv();

const file = process.argv[2];
if (!file) {
  console.error("Укажите файл товара: node src/cli.js examples/manometer.json");
  process.exit(1);
}

const generator = process.argv.includes("--llm") ? "llm" : process.argv.includes("--local") ? "local" : undefined;
const raw = await readFile(file, "utf8");
const result = await generateCard(raw, { generator });
console.log(result.markdown);
console.log("\n---\n");
console.log(`Источник: ${result.generator}${result.model ? ` (${result.model})` : ""}`);
if (result.missingFields.length) console.log(`Не заполнено: ${result.missingFields.join(", ")}`);
