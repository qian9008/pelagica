# 物理文件夹返回状态丢失 Bug 深度分析与终极重构方案

## 1. 之前方案的竞态时序冲突分析

根据调试控制台日志：
```
[FolderBug] Listen effect running. URL folderPath: null current state: [{...}]
[FolderBug] Listen effect - no param, resetting state to []
[FolderBug] Sync effect running. folderPathStack: []
```

### 竞态成因：
1. 当用户点击文件夹触发 `setFolderPathStack([...prev, folder])` 后，React 触发重新渲染，此时 React 状态中 `folderPathStack` 已经是新路径 `[{...}]`。
2. 在渲染后的 Effect 提交阶段，负责监听 URL 变化的 `Listen Effect` 先于同步到 URL 的 `Sync Effect` 执行（或两者几乎同时）。
3. 此时因为 URL 还没有被 `setSearchParams` 写入新的 `folderPath`，`Listen Effect` 发现 URL 里的 `folderPath` 还是 null，而 state 里确是新数据。
4. 于是 `Listen Effect` 判定当前 State 为脏数据，错误地将其重置回了 `[]`，从而直接扼杀了这次点击导航，导致用户根本进不去文件夹。

---

## 2. 终极重构设计：纯 URL 驱动状态 (URL-driven State)

为了彻底根除双向绑定 `useState` + 双向 `useEffect` 同步时的时序冲突，最佳实践是**让 URL 成为唯一的“事实来源”（Single Source of Truth）**，直接删除 `useState`。

* **`folderPathStack` 变为纯 `useMemo`**：直接从 URL 派生，没有 local state。
* **`setFolderPathStack` 变为 URL 写入函数**：当状态更改时，直接使用 `setSearchParams` 更改 URL。URL 改变后，`useMemo` 会自然计算出新状态重新渲染组件。
* **极简化同步 Effect**：更新已有的同步 `useEffect`，让其仅在字段真正改变（`hasChanged` 防御性比对）时才调用 `setSearchParams`，消除任何潜在的死循环危险。

---

## 3. 具体修改方案 (`LibraryPage.tsx`)

### 3.1 声明派生状态与写入函数
删除原 `useState`（第 367 行），替换为 `useMemo` 和自定义写入函数：
```typescript
    // 文件夹路径导航栈：从 URL 的 folderPath 派生（URL 作为唯一的事实来源）
    const folderPathStack = useMemo<Array<{ id: string; name: string }>>(() => {
        const param = searchParams.get('folderPath');
        if (!param) return [];
        try {
            return JSON.parse(param);
        } catch (e) {
            console.error('Failed to parse folderPath from URL', e);
            return [];
        }
    }, [searchParams]);

    // 修改文件夹导航栈的辅助函数，直接通过更新 URL 实现
    const setFolderPathStack = (
        updater: Array<{ id: string; name: string }> | ((prev: Array<{ id: string; name: string }>) => Array<{ id: string; name: string }>)
    ) => {
        const nextStack = typeof updater === 'function' ? updater(folderPathStack) : updater;
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (nextStack.length > 0) {
                next.set('folderPath', JSON.stringify(nextStack));
            } else {
                next.delete('folderPath');
            }
            next.set('page', '0'); // 切换目录时重置页码为 0
            return next;
        });
    };
```

### 3.2 优化同步 `useEffect` 并做值变化防御检查
删除之前的 `Listen Effect`，并将同步 `Sync Effect` 修改为防御性比对防死循环的逻辑：
```typescript
    const folderPathStr = searchParams.get('folderPath') || '';

    // 将状态同步到 URL 的 searchParams 中
    useEffect(() => {
        const nextParams: any = {
            library: activeLibraryId,
            page: String(page),
            sortBy,
            sortOrder,
        };
        if (folderPathStr) {
            nextParams.folderPath = folderPathStr;
        }

        // 仅在参数真正变化时调用 setSearchParams，杜绝一切潜在的死循环
        const hasChanged = Object.keys(nextParams).some(
            (key) => searchParams.get(key) !== nextParams[key]
        ) || Array.from(searchParams.keys()).some(
            (key) => nextParams[key] === undefined
        );

        if (hasChanged) {
            setSearchParams(nextParams);
        }
    }, [activeLibraryId, page, sortBy, sortOrder, folderPathStr, searchParams, setSearchParams]);
```

### 3.3 修改 `handleLibraryChange`
删除在切换媒体库时无谓的 `setFolderPathStack([])` 调用，由 `setSearchParams` 隐式清除。
```typescript
    const handleLibraryChange = (libraryId: string) => {
        setPage(0);
        // 切换不同库的时候通过 setSearchParams 隐式清空子级文件夹参数，防止路径错乱
        setSearchParams({
            library: libraryId,
            page: '0',
            sortBy,
            sortOrder,
        });
    };
```
