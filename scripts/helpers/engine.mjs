import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
export function compileEngine() {
  return loadEngine();
}
async function loadEngine() {
  const root = resolve(".");
  const temp = mkdtempSync(join(tmpdir(), "vectorforge-quality-"));
  try {
    const compile = spawnSync(
      join(root, "node_modules/.bin/tsc"),
      [
        "--ignoreConfig",
        "--target",
        "es2022",
        "--module",
        "esnext",
        "--moduleResolution",
        "bundler",
        "--ignoreDeprecations",
        "6.0",
        "--esModuleInterop",
        "--skipLibCheck",
        "--outDir",
        temp,
        "lib/vector-engine/index.ts",
      ],
      { encoding: "utf8" },
    );
    assert.equal(compile.status, 0, compile.stdout + compile.stderr);
    writeFileSync(join(temp, "package.json"), '{"type":"module"}');
    for (const file of readdirSync(temp).filter((file) =>
      file.endsWith(".js"),
    )) {
      const path = join(temp, file);
      writeFileSync(
        path,
        readFileSync(path, "utf8").replace(
          /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
          "$1$2.js$3",
        ),
      );
    }
    symlinkSync(join(root, "node_modules"), join(temp, "node_modules"), "dir");
    const engine = await import(join(temp, "index.js"));
    return {
      ...engine,
      close: () => rmSync(temp, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}
