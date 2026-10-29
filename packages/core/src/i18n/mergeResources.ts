import type { Resource } from "i18next";

/**
 * 深合并多语言资源。
 *
 * 用途：上游把翻译迁到了 `@pelagica/i18n` 共享包（机翻 + 部分 key 缺失），
 * 我们仍需要保留自有二开功能的文案和部分中文精翻。策略是「包打底 + 本地覆盖」：
 * 以共享包的 resources 为基础，本地的 overrides 逐层覆盖，未覆盖的 key 自动沿用包内值。
 *
 * 合并规则：
 * - 纯对象递归合并；字符串/数组/数字等叶子值由后者整体替换（不拼接）。
 * - 不做删除语义：共享包里有、overrides 里没有的 key 会保留。
 * - 不修改入参，返回新对象（resources 对象在 i18next init 后仍需保持不可变）。
 */
export function deepMergeResources(
  base: Resource,
  override: Resource,
): Resource {
  const result: Resource = { ...base };

  for (const [language, overrideNamespaces] of Object.entries(override)) {
    const baseNamespaces = result[language] as
      Record<string, unknown> | undefined;
    const mergedNamespaces: Record<string, unknown> = {
      ...(baseNamespaces ?? {}),
    };

    for (const [namespace, overrideValue] of Object.entries(
      overrideNamespaces as Record<string, unknown>,
    )) {
      const baseValue = mergedNamespaces[namespace];
      mergedNamespaces[namespace] = mergeValue(baseValue, overrideValue);
    }

    result[language] = mergedNamespaces as Resource[string];
  }

  return result;
}

function mergeValue(baseValue: unknown, overrideValue: unknown): unknown {
  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) {
    return overrideValue;
  }

  const merged: Record<string, unknown> = { ...baseValue };
  for (const [key, value] of Object.entries(overrideValue)) {
    merged[key] = mergeValue(baseValue[key], value);
  }
  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
