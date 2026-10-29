import type { Resource } from "i18next";

/**
 * 本地翻译覆盖层加载器。
 *
 * 目录约定：`./overrides/<语言>/<命名空间>.json`
 * - 只放「共享包缺失」或「需要更高翻译质量」的 key，不要整份复制。
 * - 新增二开功能文案时，中文和英文都要加（英文是 fallbackLng，缺了会显示 key 本身）。
 *
 * 使用 `import.meta.glob` 在构建期静态收集，运行时零成本，不产生额外请求。
 */
const overrideModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "./overrides/*/*.json",
  { eager: true },
);

const localOverrides: Resource = {};

for (const [path, module] of Object.entries(overrideModules)) {
  const match = path.match(/\.\/overrides\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;

  const [, language, namespace] = match;
  if (!localOverrides[language]) {
    localOverrides[language] = {};
  }
  (localOverrides[language] as Record<string, unknown>)[namespace] =
    module.default;
}

export { localOverrides };
