<div align="center">
  <img src="store/store.png" alt="Groupify icon" height="128">
  <h1>Groupify</h1>
  <p><strong>Find any tab in a second and keep your tab groups tidy, all from one popup.</strong></p>
  <a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><img alt="Chrome Web Store version" src="https://img.shields.io/chrome-web-store/v/kkajifdljgkcniokopfhllcocblblmeh?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store&labelColor=000"></a>
  <a href="./LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge&labelColor=000"></a>
  <p><a href="https://chromewebstore.google.com/detail/groupify/kkajifdljgkcniokopfhllcocblblmeh"><strong>➜ Add to Chrome — it's free</strong></a></p>
  <img src="images/popup.png" alt="The popup with the Group as a series button, three groups and three ungrouped tabs" width="260">
  <img src="images/search.png" alt="Searching for &quot;tab&quot; shows only the matching tabs, with the match highlighted" width="260">
  <img src="images/group-menu.png" alt="The menu of the github.com group: name, color, collapse, ungroup and close" width="260">
</div>

## Features

|                          |                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Group as a series**    | One click puts every ungrouped tab into one new group, for whatever you're working on right now.                                                                         |
| **Named for you**        | Chrome's on-device AI suggests a name from the tab titles, privately on your computer. Without it, the group is named after today's date.                                |
| **Add to current group** | New tabs join the group you're working in.                                                                                                                               |
| **Search**               | Filter tabs by title or URL. <kbd>↑</kbd> <kbd>↓</kbd> and <kbd>Enter</kbd> jump to a tab, <kbd>Esc</kbd> clears. Grouping while searching only takes the matching tabs. |
| **Manage groups**        | The ⋯ menu renames, recolors, collapses, ungroups or closes a group.                                                                                                     |
| **Tidy up**              | Group by site, or close duplicate tabs with **Undo**.                                                                                                                    |
| **Drag and drop**        | Drop a tab on a group, or on a shortcut at the top, to move it.                                                                                                          |
| **Shortcut**             | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> opens the popup (change it at `chrome://extensions/shortcuts`).                                                             |

In English, 繁體中文 and 简体中文, in light and dark mode. More in the [FAQ](SUPPORT.md).

## Privacy

Groupify only reads the tabs open in your window. It stores nothing and sends nothing anywhere.

## Development

```bash
pnpm install
pnpm build   # extension in dist/, load it unpacked at chrome://extensions
pnpm test
```

Merging to `main` releases automatically, up to the Chrome Web Store: see [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Support

[Open an issue](https://github.com/amsyeung/groupify/issues) or email [info@aoricreative.com](mailto:info@aoricreative.com).
