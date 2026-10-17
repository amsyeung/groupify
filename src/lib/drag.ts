const TAB_MIME = 'application/x-groupify-tab'

export function setDraggedTab(e: React.DragEvent, tabId: number) {
  e.dataTransfer.setData(TAB_MIME, String(tabId))
  e.dataTransfer.effectAllowed = 'move'
}

/** True while a Groupify tab (not a link or file) is being dragged over the element. */
export const isTabDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(TAB_MIME)

export function getDraggedTab(e: React.DragEvent): number | null {
  const id = Number.parseInt(e.dataTransfer.getData(TAB_MIME), 10)
  return Number.isFinite(id) ? id : null
}
