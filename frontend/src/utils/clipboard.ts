/**
 * 统一的文本复制工具。
 *
 * 背景：`navigator.clipboard` 仅在「安全上下文」中可用（HTTPS 或 localhost）。
 * 本项目以明文 HTTP 部署（nginx listen 80 / docker 8080:80），局域网通过
 * `http://<ip>:8080` 访问时 `navigator.clipboard` 为 undefined，直接调用
 * `navigator.clipboard.writeText()` 会同步抛出 TypeError；而 `.then/.catch`
 * 是挂在调用结果上的，无法捕获该异常，最终表现为「点了复制但毫无反应」。
 *
 * 因此这里按可用性逐级降级：
 *   1. 桌面端（Wails）→ 原生剪贴板 API，不受安全上下文限制；
 *   2. 浏览器安全上下文 → 标准 Clipboard API；
 *   3. 其余情况（明文 HTTP 局域网访问等）→ `document.execCommand('copy')` 传统方案。
 *
 * 注意：传统方案依赖「用户手势」上下文，因此必须在点击事件的同步调用链中执行，
 * 所以在判定浏览器 API 不可用时不做任何 await，直接同步回退。
 *
 * 重要：`document.execCommand('copy')` 的返回值**不可信** —— 它在「选区为空」
 * 「document 无焦点」「iOS 上 readonly textarea 无法选中」等场景下仍会返回
 * true，实际剪贴板什么都没写入。因此本实现额外校验 `getSelection()` 的真实
 * 内容，避免上层弹出「已成功复制」的假提示。
 */
import { isDesktopApp } from './desktopApp';

/**
 * 失败诊断：仅在复制未成功时输出，便于线上排查环境问题。
 * 成功路径不打印，避免污染控制台。
 */
function warnFailure(route: string, detail: Record<string, unknown> = {}): void {
    if (typeof console === 'undefined') return;
    console.warn('[clipboard] 复制未成功', route, {
        isDesktopApp: isDesktopApp(),
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : null,
        hasAsyncClipboard: typeof navigator !== 'undefined' && !!navigator.clipboard,
        hasFocus: typeof document !== 'undefined' ? document.hasFocus() : null,
        ...detail,
    });
}

/**
 * 传统方案：插入一个不可见的 textarea，选中内容后执行 copy 命令。
 *
 * 关键兼容点（踩过的坑，勿随便改）：
 * - **不能加 `readonly`**：iOS Safari 与部分 Android WebView 对 readonly 的
 *   textarea 调用 `select()` 无效，选区为空，execCommand 仍返回 true 但复制
 *   的是空串 —— 这正是「提示成功但剪贴板没内容」的典型成因。
 * - **不能用 `display:none` / `visibility:hidden`**：隐藏元素无法被选中。
 * - 复制完成后必须恢复原有选区与焦点，否则会破坏页面状态（尤其是对话框内）。
 */
function legacyCopy(text: string): boolean {
    if (typeof document === 'undefined' || !document.body) return false;

    // 保存调用前的选区，复制后恢复
    const selection = document.getSelection();
    const savedRanges: Range[] = [];
    if (selection) {
        for (let i = 0; i < selection.rangeCount; i += 1) {
            savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    // 关闭一切会干扰选区/弹出键盘的浏览器行为
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.setAttribute('tabindex', '-1');
    // 方案要点：元素必须位于「有效渲染层」内。
    // 实测踩坑：`z-index: -1` 会把元素压到 body 背景之后，部分 Chromium 版本
    // 认为它不可参与复制，execCommand 仍返回 true 但**系统剪贴板不写入**。
    // 同理 `opacity: 0` 也偏险，这里用 1px + opacity 0.01 保证仍在合成层中。
    textarea.style.cssText =
        'position:fixed;bottom:0;right:0;width:1px;height:1px;padding:0;border:0;' +
        'outline:none;box-shadow:none;background:transparent;color:transparent;' +
        'opacity:0.01;z-index:2147483647;';

    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    // 校验选区是否真的覆盖了全文。
    // 注意：必须读 textarea 自己的 selectionStart/selectionEnd，
    // `document.getSelection()` 对 textarea/input 恒返回空串（那是 DOM 选区，
    // 而表单控件的选区是独立的），用它校验会永远误判为失败。
    const selectionOk =
        textarea.selectionStart === 0 &&
        textarea.selectionEnd === text.length &&
        textarea.value.length === text.length;
    // 焦点是否真的落在 textarea 上：Radix 菜单关闭时可能把焦点抢回 Trigger，
    // 焦点丢失会让 copy 命令失效（但返回值仍是 true）。
    const focusedOk = document.activeElement === textarea;
    // 移出 DOM 后选区会被重置为 0，先存下来供诊断输出
    const selectedLength = textarea.selectionEnd;

    let copied: boolean;
    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }

    document.body.removeChild(textarea);

    // 恢复原选区
    if (selection) {
        selection.removeAllRanges();
        savedRanges.forEach((range) => selection.addRange(range));
    }

    const ok = copied && selectionOk && focusedOk;
    if (!ok) {
        warnFailure('legacy-execCommand', {
            copied,
            selectionOk,
            focusedOk,
            selectedLength,
            expectedLength: text.length,
        });
    }
    return ok;
}

/**
 * 复制结果三态。
 *
 * - `ok`：使用了可确认的写入通道（Wails 原生 / Clipboard API），可以放心提示成功。
 * - `unverified`：走了 `execCommand('copy')` 兜底。命令回报成功、选区与焦点都正常，
 *   但**无法回读剪贴板内容做验证**——浏览器不给权限。在部分环境（企业策略、
 *   Chromium 隐藏元素限制、系统剪贴板权限）下仍可能实际未写入。
 * - `failed`：所有通道都明确失败。
 */
export type CopyOutcome = 'ok' | 'unverified' | 'failed';

/**
 * 将文本写入剪贴板。
 *
 * @param text 要复制的文本
 * @returns 三态结果，调用方按 `unverified` / `failed` 提供手动复制兜底
 */
export async function copyTextToClipboard(text: string): Promise<CopyOutcome> {
    if (!text) return 'failed';

    // 桌面端优先使用原生剪贴板，不受安全上下文限制（可确认结果）
    if (isDesktopApp()) {
        try {
            const { Clipboard } = await import('@wailsio/runtime');
            await Clipboard.SetText(text);
            return 'ok';
        } catch (error) {
            warnFailure('desktop-wails', { failed: String(error) });
        }
    }

    // 安全上下文下使用标准 Clipboard API（可确认结果）
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(text);
            return 'ok';
        } catch (error) {
            warnFailure('navigator.clipboard', { failed: String(error) });
        }
    }

    // 明文 HTTP 等场景：同步回退，保证仍在用户手势上下文内
    return legacyCopy(text) ? 'unverified' : 'failed';
}
