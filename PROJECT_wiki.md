# Pelagica 项目开发 Wiki (PROJECT_wiki.md)

本 Wiki 记录了 `pelagica` 项目的公共结构、核心改动、通用工具类以及分支规范。

---

## 1. Monorepo 体系与核心架构说明

上游近期完成了 Monorepo 模块化重构，代码库分为以下工作区包：
* **`packages/core` (`@pelagica/core`)**: 跨端公用核心库，包含 API、React Query Hooks、状态管理、国际化与工具函数。
  * **[`share.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/packages/core/src/api/share.ts)** [解耦新增]: 自定义媒体分享后端 API 封装，已直接整合进 `@pelagica/core` 统一导出。
* **`frontend` (`pelagica`)**: Web 客户端主项目。
* **`packages/tv-frontend` / `packages/tv-platform`**: 电视端专用前端与平台适配层。
* **`tizen`**: 三星 Tizen 客户端。

---

## 2. 二开解耦模块与公共组件

* **`/frontend/src/features/player/`**: [解耦模块] 播放器增强手势与交互层
  * **[`usePlayerGestures.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/player/usePlayerGestures.ts)**: 独立封装的长按 3x 快进、左右半屏双击 ±30s 识别、触摸/鼠标状态机与定时器管理。
  * **[`PlayerGestureOverlay.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/player/PlayerGestureOverlay.tsx)**: 独立渲染快进徽章与跳转动画浮层组件。
* **`/frontend/src/components/`**: 基础 UI 组件目录
  * **[`ExternalPlayerButton.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ExternalPlayerButton.tsx)**: 用于唤起本地 Potplayer/VLC/IINA 播放器的通用按钮组件。
  * **[`ShareDialog.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ShareDialog.tsx)**: 媒体分享目标选择与提交弹窗。
  * **[`TopBar.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/TopBar.tsx)**: 顶部水平导航栏，包含“共享库”入口。
* **`/frontend/src/pages/`**: 视图页面组件目录
  * **[`App.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/App.tsx)**: 根应用组件，已挂载 `/shared-library` 路由。
  * **[`SharedLibrary/SharedLibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/SharedLibrary/SharedLibraryPage.tsx)**: 共享库主管理页面，包括共享给我的、我分享的列表及分页管理。
  * **[`Library/LibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Library/LibraryPage.tsx)** & **[`LibraryItem.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Library/LibraryItem.tsx)**: 支持海报/横幅/列表/文件夹 4 种视图切换及文件夹穿透下钻；内建**文件夹智能封面反哺**（自动拉取目录内视频的精美封面与最短进度作为文件夹封面，并悬浮微型角标）。
  * **[`Item/BaseMediaPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/BaseMediaPage.tsx)** / **[`MoviePage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/MoviePage.tsx)** / **[`EpisodePage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/EpisodePage.tsx)**: 详情页支持内嵌行内视频播放（Inline Video Player）与清晰度选择。
  * **[`Item/SeriesPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/SeriesPage.tsx)**: 兼容上游 `showSeasonsView` 与自定义剧季快速下拉筛选。
  * **[`Player/PlayerControls.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Player/PlayerControls.tsx)**: 零侵入主干结构，通过装配 `usePlayerGestures` 与 `PlayerGestureOverlay` 实现手势交互。

---

## 3. 核心定制数据结构

### 共享记录数据模型 (ShareItem)
定义于 `packages/core/src/api/share.ts`：
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

## 4. 防丢失合并规范 (Merge Guide)

每次与上游合并后，请务必执行以下核对流程：
1. 运行 `pnpm -r build` 确保多包编译与类型检查 100% 通过。
2. 逐一验证二开核心功能点：
   - **手势交互**：长按 3x 快速播放、双击左右半屏 ±30s 动画指示。
   - **行内播放**：电影/单集详情页顶部无缝渲染内嵌播放器。
   - **共享系统**：顶栏「共享库」入口、分享弹窗创建及删除功能。
   - **外部播放器**：详情页「外部播放器」按钮（Potplayer/VLC/IINA 调用）。
   - **媒体库视图**：列表视图、网格视图与文件夹穿透下钻。
