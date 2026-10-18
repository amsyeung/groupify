# Frequently asked questions

## Where did the popup go?

Groupify now opens as a side panel, so it stays next to the page while you work. Click the toolbar icon or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>; click the icon again or the panel's × to close it.

## What does "Reclassify" do?

It takes every group that isn't locked, plus the tabs that aren't in a group, and sorts them again the way you pick:

- **By task or project**: AI decides which tabs belong to the same task, even across different sites: Chrome's on-device AI, or Groupify's cloud AI if you turned it on. Without AI, tabs opened from one another or within about 20 minutes of each other stay together.
- **By purpose**: development, design inspiration, docs and notes, AI tools, video and music, social, shopping, news and reading, mail and meetings, and Other for the rest.
- **By site**: one group per website.
- **By last use**: today, this week and older, which helps you find tabs to close.

Pinned tabs are never moved. Click **Undo** right after to put everything back. The default method is in Settings.

## Will Reclassify move tabs I put in a group myself?

No. Groupify keeps track of what you decide by hand, in the side panel or in Chrome's own tab bar:

- A group you name, rename or drag a tab into is **locked automatically**, so Reclassify leaves it alone. Turn this off in Settings if you prefer to lock groups yourself.
- The **site** of a tab you put into a named group is remembered there (for example amsyn.org → Me). Whatever method you reclassify with, and when you use **Only tidy new tabs**, tabs from that site go back to that group. Settings lists the remembered sites, and you can forget any of them.

Groupify tells its own changes apart from yours, so its automatic sorting never counts as your decision.

## What does "Only tidy new tabs" do?

It's the first item in the Reclassify menu. Each ungrouped tab joins the group it belongs to: the group remembered for its site, or else the one group that already has tabs from the same site. Tabs with no clear home stay ungrouped, and no other tab moves.

## Can I undo more than one step?

Yes. Before every change Groupify makes to your groups, it saves the layout. In the ⋯ menu next to the search box, **Undo last change** goes back one step, and **History** lists the last 20 changes in this window: **Restore** puts every group back as it was before that change. A restore can be undone too. History is kept until you close the browser.

## How do I remove all groups at once?

⋯ menu → **Ungroup all**. Every group in the window is removed and the tabs stay open. Click **Undo**, or restore it from History, if you change your mind.

## How do I keep a group out of Reclassify?

Lock it: click ⋯ on the group, then the lock icon. Locked groups show a 🔒, and Settings lists them all, so you can unlock any from there. Locks are remembered by the group's name, so a group renamed in Chrome's tab bar loses its lock (renaming from Groupify keeps it).

## I closed a group. Can I get it back?

Yes, if it was closed after you installed this version: it's under **Recently closed**. Click **Open** to bring it back, or **Keep** to move it to **Saved** for good. The last 20 closed groups are kept. Groups you closed before can't be read by any extension; Chrome lists them in its own Tab groups menu and on the bookmarks bar.

## What does "Group as a series" do?

It puts every tab that isn't in a group yet into one new group, so the tabs you opened for what you're doing now (say, Pinterest, the Next.js docs, Cloudflare and Vercel for a new project) stay together. If you're searching, only the matching tabs are grouped. To group only some tabs under your own name, tick them in the Ungrouped section, type a name in the bar that appears and click **Group**.

## How is the group named?

If Chrome's on-device AI (Gemini Nano) is already on your computer, it suggests a name from the tab titles. It runs locally, so nothing is sent anywhere, and Groupify never downloads the model itself. If Chrome supports the model but hasn't downloaded it, Settings has a **Download on-device AI** button. Otherwise, the group is named after today's date, unless you turn on cloud AI (below). You can rename it any time from the ⋯ menu.

## Can I just tell Groupify how to group my tabs?

Yes. Type it in **Tell Groupify how to group your tabs** under the main buttons and press <kbd>Enter</kbd>, for example “work tabs together, YouTube and shopping apart” or “put everything about the Japan trip in Travel”. Tabs you don't mention stay where they are, locked groups keep their tabs (they can still take new ones), and **Undo** puts everything back.

It uses Chrome's on-device AI when your computer has it, with no limit. Otherwise it needs **Use Groupify's cloud AI** turned on in Settings, and works 3 times a day; the count starts again at 00:00 UTC (8:00 in Hong Kong). A clear instruction usually gets it right the first time.

## My computer has no on-device AI. Can I still get names?

Yes: in Settings, turn on **Use Groupify's cloud AI**. It is off by default. When on, and only when Chrome's own model isn't available, the titles and site names of the tabs being grouped (never full addresses), and any instruction you type, go to Groupify's server on Cloudflare, which asks an AI model and keeps nothing. It is free and shared by everyone with a daily limit; when the limit is reached, groups are named after the date until the next day. The [privacy policy](https://groupify.aoricreative.com/privacy) lists exactly what is sent.

## What does "Add to …" do?

It adds the ungrouped tabs to the group you're working in: the group of the tab you're on, or of the grouped tab you used last. Links you open from a grouped tab already join its group in Chrome, so this is for tabs you opened yourself.

## How do I move a tab into a group?

Drag the tab and drop it on a group in the list, or on one of the group shortcuts at the top of the panel so you don't have to scroll.

## How do I open Groupify from the keyboard?

Press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> to open the side panel. Settings shows the shortcut that's actually set, with a button to change it.

## Can I change a group's color or name?

Yes. Click the ⋯ button on the group to rename it and pick a color. The icons below lock it, collapse it in the tab bar, save it and ungroup it; the red × closes it. Hover over an icon to see what it does.

## How do I save a group and open it again later?

Click ⋯ on the group, then the bookmark icon (**Save group**). It appears in the **Saved** section at the bottom of the panel, where **Open** brings it back as a new group in the current window, with the same name, color and tabs. Saving a group with the same name as one you already saved replaces the old one. Click × to delete a saved group, or **Undo** right after if you didn't mean to.

## Where are saved groups kept?

In Chrome's own storage for extensions. If Chrome sync is on, they appear on your other computers too. A group with a lot of very long addresses can be too large to sync; it is then kept on this computer only and marked "This device".

## Which tabs count as duplicates?

Tabs with the same address, ignoring the part after `#`. Close them from the ⋯ menu next to the search box. One of each is kept: the tab you're on, otherwise a pinned one, otherwise the leftmost. Click **Undo** in the message that appears to reopen the closed tabs.

## Does Groupify see my browsing history?

No. It reads the tabs that are open right now, only to show them to you. It stores the groups you save and the last 20 groups you closed in your browser. Nothing is sent to any server unless you turn on cloud AI, which receives only the titles and site names of the tabs being grouped. See the [privacy policy](https://groupify.aoricreative.com/privacy).

## Why do I only see the tabs of one window?

The side panel shows the window it's open in, because tab groups belong to a single window.
