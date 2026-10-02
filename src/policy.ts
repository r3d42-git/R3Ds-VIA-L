export type Tool = 'via' | 'vial';

export const TOOLS: Record<Tool, { label: string; url: string; origin: string }> = {
  via: { label: 'VIA', url: 'https://usevia.app/', origin: 'https://usevia.app' },
  vial: { label: 'Vial', url: 'https://vial.rocks/', origin: 'https://vial.rocks' },
};

export function isTool(value: unknown): value is Tool {
  return value === 'via' || value === 'vial';
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
