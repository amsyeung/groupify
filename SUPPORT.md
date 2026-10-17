# Frequently asked questions

## Where did the popup go?

Groupify now opens as a side panel, so it stays next to the page while you work. Click the toolbar icon or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>; click the icon again or the panel's × to close it.

## What does "Reclassify" do?

It takes every group that isn't locked, plus the tabs that aren't in a group, and sorts them again the way you pick:

- **By task or project**: Chrome's on-device AI decides which tabs belong to the same task, even across different sites. Without it, tabs opened from one another or within about 20 minutes of each other stay together.
- **By purpose**: development, design inspiration, docs and notes, AI tools, video and music, social, shopping, news and reading, mail and meetings, and Other for the rest.
- **By site**: one group per website.
- **By last use**: today, this week and older, which helps you find tabs to close.

Pinned tabs are never moved. Click **Undo** right after to put everything back. The default method is in Settings.

## How do I keep a group out of Reclassify?

Lock it: click ⋯ on the group and choose **Lock**. Locked groups show a 🔒. Locks are remembered by the group's name, so a group renamed in Chrome's tab bar loses its lock (renaming from Groupify keeps it).

## I closed a group. Can I get it back?

Yes, if it was closed after you installed this version: it's under **Recently closed**. Click **Open** to bring it back, or **Keep** to move it to **Saved** for good. The last 20 closed groups are kept. Groups you closed before can't be read by any extension; Chrome lists them in its own Tab groups menu and on the bookmarks bar.

## What does "Group as a series" do?

It puts every tab that isn't in a group yet into one new group, so the tabs you opened for what you're doing now (say, Pinterest, the Next.js docs, Cloudflare and Vercel for a new project) stay together. If you're searching, only the matching tabs are grouped. Type a name in the Ungrouped section first to use your own.

## How is the group named?

If Chrome's on-device AI (Gemini Nano) is already on your computer, it suggests a name from the tab titles. It runs locally, so nothing is sent anywhere, and Groupify never downloads the model itself. Otherwise, the group is named after today's date. You can rename it any time from the ⋯ menu.

## My computer has no on-device AI. Can I still get names?

Yes: in Settings, turn on **Use Groupify's cloud AI**. It is off by default. When on, and only when Chrome's own model isn't available, the titles and site names of the tabs being grouped (never full addresses) go to Groupify's server on Cloudflare, which asks an AI model and keeps nothing. It is free and shared by everyone with a daily limit; when the limit is reached, groups are named after the date until the next day.

## What does "Add to …" do?

It adds the ungrouped tabs to the group you're working in: the group of the tab you're on, or of the grouped tab you used last. Links you open from a grouped tab already join its group in Chrome, so this is for tabs you opened yourself.

## How do I move a tab into a group?

Drag the tab and drop it on a group in the list, or on one of the group shortcuts at the top of the panel so you don't have to scroll.

## How do I open Groupify from the keyboard?

Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> to open the side panel. To use another shortcut, go to `chrome://extensions/shortcuts`, or open Settings from the ⋯ menu.

## Can I change a group's color or name?

Yes. Click the ⋯ button on the group to rename it, pick a color, lock it, collapse it in the tab bar, save it, ungroup it or close it.

## How do I save a group and open it again later?

Click ⋯ on the group and choose **Save group**. It appears in the **Saved** section at the bottom of the panel, where **Open** brings it back as a new group in the current window, with the same name, color and tabs. Saving a group with the same name as one you already saved replaces the old one. Click × to delete a saved group, or **Undo** right after if you didn't mean to.

## Where are saved groups kept?

In Chrome's own storage for extensions. If Chrome sync is on, they appear on your other computers too. A group with a lot of very long addresses can be too large to sync; it is then kept on this computer only and marked "This device".

## Which tabs count as duplicates?

Tabs with the same address, ignoring the part after `#`. One of each is kept: the tab you're on, otherwise a pinned one, otherwise the leftmost. Click **Undo** in the message that appears to reopen the closed tabs.

## Does Groupify see my browsing history?

No. It reads the tabs that are open right now, only to show them to you. It stores the groups you save and the last 20 groups you closed, and it doesn't send anything to any server of its own.

## Why do I only see the tabs of one window?

The side panel shows the window it's open in, because tab groups belong to a single window.
