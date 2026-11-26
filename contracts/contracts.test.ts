import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** Every contract must parse and keep the shared Error shape, so the backend can generate from it. */
const dir = join(import.meta.dirname, "openapi");
const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));

describe.each(files)("contracts/openapi/%s", (file) => {
  const doc = parse(readFileSync(join(dir, file), "utf8"));

  it("is OpenAPI 3.1 with paths", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(0);
  });

  it("only references components that exist, in this file or a sibling", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"(?:\.\/([\w-]+\.yaml))?#\/components\/(\w+)\/(\w+)"/g)];
    for (const [, other, kind, name] of refs) {
      const target = other ? parse(readFileSync(join(dir, other), "utf8")) : doc;
      expect(target.components?.[kind]?.[name], `${other ?? file}#/components/${kind}/${name}`).toBeDefined();
    }
  });
});
