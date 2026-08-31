import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db, DEFAULT_STORE_ID } from '@/lib/supabaseClient';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'miller_saas_hub_webhook_secret';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yqeffqndvdstmhihzlgn.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';

// Server-side service-role client for background webhook writes (bypasses RLS)
const serviceSupabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── GET: Meta WhatsApp Webhook Verification ─────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'miller_saas_hub_webhook_secret')) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// ── Helper: Parse Invoice Data from text/caption ─────────────────────────────
function extractInvoiceInfo(text: string, senderName: string) {
  const clean = text || '';
  
  // Extract total amount e.g. £120.50, 120.50, GBP 45.00
  const priceMatch = clean.match(/(?:£|\$|€|GBP\s*)?(\d+(?:\.\d{1,2})?)/i);
  const totalAmount = priceMatch ? parseFloat(priceMatch[1]) : 0;

  // Extract invoice number e.g. INV-1234, #88412
  const invMatch = clean.match(/(?:inv(?:oice)?|ref|bill|no\.?|#)\s*[:#-]?\s*([a-z0-9-]+)/i);
  const invoiceNumber = invMatch ? invMatch[1].toUpperCase() : `WA-INV-${Date.now().toString().slice(-5)}`;

  // Supplier Name extraction or default to sender
  let supplierName = senderName || 'Wholesale Supplier';
  const commonSuppliers = ["Booker's Wholesale", 'Bestway', 'Empire Vape', 'DG Distribution', 'City Fresh', 'Valley Dairy', 'Lycamobile', 'Micro Wholesale'];
  for (const s of commonSuppliers) {
    if (clean.toLowerCase().includes(s.toLowerCase())) {
      supplierName = s;
      break;
    }
  }

  return {
    supplierName,
    invoiceNumber,
    totalAmount: totalAmount > 0 ? totalAmount : 50.00,
    currency: 'GBP',
    items: [
      {
        description: clean.slice(0, 80) || 'WhatsApp captured supplier order',
        qty: 1,
        unitPrice: totalAmount > 0 ? totalAmount : 50.00
      }
    ]
  };
}

// ── Helper: Miller AI Auto-Scoring for Lead Inquiry ──────────────────────────
function scoreLeadInquiry(text: string): 'hot' | 'warm' | 'cold' {
  const lower = text.toLowerCase();
  const hotKeywords = ['quote', 'price', 'pricing', 'order', 'buy', 'urgent', 'available', 'book', 'hire', 'cost', 'invoice', 'how much'];
  if (hotKeywords.some(kw => lower.includes(kw))) return 'hot';
  return 'warm';
}

// ── POST: Inbound WhatsApp Message Ingestion ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let senderPhone = '';
    let senderName = '';
    let messageText = '';
    let messageType = 'text';
    let mediaUrl = '';
    let storeId = DEFAULT_STORE_ID;

    // 1. Check if Meta Graph API webhook format
    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value) {
      const val = body.entry[0].changes[0].value;
      const contactObj = val.contacts?.[0];
      const msgObj = val.messages?.[0];

      if (!msgObj) {
        return NextResponse.json({ status: 'ignored_no_message' }, { status: 200 });
      }

      senderPhone = msgObj.from || '';
      senderName = contactObj?.profile?.name || `WA Contact (${senderPhone.slice(-4)})`;
      messageType = msgObj.type || 'text';

      if (messageType === 'text') {
        messageText = msgObj.text?.body || '';
      } else if (messageType === 'image') {
        messageText = msgObj.image?.caption || 'Photo of invoice / receipt';
        mediaUrl = msgObj.image?.id || '';
      } else if (messageType === 'document') {
        messageText = msgObj.document?.caption || msgObj.document?.filename || 'Document';
        mediaUrl = msgObj.document?.id || '';
      }
    } 
    // 2. Direct / Simulated payload format (for instant testing & Edge triggers)
    else {
      senderPhone = body.sender_phone || body.phone || '+447700900123';
      senderName = body.sender_name || body.name || 'WhatsApp Contact';
      messageText = body.text || body.message || '';
      messageType = body.type || (body.media_url ? 'image' : 'text');
      mediaUrl = body.media_url || '';
      storeId = body.store_id || DEFAULT_STORE_ID;
    }

    const lowerText = messageText.toLowerCase();

    // ── DECISION TREE: Is this an INVOICE CAPTURE or a CUSTOMER LEAD INQUIRY? ──
    const isInvoice = 
      messageType === 'image' || 
      messageType === 'document' ||
      lowerText.includes('invoice') || 
      lowerText.includes('receipt') || 
      lowerText.includes('bill') || 
      lowerText.includes('delivery note') ||
      lowerText.includes('supplier') ||
      lowerText.includes('wholesale');

    // ══════════════════════════════════════════════════════════════════════════
    // A. INVOICE CAPTURE → PURCHASE HUB & OCR QUEUE
    // ══════════════════════════════════════════════════════════════════════════
    if (isInvoice) {
      const invData = extractInvoiceInfo(messageText, senderName);

      const invoicePayload = {
        store_id: storeId,
        supplier_name: invData.supplierName,
        invoice_number: invData.invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        total_amount: invData.totalAmount,
        currency: 'GBP',
        status: 'Pending' as const,
        items: invData.items,
        image_storage_path: mediaUrl || 'whatsapp_captured',
        captured_via: 'whatsapp' as const
      };

      // 1. Insert with service-role client (bypasses RLS for server-side webhook ingestion)
      try {
        await serviceSupabase.from('supplier_invoices').insert([invoicePayload]);
      } catch (dbErr) {
        console.warn('Service role supplier_invoices insert fallback:', dbErr);
      }

      // 2. Insert WhatsApp draft confirmation
      const waDraft = await db.createWhatsAppDraft({
        store_id: storeId,
        recipient_name: senderName,
        recipient_phone: senderPhone,
        message_text: `Invoice #${invData.invoiceNumber} from ${invData.supplierName} (£${invData.totalAmount.toFixed(2)}) captured into Purchase Hub. Pending verification.`,
        status: 'Approved',
        trigger_reason: 'whatsapp_invoice_receipt_confirmation'
      });

      return NextResponse.json({
        success: true,
        type: 'invoice_captured',
        message: 'Invoice successfully routed to Purchase Hub',
        invoice: invoicePayload,
        draft: waDraft
      }, { status: 200 });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // B. CUSTOMER INQUIRY → LEAD MANAGEMENT CRM & DRAFT AUTO-REPLY
    // ══════════════════════════════════════════════════════════════════════════
    const score = scoreLeadInquiry(messageText);

    // 1. Create Lead in CRM with Service Role
    const newLead = await db.createLead({
      store_id: storeId,
      name: senderName,
      contact: senderPhone,
      contact_type: 'whatsapp',
      source: 'whatsapp',
      source_name: 'WhatsApp Inbound Message',
      score,
      status: 'new',
      notes: `Inbound WhatsApp: "${messageText}"`,
      tags: ['whatsapp-inbound', score, 'auto-captured']
    });

    try {
      await serviceSupabase.from('leads').upsert([newLead]);
    } catch (dbErr) {
      console.warn('Service role lead upsert fallback:', dbErr);
    }

    // 2. Generate Miller AI Draft Response
    const autoReplyText = `Hi ${senderName}, thank you for contacting us! We received your message: "${messageText.slice(0, 60)}...". Our team is reviewing this right now and will get back to you shortly.`;

    const waDraft = await db.createWhatsAppDraft({
      store_id: storeId,
      lead_id: newLead.id,
      recipient_name: senderName,
      recipient_phone: senderPhone,
      message_text: autoReplyText,
      status: 'Draft',
      trigger_reason: 'inbound_lead_inquiry'
    });

    return NextResponse.json({
      success: true,
      type: 'lead_captured',
      message: 'Inbound message routed to Lead Management CRM and draft auto-reply generated',
      lead: newLead,
      draft: waDraft
    }, { status: 200 });

  } catch (err: unknown) {
    console.error('WhatsApp webhook processing error:', err);
    return NextResponse.json(
      { error: 'Failed to process WhatsApp webhook event' },
      { status: 500 }
    );
  }
}
