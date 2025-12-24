import { useEffect, useMemo, useState } from 'react'
import './App.css'
import TabGroupSection from './components/TabGroupSection'
import NavButton from './components/NavButton'

const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'] as const

export default function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [newGroupName, setNewGroupName] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState<number | string | null>(null);

  const refreshData = async () => {
    const currentTabs = await chrome.tabs.query({ currentWindow: true })
    const gids = [...new Set(currentTabs.map((t) => t.groupId))].filter((id) => id !== -1)
    const groupDetails = await Promise.all(gids.map((id) => chrome.tabGroups.get(id)))
    setTabs(currentTabs)
    setGroups(groupDetails)
  }

  useEffect(() => {
    refreshData()
  }, [])

  const filteredTabs = useMemo(() => tabs.filter((t) => t.title?.toLowerCase().includes(searchQuery.toLowerCase())), [tabs, searchQuery])

  const scrollToGroup = (id: string) => {
    setExpandedGroupId(id); 
    const el = document.getElementById(`section-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleTabDropped = async (tabId: number, targetGroupId: number | null) => {
    if (targetGroupId === null) {
      await chrome.tabs.ungroup(tabId)
    } else {
      await chrome.tabs.group({ tabIds: [tabId], groupId: targetGroupId })
    }
    refreshData()
  }

  const handleCreateGroup = async (tabIds: number[]) => {
    const usedColors = new Set(groups.map((g) => g.color))
    const available = CHROME_COLORS.filter((c) => !usedColors.has(c))
    const color = (available.length ? available : CHROME_COLORS)[Math.floor(Math.random() * (available.length || CHROME_COLORS.length))]

    const ids = tabIds.filter((id): id is number => id !== undefined && id !== null)
    if (ids.length === 0) return

    // @ts-ignore
    const groupId = await chrome.tabs.group({ tabIds: ids })
    // @ts-ignore
    await chrome.tabGroups.update(groupId, {
      title: newGroupName || 'New Group',
      color,
    })

    setNewGroupName('')
    setSelectedIds(new Set())
    refreshData()
  }

  const ungroupedList = filteredTabs.filter((t) => t.groupId === -1)

  return (
    <div className="p-6 w-[400px] dark:bg-slate-950 font-sans">
      {/* Sticky Header with Search and Nav Buttons */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md pb-4 pt-1">
        <input
          type="text"
          placeholder="Search tabs..."
          spellCheck={false}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 p-3 text-sm placeholder:text-[#64748b] rounded-[2px] outline-none ring-2 ring-transparent focus:ring-zinc-900 transition-all font-semibold shadow-xs"
        />

        {/* Quick-Nav / Quick-Drop Bar */}
        <div className="flex flex-wrap gap-2 mt-4 max-h-[120px] overflow-y-auto no-scrollbar">
            <NavButton
            title="Ungrouped"
            color="grey"
            onClick={() => scrollToGroup('ungrouped')}
            // @ts-ignore
            onDrop={(id) => handleTabDropped(id, null)}
          />
          {groups.map((g) => (
            <NavButton
              key={g.id}
              title={g.title || 'Untitled'}
              color={g.color}
              onClick={() => scrollToGroup(g.id.toString())}
              // @ts-ignore
              onDrop={(id) => handleTabDropped(id, g.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 mt-2">
        {/* 1. Ungrouped Section */}
        <div id="section-ungrouped">
          <TabGroupSection
            title="Ungrouped"
            isUngrouped={true}
            groupId={null}
            forceOpen={expandedGroupId === 'ungrouped'}
            onTabClosed={refreshData}
            onTabDropped={handleTabDropped}
            searchQuery={searchQuery}
            tabs={ungroupedList}
            selectedIds={selectedIds}
            onToggleTab={(id: number) =>
              setSelectedIds((prev) => {
                const n = new Set(prev)
                n.has(id) ? n.delete(id) : n.add(id)
                return n
              })
            }
            onToggleAll={() => {
              setSelectedIds(selectedIds.size === ungroupedList.length ? new Set() : new Set(ungroupedList.map((t) => t.id!)))
            }}
            onGroupAction={handleCreateGroup}
            groupName={newGroupName}
            onNameChange={setNewGroupName}
          />
        </div>

        {/* 2. Existing Groups */}
        {groups.map((g) => (
          <div key={g.id} id={`section-${g.id}`}>
            <TabGroupSection
              groupId={g.id}
              forceOpen={Number(expandedGroupId) === g.id}
              onTabDropped={handleTabDropped}
              onTabClosed={refreshData}
              title={g.title || `Group ${g.id}`}
              color={g.color}
              searchQuery={searchQuery}
              tabs={filteredTabs.filter((t) => t.groupId === g.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
