# Chrome Web Store listing

What to enter in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). The dashboard can't be changed through the API, so this is the copy to paste by hand. Images are in this folder.

Edit the listing and privacy tabs **before** approving the store step of the next release in GitHub Actions: the release submits whatever the dashboard has saved, together with the new package.

## Store listing

**Summary** comes from the package (`appDescription` in `public/_locales`); it updates itself when the new version is uploaded.

**Category:** Workflow and planning. **Language:** English (United States).

### Description (English)

```text
Groupify keeps your tabs sorted by what you're working on, from Chrome's side panel.

★ Group as a series
One click puts every new tab into one group, named for you.

★ Reclassify
Sort everything again by task or project, by purpose (development, design, docs, AI tools, video, social, shopping, news…), by site or by last use. Undo puts it all back.

★ Your groups stay yours
Groups you name, rename or drag tabs into are locked automatically, and their sites are remembered, so sorting never pulls them apart. "Only tidy new tabs" files new tabs into the groups they belong to and moves nothing else.

★ Go back any number of steps
History keeps every change Groupify makes, so you can restore any earlier layout. Ungroup all in one click.

★ Save and reopen
Save a group for later, or reopen one you closed from Recently closed.

★ Find any tab
Search titles and addresses. Use ↑ ↓ and Enter to jump to a tab, and Alt+Shift+G to open the side panel.

★ Private by default
Your tabs stay on your computer. Names come from the AI built into Chrome when your computer has it. An optional, free cloud AI (off by default) only receives the titles and site names of the tabs being grouped, and keeps nothing.

Available in English, 繁體中文 and 简体中文, in light and dark mode.

Privacy policy: https://groupify.aoricreative.com/privacy
Help and FAQ: https://github.com/amsyeung/groupify/blob/main/SUPPORT.md
```

### Description (繁體中文)

Add a localized listing for Chinese (Traditional) in the dashboard and paste:

```text
Groupify 在 Chrome 側邊欄按你正在做的事整理分頁。

★ 組成系列
一鍵把所有新分頁組成一個群組，並自動命名。

★ 重新分類
按工作／專案、按用途（開發、設計、文件、AI 工具、影音、社交、購物、新聞等）、按網站或按最後使用時間重新分類，可以一鍵復原。

★ 你的群組由你決定
你命名、改名或拖分頁進去的群組會自動鎖定，網站也會被記住，重新分類不會把它們拆散。「只整理新分頁」只把新分頁放進所屬群組，其他分頁不動。

★ 退回任何一步
歷史記錄保留 Groupify 的每次改動，可以還原到任何一個版本；也可以一鍵取消所有分組。

★ 儲存和重新開啟
把群組儲存起來，或從「最近關閉」重新開啟已關閉的群組。

★ 快速找到分頁
按標題或網址搜尋，用 ↑ ↓ 和 Enter 跳到分頁，Alt+Shift+G 開啟側邊欄。

★ 預設保障私隱
分頁資料留在你的電腦。電腦有 Chrome 內建 AI 時，由它命名；可選的免費雲端 AI 預設關閉，開啟後只會收到要分組的分頁標題和網站名稱，而且不會保留。

支援 English、繁體中文和简体中文，以及淺色和深色模式。

私隱政策：https://groupify.aoricreative.com/privacy
說明與常見問題：https://github.com/amsyeung/groupify/blob/main/SUPPORT.md
```

### Description (简体中文)

```text
Groupify 在 Chrome 侧边栏按你正在做的事整理标签页。

★ 组成系列
一键把所有新标签页组成一个组，并自动命名。

★ 重新分类
按工作／项目、按用途（开发、设计、文档、AI 工具、影音、社交、购物、新闻等）、按网站或按最后使用时间重新分类，可以一键撤销。

★ 你的组由你决定
你命名、改名或拖标签页进去的组会自动锁定，网站也会被记住，重新分类不会把它们拆散。“只整理新标签页”只把新标签页放进所属的组，其他标签页不动。

★ 退回任意一步
历史记录保留 Groupify 的每次改动，可以还原到任何一个版本；也可以一键取消所有分组。

★ 保存和重新打开
把组保存起来，或从“最近关闭”重新打开已关闭的组。

★ 快速找到标签页
按标题或网址搜索，用 ↑ ↓ 和 Enter 跳到标签页，Alt+Shift+G 打开侧边栏。

★ 默认保护隐私
标签页数据留在你的电脑。电脑有 Chrome 内置 AI 时，由它命名；可选的免费云端 AI 默认关闭，开启后只会收到要分组的标签页标题和网站名称，而且不会保留。

支持 English、繁體中文和简体中文，以及浅色和深色模式。

隐私政策：https://groupify.aoricreative.com/privacy
帮助与常见问题：https://github.com/amsyeung/groupify/blob/main/SUPPORT.md
```

### Graphic assets

| Field | File |
| --- | --- |
| Store icon (128×128) | keep the current icon (same as the extension's `public/icon128.png`) |
| Screenshots (1280×800, up to 5) | `screenshots/1-side-panel.jpg` … `5-private.jpg`, in that order; delete the old ones |
| Small promo tile (440×280) | `promo-small-440x280.jpg` |
| Marquee promo tile (1400×560) | `promo-marquee-1400x560.jpg` |

All images are JPEG, so they have no alpha channel, as the store requires.

### Additional fields

- **Homepage URL:** https://groupify.aoricreative.com
- **Support URL:** https://github.com/amsyeung/groupify/issues
- **Official URL:** optional. It needs `groupify.aoricreative.com` verified in Google Search Console first.
- **Google Analytics:** leave off (the privacy policy says there is no analytics).

## Privacy tab

**Single purpose description**

```text
Organize the tabs in your browser window: search, group, sort and restore tab groups from a side panel.
```

**Permission justifications** (`storage` and `sidePanel` appear once the new package is uploaded):

| Permission | Justification |
| --- | --- |
| `tabs` | Read the titles, addresses and icons of open tabs to list, search, group and close them, and to recognise each tab's site when sorting. |
| `tabGroups` | Create, rename, recolor, collapse, ungroup and close tab groups, and put back an earlier layout of groups. |
| `storage` | Save settings, locked groups, remembered sites, saved and recently closed groups, and a short history of group layouts in the browser. |
| `sidePanel` | Show Groupify in Chrome's side panel so it stays open beside the page. |

**Remote code:** No. (The optional cloud AI returns plain data, never code.)

**Data usage:** tick **Web history** only: with cloud AI turned on, the titles and site names of the tabs being grouped are sent to Groupify's server. Everything else stays in the browser and isn't "collected". Keep all three certifications ticked.

**Privacy policy URL:** https://groupify.aoricreative.com/privacy

## Package tab

Don't opt in to **Verified CRX uploads**: the release workflow uploads a zip, and verified uploads would make the store reject it.
