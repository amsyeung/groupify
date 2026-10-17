<div align="center">
  <img src="store/store.png" alt="Groupify icon" height="128">
  <h1>Groupify</h1>
  <p><strong>Keep your tabs sorted by what you're working on, from a side panel next to every page.</strong></p>
  <a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><img alt="Chrome Web Store version" src="https://img.shields.io/chrome-web-store/v/kkajifdljgkcniokopfhllcocblblmeh?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store&labelColor=000"></a>
  <a href="./LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge&labelColor=000"></a>
  <p><a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><strong>➜ Add to Chrome — it's free</strong></a></p>
  <img src="images/panel.png" alt="The side panel after Reclassify by purpose: a locked Client site group, then Other, Design inspiration and News &amp; reading" width="260">
  <img src="images/reclassify.png" alt="The Reclassify menu: by task or project, by purpose, by site and by last use" width="260">
  <img src="images/closed.png" alt="A closed group listed under Recently closed, with Keep and Open buttons" width="260">
</div>

## Features

|                          |                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Side panel**           | Click the toolbar icon (or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>) to keep Groupify open beside the page while you browse.                                                  |
| **Group as a series**    | One click puts every ungrouped tab into one new group, for whatever you're working on right now.                                                                                        |
| **Reclassify**           | Sort every unlocked group again: by task or project, by purpose (development, design, docs, AI, video, social, shopping, news…), by site or by last use. **Undo** puts everything back. |
| **Lock groups**          | A locked group is left alone when you reclassify.                                                                                                                                       |
| **Named for you**        | Chrome's on-device AI suggests names and finds tabs for the same task, privately on your computer. Without it, groups are named after the date.                                         |
| **Add to current group** | New tabs join the group you're working in.                                                                                                                                              |
| **Recently closed**      | Closed groups are remembered, so you can reopen them or keep them under **Saved**.                                                                                                      |
| **Search**               | Filter tabs by title or URL. <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd> jump to a tab, <kbd>Esc</kbd> clears.                                                                       |
| **Manage groups**        | The ⋯ menu renames, recolors, locks, collapses, saves, ungroups or closes a group. Drag tabs between groups.                                                                            |
| **Settings**             | Choose the default way to reclassify, and turn on-device AI or closed-group history on or off.                                                                                          |

In English, 繁體中文 and 简体中文, in light and dark mode. More in the [FAQ](SUPPORT.md).

## Privacy

Groupify reads the tabs open in your window. The groups you save, and the last 20 groups you closed (name, color and tab addresses), stay in Chrome's extension storage; saved groups sync through Chrome if you have sync on. AI features use the model built into Chrome, on your computer. Groupify sends nothing to any server of its own.

## Development

```bash
pnpm install
pnpm build   # extension in dist/, load it unpacked at chrome://extensions
pnpm test
```

Merging to `main` releases automatically, up to the Chrome Web Store: see [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Support

[Open an issue](https://github.com/amsyeung/groupify/issues) or email [info@aoricreative.com](mailto:info@aoricreative.com).
