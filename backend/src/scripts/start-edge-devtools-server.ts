import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const edgeExecutable = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const userProfileDir = "C:\\tmp\\studyconnect_edge_mcp";

if (!fs.existsSync(userProfileDir)) {
  fs.mkdirSync(userProfileDir, { recursive: true });
}

console.log("🚀 Starting Edge Remote Debugging Instance on port 9222...");

const edgeProcess = spawn(
  edgeExecutable,
  [
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    `--user-data-dir=${userProfileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "http://localhost:5173"
  ],
  {
    stdio: "inherit"
  }
);

edgeProcess.on("error", (err) => {
  console.error("Failed to start Edge:", err);
});

edgeProcess.on("exit", (code) => {
  console.log(`Edge process exited with code ${code}`);
});
