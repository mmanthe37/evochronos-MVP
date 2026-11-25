import { spawn } from "node:child_process";
import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { evochronosRoot } from "../lib/repo-root.ts";

const SUITES = {
  functional: {
    layer: "python_harness" as const,
    argv: ["python3", "quality/test_functional.py"],
  },
  adapters: {
    layer: "python_harness" as const,
    argv: ["python3", "tests/test_adapters.py"],
  },
  master: {
    layer: "python_harness" as const,
    argv: ["python3", "verification/verify_master_full_system.py"],
  },
  cargo_check: {
    layer: "rust_cargo" as const,
    argv: ["cargo", "check", "--workspace", "--locked", "--offline"],
  },
};

type SuiteId = keyof typeof SUITES;

function runCommand(
  argv: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timed out: ${argv.join(" ")}`));
    }, 120_000);
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
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-4000),
      });
    });
  });
}

export default defineTool({
  description:
    "Run one EvoChronos verification suite on disk. Returns the layer that actually ran (python_harness or rust_cargo). Does not prove other layers.",
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    suite: z
      .enum(["functional", "adapters", "master", "cargo_check"])
      .describe(
        "functional=quality/test_functional.py; adapters=tests/test_adapters.py; master=Python clone harness; cargo_check=cargo check --workspace",
      ),
  }),
  async execute({ suite }, ctx) {
    const spec = SUITES[suite as SuiteId];
    const cwd = evochronosRoot(ctx.workspaceDir);
    const result = await runCommand(spec.argv, cwd);
    return {
      suite,
      layer: spec.layer,
      command: spec.argv.join(" "),
      cwd,
      passed: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      does_not_prove:
        spec.layer === "python_harness"
          ? "This Python process did not cargo-test the Rust crates."
          : "cargo check is a compile check, not a conservation proof.",
    };
  },
});
