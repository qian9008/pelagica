# Pelagica 项目开发 Wiki (PROJECT_wiki.md)

本 Wiki 记录了 `pelagica` 项目的公共结构、核心改动、通用工具类以及分支规范。

---

## 1. 核心架构与公共文件夹说明

* **`/frontend/src/api/`**: 包含所有对接 Jellyfin API 的网络请求。
  * **[`share.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/api/share.ts)** [新增]: 自定义分享功能的后端 API 封装。
* **`/frontend/src/components/`**: 基础 UI 组件目录。
  * **[`ExternalPlayerButton.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ExternalPlayerButton.tsx)** [新增]: 用于唤起本地 Potplayer/VLC 播放器的通用按钮组件。
  * **[`TopBar.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/TopBar.tsx)** [修改]: 顶部水平导航栏，包含“共享库”入口。
* **`/frontend/src/pages/`**: 视图页面组件目录。
  * **[`SharedLibrary/SharedLibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/SharedLibrary/SharedLibraryPage.tsx)** [新增]: 共享库主管理页面，包括共享给我的、我分享的列表 and 分页管理。
  * **[`Library/LibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Library/LibraryPage.tsx)** [修改]: 经过深度导航优化和“上一级文件夹”死循环修复后的媒体库页面。
  * **[`Login/LoginPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Login/LoginPage.tsx)** [修改]: 包含分立 IP 与端口输入框的登录页面。
* **`/frontend/src/hooks/`**: 共享钩子（Hook）存放处。
  * **`api/useRefreshItemMetadata.ts`** [新增]: 元数据刷新钩子。
* **`/frontend/src/pages/Player/`**: 播放器页面组件目录。
  * **[`PlayerControls.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Player/PlayerControls.tsx)** [修改]: 倍速控制、音量滑出式控制、时间显示移至进度条下方。
  * **[`PlayerPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Player/PlayerPage.tsx)** [修改]: 移动端全屏自动横屏、多浏览器全屏 API 兼容、STRM 直流播放。
  * **[`VideoPlayer.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Player/VideoPlayer.tsx)** [修改]: iOS playsInline、屏蔽原生触摸控件、硬解指示器、字幕样式清理；新增基于 Jellyfin 后台备用字体的获取与本地 Blob 映射机制（处理尾部斜杠防 404），以 `defaultFont: 'Noto Sans SC'` 形式强制注入 JASSUB 字典；启用 `video.js` 的 `fluid: true` 流式布局，强制容器贴合视频画幅，完美消除移动端 Android Chrome 因 JASSUB Canvas 图层坐标与尺寸不匹配引发的“黑屏遮罩”和 GPU 崩溃 Bug。
* **`/frontend/src/utils/jellyfinUrls.ts`** [修改]: 新增 `getStaticStreamUrl` 函数（STRM 直流）+ mkv 容器映射。

---

## 2. 核心定制数据结构

### 共享记录数据模型 (ShareItem)
定义于 `src/api/share.ts`：
```typescript
export interface ShareItem {
    id: string; // 共享记录大数 ID，前端必须作为 string 处理防精度溢出
    media_id: string; // 共享影片 ID
    media_name: string; // 共享影片名称
    owner_user_id: string; // 共享发起人 ID
    owner_username: string; // 共享发起人用户名
    target_user_id: string; // 共享接收人 ID
    target_username: string; // 共享接收人用户名
    created_at: string; // 分享时间 (YYYY-MM-DD HH:mm:ss)
    expire_at: string | null; // 过期时间
    status: number; // 状态码
}
```

---

## 3. 防丢失合并规范 (Merge Guide)

每次与上游合并后，请务必执行以下核对流程：
1. 打开 **[`CUSTOM_FEATURES.md`](file:///Users/qian/Documents/code/emby2openlist/pelagica/CUSTOM_FEATURES.md)** 对照功能清单。
2. 逐一验证：
   - 登录页面的 IP 与 Port 输入框是否存在且逻辑正常。
   - 顶栏的「共享库」按钮是否存在。
   - 点击「共享库」是否能打开页面，且取消分享是否能正确传递完整的 19 位字符串 ID。
   - 详情页是否有「外部播放器」唤起按钮。
   - 播放器控制栏是否有倍速按钮、音量悬停滑出、进度条下方时间显示。
   - 手机端全屏播放是否自动横屏，播放 `.strm` 文件是否正常直流。
   - 播放器右上角是否有 HW/SW 硬解指示器，字幕样式是否正常。
3. 如果被覆盖，请从 Git 历史或暂存区提取补丁恢复。
