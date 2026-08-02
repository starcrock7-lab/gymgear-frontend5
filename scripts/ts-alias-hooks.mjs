/* Module-resolution hooks so plain `node` can import the app's TypeScript
   modules directly (Node 24 strips the types itself; it just can't resolve
   Next's "@/" alias or extensionless imports). Used by audit-kits.mjs so kit
   quality can be measured without booting Next or a dev server. */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTS = [".ts", ".tsx", ".mjs", ".js", "/index.ts"];

function locate(target) {
  if (path.extname(target) && existsSync(target)) return target;
  for (const e of EXTS) if (existsSync(target + e)) return target + e;
  return null;
}

export function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) {
    target = path.join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const base = context.parentURL?.startsWith("file:")
      ? path.dirname(fileURLToPath(context.parentURL))
      : ROOT;
    target = path.resolve(base, specifier);
  }
  const found = target && locate(target);
  if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  return next(specifier, context);
}
