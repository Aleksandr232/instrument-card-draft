import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { root } from "./env.js";

const exe = path.join(root, ".local", "llama", "bin", "llama-server.exe");
const model = path.join(root, ".local", "models", "qwen2.5-1.5b-instruct-q4_k_m.gguf");

if (!existsSync(exe) || !existsSync(model)) {
  console.error("Нет llama-server или файла модели в .local. Сначала скачайте их по README.");
  process.exit(1);
}

const child = spawn(
  exe,
  [
    "-m",
    model,
    "--host",
    "127.0.0.1",
    "--port",
    "8080",
    "-c",
    "4096",
    "-t",
    "6",
    "--alias",
    "qwen2.5-1.5b-instruct",
    "--jinja"
  ],
  { stdio: "inherit" }
);

child.on("exit", (code) => process.exit(code ?? 0));
