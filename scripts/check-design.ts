import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const forbidden = /[\u00b7\u2022\u2219\u2014\u2013]/;
const prohibitedCss = /\bborder-(?:left|inline-start)(?:-[a-z]+)?\s*:|\b(?:linear|radial)-gradient\s*\(|\bborder-radius\s*:\s*9999px|\bbox-shadow\s*:|\bbackdrop-filter\s*:/i;

export function inspectPublicSource(filename: string, source: string): string[] {
  const failures: string[] = [];
  if (extname(filename) === ".css") {
    if (prohibitedCss.test(source)) failures.push(`${filename}: prohibited decorative CSS`);
    if (forbidden.test(source)) failures.push(`${filename}: prohibited punctuation`);
    return failures;
  }
  const document = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if ((ts.isStringLiteralLike(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) && forbidden.test(node.text)) {
      const line = document.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      failures.push(`${filename}:${line}: prohibited punctuation in a public string`);
    }
    ts.forEachChild(node, visit);
  };
  visit(document);
  return failures;
}

export function checkPublicDesign(root = process.cwd()): { files: number; failures: string[] } {
  const failures: string[] = [];
  let files = 0;
  const walk = (directory: string) => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) walk(path);
      else if (/\.(?:tsx?|css)$/.test(item.name)) {
        files++;
        failures.push(...inspectPublicSource(relative(root, path), readFileSync(path, "utf8")));
      }
    }
  };
  for (const directory of ["src/app", "src/components", "src/lib", "fixtures"]) walk(join(root, directory));
  return { files, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkPublicDesign();
  if (result.failures.length) { console.error(result.failures.join("\n")); process.exitCode = 1; }
  else console.log(`Design checks passed: ${result.files} public source files, no prohibited punctuation or CSS.`);
}
