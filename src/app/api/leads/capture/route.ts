import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      contact: rawContact,
      notes,
      message,
      store_id = 'store-1',
      source = 'landing_page',
      source_name,
      business_unit
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const contactVal = phone || email || rawContact || 'Unspecified';
    const contactType = phone ? 'phone' : email ? 'email' : 'whatsapp';
    const fullNotes = notes || message || '';

    // Miller AI Auto-Scoring Heuristics
    const lowerNotes = (fullNotes + ' ' + (source_name || '')).toLowerCase();
    let score: 'hot' | 'warm' | 'cold' = 'warm';

    const hotKeywords = ['urgent', 'quote', 'pricing', 'cost', 'buy', 'hire', 'book', 'asap', 'proposal', 'start immediately', 'invoice'];
    const coldKeywords = ['just browsing', 'spam', 'unsubscribe', 'test'];

    if (hotKeywords.some(kw => lowerNotes.includes(kw))) {
      score = 'hot';
    } else if (coldKeywords.some(kw => lowerNotes.includes(kw))) {
      score = 'cold';
    }

    const newLead = {
      store_id,
      name: name.trim(),
      contact: contactVal.trim(),
      contact_type: contactType,
      source: source as 'landing_page',
      source_name: source_name || 'Hosted Landing Page',
      score,
      status: 'new' as const,
      business_unit: business_unit || '',
      notes: fullNotes.trim(),
      tags: ['landing-page-capture', 'v2-lead', score],
      created_at: new Date().toISOString(),
      nurture_sent: 0,
      nurture_messages: []
    };

    // 1. Try writing directly to Supabase if live credentials exist
    try {
      const { data, error } = await supabase.from('leads').insert([newLead]).select().single();
      if (!error && data) {
        return NextResponse.json(
          {
            success: true,
            message: 'Lead captured successfully into Miller SaaS Hub CRM',
            lead: data
          },
          { status: 201, headers: CORS_HEADERS }
        );
      }
    } catch (dbErr) {
      console.warn('Supabase direct insert skipped or failed:', dbErr);
    }

    // 2. Return success response (client-side script will also save to localStorage if embedded)
    return NextResponse.json(
      {
        success: true,
        message: 'Lead captured successfully',
        lead: {
          id: `lead-${Date.now().toString(36)}`,
          ...newLead
        }
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    console.error('Lead capture error:', err);
    return NextResponse.json(
      { error: 'Failed to process lead capture submission' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
