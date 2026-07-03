import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, "worker-codex.js");

const child = spawn("node", [workerPath], {
  detached: true,
  stdio: "ignore", // don't hold open any pipes back to the parent
});

child.unref(); // tell Node: "don't wait for this child, exit whenever you want"

process.exit(0); // trigger-codex.js returns control immediately
