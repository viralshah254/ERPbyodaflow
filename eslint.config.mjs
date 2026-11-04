import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolveFrom = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: __dirname, resolvePluginsRelativeTo: path.dirname(resolveFrom.resolve("eslint-config-next/package.json")) });

const config = [...compat.extends("next/core-web-vitals")];
export default config;
