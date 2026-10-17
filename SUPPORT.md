# Frequently asked questions

## What does "Group as a series" do?

It puts every tab that isn't in a group yet into one new group, so the tabs you opened for what you're doing now (say, Pinterest, the Next.js docs, Cloudflare and Vercel for a new project) stay together. If you're searching, only the matching tabs are grouped. Type a name in the Ungrouped section first to use your own.

## How is the group named?

If Chrome's on-device AI (Gemini Nano) is already on your computer, it suggests a name from the tab titles. It runs locally, so nothing is sent anywhere, and Groupify never downloads the model itself. Otherwise, the group is named after today's date. You can rename it any time from the ⋯ menu.

## What does "Add to …" do?

It adds the ungrouped tabs to the group you're working in: the group of the tab you're on, or of the grouped tab you used last. Links you open from a grouped tab already join its group in Chrome, so this is for tabs you opened yourself.

## How do I move a tab into a group?

Drag the tab and drop it on a group in the list, or on one of the group shortcuts at the top of the popup so you don't have to scroll.

## How do I open Groupify from the keyboard?

Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>. To use another shortcut, go to `chrome://extensions/shortcuts`.

## Can I change a group's color or name?

Yes. Click the ⋯ button on the group to rename it, pick a color, collapse it in the tab bar, ungroup it or close it.

## How do I save a group and open it again later?

Click ⋯ on the group and choose **Save group**. It appears in the **Saved** section at the bottom of the popup, where **Open** brings it back as a new group in the current window, with the same name, color and tabs. Saving a group with the same name as one you already saved replaces the old one. Click × to delete a saved group, or **Undo** right after if you didn't mean to.

## Where are saved groups kept?

In Chrome's own storage for extensions. If Chrome sync is on, they appear on your other computers too. A group with a lot of very long addresses can be too large to sync; it is then kept on this computer only and marked "This device".

## What does "Group by site" do?

It looks at the tabs that aren't in a group yet. Every site with two or more of them gets its own group named after the site, such as `github.com`. If a group with that name already exists, the tabs join it instead. Pinned tabs are left alone, because Chrome doesn't allow pinned tabs in groups.

## Which tabs count as duplicates?

Tabs with the same address, ignoring the part after `#`. One of each is kept: the tab you're on, otherwise a pinned one, otherwise the leftmost. Click **Undo** in the message that appears to reopen the closed tabs.

## Does Groupify see my browsing history?

No. It reads the tabs that are open right now, only to show them to you. The only thing it stores is the groups you choose to save, and it doesn't send anything to any server of its own.

## Why do I only see the tabs of one window?

Groupify shows the window you opened it from, because tab groups belong to a single window.
