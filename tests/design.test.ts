import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPublicDesign, inspectPublicSource } from "../scripts/check-design";

test("public source text and CSS obey the editorial design contract", () => {
  const result = checkPublicDesign();
  assert.ok(result.files > 0);
  assert.deepEqual(result.failures, []);
});

test("design scanner detects escaped punctuation as well as literal JSX text", () => {
  assert.equal(inspectPublicSource("example.tsx", 'const title = "A \\u2014 B";').length, 1);
  assert.equal(inspectPublicSource("example.tsx", `<p>A ${String.fromCodePoint(0x00b7)} B</p>`).length, 1);
  assert.deepEqual(inspectPublicSource("example.tsx", '<p>Helsinki, 27. elokuuta 2026</p>'), []);
});

test("design scanner rejects decorative stripes and gradients without exceptions", () => {
  for (const rule of ["border-left: 3px solid red", "border-inline-start: 2px solid blue", "background: linear-gradient(red, blue)", "background: radial-gradient(red, blue)", "border-radius: 9999px", "box-shadow: 0 4px 8px gray"]) {
    assert.equal(inspectPublicSource("example.css", `.story { ${rule}; }`).length, 1);
  }
  assert.deepEqual(inspectPublicSource("example.css", ".story { border-top: 1px solid var(--rule); }"), []);
});
