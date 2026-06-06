import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ScrapedProduct } from '../scrape/route';

const JIGSAW_KEY = process.env.JIGSAWSTACK_KEY || '';
const JIGSAW_VOCR = 'https://api.jigsawstack.com/v1/vocr';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MENU_PROMPT = `You are analyzing a food menu, price list, or product catalogue image.
Extract every item visible. For EACH item return a JSON object with:
- name: item name (string)
- price: price with currency symbol like £4.99 or "" if not visible
- description: description text or ""
- category: section/category heading this item falls under, e.g. "Hot Drinks", "Starters", or "Menu"

Return ONLY a valid JSON array. No markdown. No explanation. Just the array.
Example: [{"name":"Latte","price":"£3.50","description":"Espresso with milk","category":"Hot Drinks"}]`;

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runVOCR(imageUrl: string): Promise<{ context: string | null; error?: string }> {
  try {
    const res = await fetch(JIGSAW_VOCR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': JIGSAW_KEY },
      body: JSON.stringify({ url: imageUrl, prompt: MENU_PROMPT }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await safeJson(res);
    if (!json) return { context: null, error: 'vOCR returned non-JSON response' };
    if (!json.success) return { context: null, error: `vOCR error: ${json.message || 'unknown'}` };
    return { context: json.context as string };
  } catch (err) {
    return { context: null, error: `vOCR fetch failed: ${(err as Error).message}` };
  }
}

async function uploadToSupabase(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
  try {
    const path = `menu-images/${Date.now()}-${filename}`;
    const { error } = await supabase.storage
      .from('scraper-uploads')
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('scraper-uploads').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

function parseMenuText(text: string, sourceLabel: string): ScrapedProduct[] {
  // Try JSON parse
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        return arr
          .filter((item: Record<string, string>) => item?.name)
          .map((item: Record<string, string>) => ({
            name: String(item.name || '').trim(),
            price: String(item.price || '').trim(),
            description: String(item.description || '').trim(),
            category: String(item.category || 'Menu').trim(),
            image: '',
            source_url: sourceLabel,
          }));
      }
    }
  } catch { /* fall through */ }

  // Fallback: line-by-line text parsing
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const products: ScrapedProduct[] = [];
  let currentCategory = 'Menu';

  for (const line of lines) {
    if (/^[A-Z][A-Z\s]{3,}$/.test(line) || /^.{3,40}:$/.test(line)) {
      currentCategory = line.replace(/:$/, '').trim();
      continue;
    }
    const m = line.match(/^(.+?)\s{2,}([£$€]\s?[\d.,]+(?:\s*[-–]\s*[£$€]?\s*[\d.,]+)?)\s*$/);
    if (m) {
      products.push({
        name: m[1].trim(),
        price: m[2].trim(),
        description: '',
        category: currentCategory,
        image: '',
        source_url: sourceLabel,
      });
    }
  }
  return products;
}

export async function POST(req: NextRequest) {
  if (!JIGSAW_KEY) {
    return NextResponse.json({ error: 'JigsawStack API key not configured.' }, { status: 500 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let imageUrl: string | null = null;
    let sourceLabel = 'image';

    if (contentType.includes('application/json')) {
      // ── Direct image URL ──────────────────────────────────
      const body = await req.json();
      imageUrl = body.imageUrl || null;
      sourceLabel = imageUrl || 'image url';

      if (!imageUrl) {
        return NextResponse.json({ error: 'Provide imageUrl in request body.' }, { status: 400 });
      }

    } else if (contentType.includes('multipart/form-data')) {
      // ── File upload ────────────────────────────────────────
      const form = await req.formData();
      const file = form.get('image') as File | null;
      if (!file) return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });

      sourceLabel = file.name || 'uploaded image';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'image/jpeg';

      // Upload to Supabase storage → get public URL for JigsawStack
      imageUrl = await uploadToSupabase(buffer, mimeType, file.name || 'menu.jpg');

      if (!imageUrl) {
        // Supabase upload failed — try to create the bucket first (might not exist)
        try {
          await supabase.storage.createBucket('scraper-uploads', { public: true });
          imageUrl = await uploadToSupabase(buffer, mimeType, file.name || 'menu.jpg');
        } catch { /* bucket might already exist */ }
      }

      if (!imageUrl) {
        return NextResponse.json({
          error: 'Could not upload image for analysis. Check Supabase storage bucket "scraper-uploads" exists and is public.',
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Send JSON {imageUrl} or multipart/form-data with image file.' }, { status: 400 });
    }

    // ── Run vOCR ──────────────────────────────────────────
    const { context, error: vOCRError } = await runVOCR(imageUrl);

    if (!context) {
      return NextResponse.json({
        error: vOCRError || 'Could not read image. Ensure image is publicly accessible and clearly shows a menu.',
      }, { status: 422 });
    }

    const products = parseMenuText(context, sourceLabel);

    return NextResponse.json({
      products,
      raw: context,
      source: 'image-ocr',
      count: products.length,
    });

  } catch (err) {
    return NextResponse.json({ error: `Server error: ${(err as Error).message}` }, { status: 500 });
  }
}
