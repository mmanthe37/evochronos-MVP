import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function isRepoRoot(dir: string): boolean {
  return (
    existsSync(join(dir, "Cargo.toml")) &&
    existsSync(join(dir, "quality", "test_functional.py"))
  );
}

function walkUp(start: string): string | null {
  let dir = resolve(start);
  for (let i = 0; i < 8; i++) {
    if (isRepoRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** EvoChronos checkout. `bdk call` uses a temp workspaceDir; walk up from this file too. */
export function evochronosRoot(workspaceDir: string): string {
  const packagedRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
  );
  return (
    walkUp(workspaceDir) ??
    walkUp(process.cwd()) ??
    walkUp(packagedRoot) ??
    workspaceDir
  );
}
