/** Opens the command palette from anywhere (header button, keyboard shortcut, links). */
export const SEARCH_OPEN_EVENT = "uno:search-open";

export function openSearch(): void {
  window.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
}
