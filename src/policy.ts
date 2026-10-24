export type Tool = 'via' | 'vial' | 'venom' | 'wootility';

export const TOOLS: Record<Tool, { label: string; url: string; origin: string }> = {
  via: { label: 'VIA', url: 'https://usevia.app/', origin: 'https://usevia.app' },
  vial: { label: 'Vial', url: 'https://vial.rocks/', origin: 'https://vial.rocks' },
  venom: { label: 'Venom', url: 'https://venom.how/', origin: 'https://venom.how' },
  wootility: { label: 'Wootility', url: 'https://wootility.io/', origin: 'https://wootility.io' },
};

export function isTool(value: unknown): value is Tool {
  return value === 'via' || value === 'vial' || value === 'venom' || value === 'wootility';
}

/** URLs are parsed rather than compared by prefix, so lookalike hosts and ports fail. */
export function isAllowedDocument(tool: Tool, candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.origin === TOOLS[tool].origin && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isExternalHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isExactToolOrigin(tool: Tool, candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.origin === TOOLS[tool].origin
      && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function mayUseHid(
  tool: Tool,
  requestingUrl: string,
  requestingOrigin: string,
  isMainFrame: boolean,
  isCurrentContents: boolean,
): boolean {
  return isCurrentContents && isMainFrame && isAllowedDocument(tool, requestingUrl)
    && isExactToolOrigin(tool, requestingOrigin);
}

/** Chromium still requires a user-selected File System Access handle. */
export function mayUseLayoutFile(
  tool: Tool,
  documentUrl: string,
  requestingOrigin: string,
  details: { filePath?: string; isDirectory?: boolean; fileAccessType?: string },
  isCurrentContents: boolean,
): boolean {
  return isCurrentContents && tool === 'vial' && isAllowedDocument(tool, documentUrl)
    && isExactToolOrigin(tool, requestingOrigin) && details.isDirectory === false
    && typeof details.filePath === 'string' && details.filePath.length > 0
    && (details.fileAccessType === 'readable' || details.fileAccessType === 'writable');
}
