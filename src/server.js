import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv, root } from "./env.js";
import { generateCard } from "./pipeline.js";
import { InputError } from "./validate.js";

const EXAMPLES = {
  manometer: "manometer.json",
  thermometer: "thermometer.json"
};

const FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" }
};

function send(response, status, body, type = "application/json; charset=utf-8") {
  const payload = Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  response.end(payload);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) {
      const error = new InputError("Тело запроса больше 1 МБ.");
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new InputError("Пустое тело запроса.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new InputError("Некорректный JSON. Проверьте кавычки, запятые и скобки.");
  }
}

await loadEnv();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  try {
    if (request.method === "GET" && FILES[url.pathname]) {
      const item = FILES[url.pathname];
      const content = await readFile(path.join(root, "public", item.file));
      send(response, 200, content, item.type);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      send(response, 200, {
        ok: true,
        llm: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || "gpt-4o-mini" : null
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/examples") {
      send(response, 200, {
        examples: [
          { id: "manometer", title: "Манометр DM 02" },
          { id: "thermometer", title: "Термометр ТБ-063" }
        ]
      });
      return;
    }

    const exampleMatch = url.pathname.match(/^\/api\/examples\/([a-z-]+)$/);
    if (request.method === "GET" && exampleMatch) {
      const file = EXAMPLES[exampleMatch[1]];
      if (!file) {
        send(response, 404, { ok: false, error: "Такого примера нет." });
        return;
      }
      const content = await readFile(path.join(root, "examples", file), "utf8");
      send(response, 200, content);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/generate") {
      const body = await readBody(request);
      const generator = body?.generator === "llm" || body?.generator === "local" ? body.generator : undefined;
      const product = body && Object.prototype.hasOwnProperty.call(body, "product") ? body.product : body;
      const result = await generateCard(product, { generator });
      send(response, 200, result);
      return;
    }

    send(response, 404, { ok: false, error: "Маршрут не найден." });
  } catch (error) {
    const status = error.status || 500;
    send(response, status, { ok: false, error: error.message || "Внутренняя ошибка сервера." });
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Черновик карточки: http://localhost:${port}`);
});
