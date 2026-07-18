import { resolveSearchProvider } from './providers.js';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

/**
 * Web search for trend grounding. Self-contained: returns [] when no provider is
 * configured or on any error, so callers degrade gracefully to LLM-only.
 * Currently backed by Tavily (https://api.tavily.com/search).
 */
export async function webSearch(
  query: string,
  maxResults = 5,
  override?: { provider?: string; apiKey?: string },
): Promise<SearchResult[]> {
  // An explicit override (from Laravel AiSettings) wins; otherwise fall back to
  // the daemon .env. override.provider !== 'tavily' (e.g. 'none') disables search.
  const cfg = override !== undefined
    ? (override?.provider === 'tavily' && override?.apiKey ? { provider: 'tavily', apiKey: override.apiKey } : null)
    : resolveSearchProvider();
  if (!cfg || !query.trim()) return [];

  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: cfg.apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
      }),
    });
    if (!r.ok) return [];
    const d: any = await r.json();
    return (d?.results ?? []).map((x: any) => ({
      title: String(x?.title ?? ''),
      snippet: String(x?.content ?? ''),
      url: String(x?.url ?? ''),
    }));
  } catch {
    return [];
  }
}
