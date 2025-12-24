import { useEffect, useState } from 'react'
import HighlightedText from './HighlightText'

export default function TabGroupSection({ 
  title, color, tabs, searchQuery, isUngrouped = false, groupId,
  forceOpen, selectedIds, onGroupAction, groupName, onNameChange, 
  onToggleTab, onToggleAll, onTabDropped, onTabClosed
}: any) {
  const [isOpen, setIsOpen] = useState(isUngrouped);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const hasMatch = searchQuery.length > 0 && tabs.length > 0;

  useEffect(() => { if (forceOpen) setIsOpen(true); }, [forceOpen]);

  useEffect(() => { if (hasMatch) setIsOpen(true); }, [hasMatch]);

  const handleCloseTab = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation(); // Prevent switching to the tab when clicking close
    chrome.tabs.remove(tabId, () => {
      if (onTabClosed) onTabClosed(); // Refresh the parent state
    });
  };

  const handleTabClick = (tabId?: number, windowId?: number) => {
    if (tabId) {
      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(windowId!, { focused: true });
    }
  };

  if (tabs.length === 0 && !isDragTarget) return null;

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); setIsDragTarget(true); }}
      onDragLeave={() => setIsDragTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragTarget(false);
        const tabIdStr = e.dataTransfer.getData("tabId");
        if (tabIdStr) onTabDropped(parseInt(tabIdStr), isUngrouped ? null : groupId);
      }}
      className={`mb-4 transition-all duration-200 ${isDragTarget ? 'scale-[1.02] ring-2 ring-blue-500 rounded-[3px]' : ''}`}
    >
      <div className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-md rounded-[3px] overflow-hidden shadow-sm">
        
        {/* Header */}
        <div className="flex items-center px-4 py-3 group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
             style={{ borderLeft: `6px solid ${color || '#64748b'}` }}>
          {isUngrouped && (
            <input type="checkbox" className="w-4 h-4 rounded-full mr-3"
                   checked={selectedIds.size === tabs.length} onChange={onToggleAll} />
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="flex-1 flex items-center justify-between text-left">
            <span className="text-sm font-bold tracking-tight text-slate-800 dark:text-white opacity-80">
              <HighlightedText text={title} highlight={searchQuery} />
              <span className="ml-2 text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full lowercase">{tabs.length}</span>
            </span>
            <span className={`text-xs opacity-40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

          {/* Action Bar for Ungrouped Tabs */}
        {isOpen && isUngrouped && (
          <div className="mx-3 mt-1 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl space-y-3">
            <input 
              type="text" 
              placeholder="New group name..."
              spellCheck={false}
              value={groupName} 
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 px-3 py-2 text-xs rounded outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
            />
            <div className="flex gap-2">
              <button 
                onClick={() => onGroupAction(Array.from(selectedIds))} 
                disabled={selectedIds.size === 0}
                className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold text-[10px] py-2 rounded hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
              >
                Add Selected
              </button>
              <button 
                onClick={() => onGroupAction(tabs.map((t: any) => t.id))}
                className="flex-1 bg-blue-600 text-white font-bold text-[10px] py-2 rounded hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Add All
              </button>
            </div>
          </div>
        )}

        {/* Tab List */}
        {isOpen && (
          <div className="p-2 space-y-0.5 min-h-[10px]">
            {tabs.map((tab: chrome.tabs.Tab) => (
              <div 
                key={tab.id} 
                draggable 
                onDragStart={(e) => e.dataTransfer.setData("tabId", tab.id!.toString())}
                className="flex gap-3 items-center text-xs py-2 px-3 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-all cursor-grab active:cursor-grabbing group relative"
              >
                {isUngrouped && (
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" 
                    checked={selectedIds.has(tab.id!)} onChange={() => onToggleTab(tab.id!)} />
                )}
                
                <div onClick={() => handleTabClick(tab.id, tab.windowId)} className="flex gap-3 items-center flex-1 overflow-hidden cursor-pointer">
                  <img src={tab.favIconUrl} className="w-5 h-5 rounded-md pointer-events-none" alt="" />
                  <span className="truncate flex-1 font-medium pointer-events-none">
                    <HighlightedText text={tab.title || ''} highlight={searchQuery} />
                  </span>
                </div>

                {/* Modern Close Button - Visible on Hover */}
                <button 
                  onClick={(e) => handleCloseTab(e, tab.id!)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 rounded-md transition-all text-slate-400"
                  title="Close tab"
                >
                  <svg xmlns="www.w3.org" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
