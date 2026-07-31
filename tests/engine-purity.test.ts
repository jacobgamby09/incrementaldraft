/** Håndhæver PLAN.md's arkitektur-regel: ingen React (eller anden UI) i motoren. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ENGINE_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src", "engine");
const FORBIDDEN = [/from\s+["']react/, /from\s+["']motion/, /from\s+["']zustand/, /from\s+["']@dnd-kit/];

describe("engine-renhed", () => {
  it("src/engine importerer aldrig UI-biblioteker", () => {
    for (const file of readdirSync(ENGINE_DIR)) {
      const src = readFileSync(join(ENGINE_DIR, file), "utf-8");
      for (const pattern of FORBIDDEN) {
        expect(src, `${file} matcher ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
