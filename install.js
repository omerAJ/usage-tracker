#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const HOME = os.homedir();
const INSTALL_DIR = path.join(HOME, ".usage-tracker");

console.log("Installing usage-tracker...");

// Step 1: copy this repo's collector/ folder to a stable, permanent location.
// Why: if you installed by running npx against a temp download, that temp
// folder disappears after this script exits. Hooks need a path that still
// exists next week.
const sourceDir = path.join(path.dirname(new URL(import.meta.url).pathname), "collector");
fs.rmSync(INSTALL_DIR, { recursive: true, force: true });
fs.cpSync(sourceDir, INSTALL_DIR, { recursive: true });
console.log(`Copied collector files to ${INSTALL_DIR}`);

// Step 2: install its dependencies there.
execSync("npm install", { cwd: INSTALL_DIR, stdio: "inherit" });

// Step 3: safely merge a hook into a JSON settings file.
// "Safely" = don't destroy any hooks the person already has, and don't
// add a duplicate if they run this installer twice.
function addHook(settingsPath, eventName, command) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  }
  settings.hooks ??= {};
  settings.hooks[eventName] ??= [];

  const alreadyThere = JSON.stringify(settings.hooks[eventName]).includes(command);
  if (alreadyThere) {
    console.log(`${eventName} hook already present in ${settingsPath}, skipping.`);
    return;
  }

  settings.hooks[eventName].push({ hooks: [{ type: "command", command }] });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`Added ${eventName} hook to ${settingsPath}`);
}

// Step 4: wire up Claude Code, if installed.
try {
  execSync("claude --version", { stdio: "ignore" });
  addHook(
    path.join(HOME, ".claude", "settings.json"),
    "SessionEnd",
    `node ${path.join(INSTALL_DIR, "trigger.js")}`
  );
} catch {
  console.log("Claude Code not found, skipping.");
}

// Step 5: wire up Codex, if installed.
try {
  execSync("codex --version", { stdio: "ignore" });
  addHook(
    path.join(HOME, ".codex", "hooks.json"),
    "Stop",
    `node ${path.join(INSTALL_DIR, "trigger-codex.js")}`
  );
  console.log("NOTE: open Codex and run /hooks once to trust the new hook.");
} catch {
  console.log("Codex not found, skipping.");
}

console.log("\nDone. Dashboard: https://omeraj.github.io/usage-tracker/");