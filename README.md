<div align="center">
  <img src="store/store.png" alt="Groupify icon" height="128">

  <h1>Groupify</h1>

  <p><strong>Find any tab in a second and keep your tab groups tidy, all from one popup.</strong><br>
  Search by title or URL, group tabs by site in one click and close duplicates. Nothing leaves your browser.</p>

<a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><img alt="Chrome Web Store version" src="https://img.shields.io/chrome-web-store/v/kkajifdljgkcniokopfhllcocblblmeh?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store&labelColor=000"></a>
<a href="./LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge&labelColor=000"></a>
<a href="https://vite.dev"><img alt="Made with Vite" src="https://img.shields.io/badge/Made%20with-Vite-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white&labelColor=000"></a>

  <p><a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><strong>➜ Add to Chrome — it's free</strong></a></p>
</div>

## Features

- **Search everything.** Type to filter the tabs in your window by title or URL. Matches are highlighted, and groups with a match open by themselves.
- **Keyboard first.** Open the popup with <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>, type, then use <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd> to jump to a tab. <kbd>Esc</kbd> clears the search. You can change the shortcut at `chrome://extensions/shortcuts`.
- **Group by site.** One click puts the ungrouped tabs from the same site into their own group, named after the site. Tabs join a group that already has that name.
- **Close duplicates.** Tabs showing the same page are closed, keeping one of each (the one you're on, a pinned one, or the leftmost). Changed your mind? Click **Undo**.
- **Make groups.** Tick the tabs you want, give the group a name and click **Group selected**, or group every ungrouped tab at once. New groups get a color that isn't in use yet.
- **Manage groups.** From the ⋯ menu of a group: rename it, change its color, collapse it in the tab bar, ungroup it or close all its tabs.
- **Drag and drop.** Drag a tab onto a group, or onto one of the group shortcuts at the top, to move it there.
- **Always up to date.** The popup follows changes you make in the tab bar while it's open.
- **Speaks your language.** English, 繁體中文 and 简体中文, following your Chrome language. Light and dark mode follow your system.

## Privacy

Groupify only uses the `tabs` and `tabGroups` permissions, to list and organize the tabs in your window. It stores nothing, has no account and sends nothing to any server: everything happens inside your browser.

## Development

```bash
pnpm install
pnpm build      # builds the extension into dist/
pnpm test       # unit tests
pnpm lint
```

Load `dist/` at `chrome://extensions` with **Developer mode** on and **Load unpacked**.

Releases are automatic: merging to `main` bumps the version from the [conventional commits](https://www.conventionalcommits.org/), updates the changelog, creates a GitHub release and submits the build to the Chrome Web Store. See [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Support

Questions and ideas are welcome: [open an issue](https://github.com/amsyeung/groupify/issues) or email [info@aoricreative.com](mailto:info@aoricreative.com). See also the [FAQ](SUPPORT.md).
