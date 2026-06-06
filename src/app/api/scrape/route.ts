import { NextRequest, NextResponse } from 'next/server';

export interface ScrapedProduct {
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  source_url: string;
}

// Sites that use Cloudflare / bot protection — cannot be server-scraped
const BLOCKED_HOSTS = [
  'just-eat.co.uk', 'just-eat.com',
  'ubereats.com', 'deliveroo.co.uk', 'deliveroo.com',
  'doordash.com', 'grubhub.com',
];

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  // Detect Cloudflare-protected food delivery platforms
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (BLOCKED_HOSTS.some(b => host.includes(b))) {
      return NextResponse.json({
        error: `${host} uses Cloudflare bot protection — server-side scraping is blocked. Use the Manual Entry tab below to add your menu items directly.`,
        blocked: true,
      }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
  }

  const apiKey = process.env.JIGSAWSTACK_KEY;

  // ── JigsawStack AI Scraper ─────────────────────────────────────────────
  if (apiKey && !apiKey.startsWith('your_')) {
    try {
      const response = await fetch('https://api.jigsawstack.com/v1/ai/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          url,
          element_prompts: [
            'product name or title',
            'product price including currency symbol',
            'product description or short summary',
            'product image URL (full absolute URL)',
            'product category or type',
          ],
          advance_config: { console: false, screenshot: false },
        }),
      });

      const json = await response.json();

      if (json.success && json.data) {
        // Normalise JigsawStack response → ScrapedProduct[]
        // JigsawStack returns data as array of matched elements per prompt
        const raw = json.data;
        const maxLen = Math.max(...Object.values(raw).map((v: unknown) => Array.isArray(v) ? v.length : 1));

        const products: ScrapedProduct[] = [];
        for (let i = 0; i < Math.min(maxLen, 20); i++) {
          const get = (key: string) => {
            const arr = raw[key];
            return Array.isArray(arr) ? (arr[i] ?? '') : (arr ?? '');
          };
          const name = get('product name or title');
          if (!name) continue;
          products.push({
            name: String(name).trim(),
            price: String(get('product price including currency symbol')).trim(),
            description: String(get('product description or short summary')).trim(),
            image: String(get('product image URL (full absolute URL)')).trim(),
            category: String(get('product category or type')).trim() || 'General',
            source_url: url,
          });
        }
        return NextResponse.json({ products, source: 'jigsawstack' });
      }
    } catch (err) {
      console.error('JigsawStack error:', err);
      // fall through to mock
    }
  }

  // ── Basic HTML scraper fallback (no API key / API error) ──────────────
  try {
    const htmlRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProductBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await htmlRes.text();

    // Extract Open Graph / meta tags as a single "product"
    const getMeta = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return m?.[1]?.trim() ?? '';
    };

    // Try JSON-LD product schema
    const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    const products: ScrapedProduct[] = [];

    for (const match of jsonLdMatches) {
      try {
        const schema = JSON.parse(match[1]);
        const items = schema['@type'] === 'ItemList'
          ? (schema.itemListElement || []).map((e: { item?: unknown }) => e.item || e)
          : schema['@type'] === 'Product'
          ? [schema]
          : Array.isArray(schema) ? schema.filter((s: { '@type'?: string }) => s['@type'] === 'Product') : [];

        for (const item of items.slice(0, 20)) {
          if (!item?.name) continue;
          const offerPrice = item.offers?.price || item.offers?.[0]?.price || '';
          const currency = item.offers?.priceCurrency || item.offers?.[0]?.priceCurrency || '';
          products.push({
            name: String(item.name).trim(),
            description: String(item.description || '').slice(0, 200).trim(),
            price: offerPrice ? `${currency}${offerPrice}` : '',
            image: String(item.image?.url || item.image || '').trim(),
            category: String(item.category || 'General').trim(),
            source_url: url,
          });
        }
      } catch { /* skip malformed JSON-LD */ }
    }

    // Fallback: single product from OG tags
    if (products.length === 0) {
      const title = getMeta('og:title') || getMeta('twitter:title');
      const desc = getMeta('og:description') || getMeta('description');
      const image = getMeta('og:image');
      const price = getMeta('product:price:amount') || getMeta('og:price:amount');
      const currency = getMeta('product:price:currency') || '£';

      if (title) {
        products.push({
          name: title,
          description: desc,
          price: price ? `${currency}${price}` : '',
          image,
          category: 'General',
          source_url: url,
        });
      }
    }

    if (products.length > 0) {
      return NextResponse.json({ products, source: 'html-parser' });
    }

    return NextResponse.json({ error: 'No products found on this page. Try a product listing URL.' }, { status: 422 });
  } catch (err) {
    return NextResponse.json({ error: `Could not fetch URL: ${(err as Error).message}` }, { status: 500 });
  }
}
