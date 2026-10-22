import i18n from "i18next";
import type { Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { i18nextOptions } from "@pelagica/i18n";
import { deepMergeResources } from "./mergeResources";
import { localOverrides } from "./overrides";

export * from "./supportedLanguages";

/**
 * 两层翻译资源：
 * 1. `@pelagica/i18n` 共享包（上游维护，13 种语言，机翻质量，部分 key 缺失）
 * 2. `./overrides/**` 本地覆盖（我们的中文精翻 + 二开功能文案）
 *
 * 注意：不要改回「本地 glob 全量加载 locales」的老做法。
 * 上游已删除本地 locales 目录并把翻译迁到共享包，全量维护 13 种语言副本
 * 会让每次上游合并都必须手工解冲突，且新增 key 永远落后。
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...i18nextOptions,
    resources: deepMergeResources(
      i18nextOptions.resources as Resource,
      localOverrides,
    ),
    react: {
      useSuspense: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
