# Chrome Web Store listing

What to enter in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). The dashboard can't be changed through the API, so this is the copy to paste by hand. Images are in this folder.

Edit the listing and privacy tabs **before** approving the store step of the next release in GitHub Actions: the release submits whatever the dashboard has saved, together with the new package.

## Store listing

**Summary** comes from the package (`appDescription` in `public/_locales`); it updates itself when the new version is uploaded.

**Category:** Workflow and planning. **Language:** English (United States).

### Description (English)

```text
Keep your tabs sorted by what you're working on, from Chrome's side panel.

▪ Group as a series: every new tab in one group, named for you.
▪ Reclassify by task, purpose, site or last use.
▪ Tell it how: "work tabs together, YouTube and shopping apart".
▪ Groups you make are locked, so sorting never pulls them apart.
▪ Undo any step, save groups and reopen closed ones.
▪ Search tabs and jump with ↑ ↓ and Enter. Alt+Shift+G opens the panel.
▪ Private: your tabs stay on your computer. The optional cloud AI (off by default) only gets tab titles, site names and your instruction.

English, 繁體中文 and 简体中文, light and dark mode.
```

### Description (繁體中文)

Add a localized listing for Chinese (Traditional) in the dashboard and paste:

```text
在 Chrome 側邊欄按你正在做的事整理分頁。

▪ 組成系列：一鍵把新分頁組成一組，並自動命名。
▪ 按工作、用途、網站或最後使用時間重新分類。
▪ 直接說：「工作分頁放一組，YouTube 和購物分開」。
▪ 你建立的群組會鎖定，重新分類不會拆散。
▪ 每一步都可以復原，也可以儲存群組和重開已關閉的群組。
▪ 搜尋分頁，用 ↑ ↓ 和 Enter 跳轉；Alt+Shift+G 開啟側邊欄。
▪ 保障私隱：分頁留在你的電腦。可選的雲端 AI 預設關閉，只會收到分頁標題、網站名稱和你的指令。

支援 English、繁體中文和简体中文，以及淺色和深色模式。
```

### Description (简体中文)

```text
在 Chrome 侧边栏按你正在做的事整理标签页。

▪ 组成系列：一键把新标签页组成一组，并自动命名。
▪ 按工作、用途、网站或最后使用时间重新分类。
▪ 直接说：“工作标签页放一组，YouTube 和购物分开”。
▪ 你建立的组会锁定，重新分类不会拆散。
▪ 每一步都可以撤销，也可以保存组和重新打开已关闭的组。
▪ 搜索标签页，用 ↑ ↓ 和 Enter 跳转；Alt+Shift+G 打开侧边栏。
▪ 保护隐私：标签页留在你的电脑。可选的云端 AI 默认关闭，只会收到标签页标题、网站名称和你的指令。

支持 English、繁體中文和简体中文，以及浅色和深色模式。
```

### Graphic assets

| Field                           | File                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Store icon (128×128)            | keep the current icon (same as the extension's `public/icon128.png`)                 |
| Screenshots (1280×800, up to 5) | `screenshots/1-side-panel.jpg` … `5-private.jpg`, in that order; delete the old ones |
| Small promo tile (440×280)      | `promo-small-440x280.jpg`                                                            |
| Marquee promo tile (1400×560)   | `promo-marquee-1400x560.jpg`                                                         |

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

| Permission  | Justification                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`      | Read the titles, addresses and icons of open tabs to list, search, group and close them, and to recognise each tab's site when sorting. |
| `tabGroups` | Create, rename, recolor, collapse, ungroup and close tab groups, and put back an earlier layout of groups.                              |
| `storage`   | Save settings, locked groups, remembered sites, saved and recently closed groups, and a short history of group layouts in the browser.  |
| `sidePanel` | Show Groupify in Chrome's side panel so it stays open beside the page.                                                                  |

**Remote code:** No. (The optional cloud AI returns plain data, never code.)

**Data usage:** tick **Web history** only: with cloud AI turned on, the titles and site names of the tabs being grouped, and any instruction typed for grouping, are sent to Groupify's server. The random install ID used to count groupings by instruction isn't personally identifiable information. Everything else stays in the browser and isn't "collected". Keep all three certifications ticked.

**Privacy policy URL:** https://groupify.aoricreative.com/privacy

## Package tab

Don't opt in to **Verified CRX uploads**: the release workflow uploads a zip, and verified uploads would make the store reject it.
