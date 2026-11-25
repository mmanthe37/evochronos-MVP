import { spawn } from "node:child_process";
import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { evochronosRoot } from "../lib/repo-root.ts";

const atoms = z.object({
  carbon: z.number().int(),
  hydrogen: z.number().int(),
  oxygen: z.number().int(),
  nitrogen: z.number().int(),
  phosphorus: z.number().int(),
  sulfur: z.number().int(),
  iron: z.number().int(),
});

function runPython(
  code: string,
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", code], { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("inspect_composition timed out"));
    }, 30_000);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export default defineTool({
  description:
    "Add and subtract two 7-element AtomicComposition vectors using the Python evochronos SDK. Returns exact integer totals.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    left: atoms,
    right: atoms,
  }),
  async execute({ left, right }, ctx) {
    const payload = JSON.stringify({ left, right });
    const code = `
import json
from evochronos import AtomicComposition
raw = json.loads(${JSON.stringify(payload)})
def vec(d):
    return AtomicComposition(d["carbon"], d["hydrogen"], d["oxygen"], d["nitrogen"], d["phosphorus"], d["sulfur"], d["iron"])
a = vec(raw["left"])
b = vec(raw["right"])
s = a.add(b)
d = a.sub(b)
print(json.dumps({
  "layer": "python_sdk",
  "sum": {"carbon": s.carbon, "hydrogen": s.hydrogen, "oxygen": s.oxygen, "nitrogen": s.nitrogen, "phosphorus": s.phosphorus, "sulfur": s.sulfur, "iron": s.iron, "total_atoms": s.total_atoms},
  "difference": {"carbon": d.carbon, "hydrogen": d.hydrogen, "oxygen": d.oxygen, "nitrogen": d.nitrogen, "phosphorus": d.phosphorus, "sulfur": d.sulfur, "iron": d.iron, "total_atoms": d.total_atoms},
  "equal": a == b,
}))
`;
    const result = await runPython(code, evochronosRoot(ctx.workspaceDir));
    if (result.exitCode !== 0) {
      return {
        ok: false,
        layer: "python_sdk",
        exitCode: result.exitCode,
        stderr: result.stderr.slice(-2000),
      };
    }
    return JSON.parse(result.stdout) as {
      layer: "python_sdk";
      sum: Record<string, number>;
      difference: Record<string, number>;
      equal: boolean;
    };
  },
});
