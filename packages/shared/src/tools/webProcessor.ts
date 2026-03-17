const DEFAULT_CHAT_HEIGHT = 480;
const MIN_CHAT_HEIGHT = 320;
const EMBED_PARAMS: Array<[string, string]> = [
  ['embed', '1'],
  ['toolbar', '0'],
  ['header', '0'],
  ['nav', '0'],
  ['controls', '0'],
];

export interface WebProcessorDataLike {
  title?: string;
  url?: string;
  size?: [number, number];
}

export function getSafeWebProcessorUrl(url?: string): URL | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildWebProcessorEmbedUrl(url?: string): string | null {
  const parsed = getSafeWebProcessorUrl(url);
  if (!parsed) {
    return null;
  }

  for (const [key, value] of EMBED_PARAMS) {
    if (!parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
  }

  return parsed.toString();
}

export function getWebProcessorTitle(data: WebProcessorDataLike): string {
  return data.title?.trim() || 'Web Processor';
}

export function getWebProcessorDisplayUrl(url?: string): string {
  const parsed = getSafeWebProcessorUrl(url);
  if (!parsed) {
    return '';
  }

  return parsed.host + parsed.pathname.replace(/\/$/, '');
}

export function getWebProcessorHeight(
  data: WebProcessorDataLike,
  mode: 'chat' | 'modal' = 'chat'
): string {
  if (mode === 'modal') {
    return '100%';
  }

  const heightFromSize = Array.isArray(data.size) ? Number(data.size[1]) : Number.NaN;
  const height = Number.isFinite(heightFromSize)
    ? Math.max(heightFromSize, MIN_CHAT_HEIGHT)
    : DEFAULT_CHAT_HEIGHT;

  return `${height}px`;
}
