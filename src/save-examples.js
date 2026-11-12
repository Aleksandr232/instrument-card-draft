import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./env.js";
import { generateCard } from "./pipeline.js";

const samples = ["manometer", "thermometer"];
const outDir = path.join(root, "examples", "results");
await mkdir(outDir, { recursive: true });

for (const name of samples) {
  const raw = await readFile(path.join(root, "examples", `${name}.json`), "utf8");
  const result = await generateCard(raw, { generator: "local" });
  await writeFile(path.join(outDir, `${name}.json`), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, `${name}.md`), `${result.markdown}\n`, "utf8");
  console.log(
    `${name}: title ${[...result.card.seoTitle].length}, description ${[...result.card.seoDescription].length}, queries ${result.card.searchQueries.length}`
  );
}
