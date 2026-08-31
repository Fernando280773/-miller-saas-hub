import { NextRequest, NextResponse } from 'next/server';
import { generateLeadNurtureEmail, EmailTemplateOptions } from '@/lib/emailTemplates';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'Miller AI <notifications@millersaashub.com>';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject: customSubject, html: customHtml, text: customText, leadName, businessName, status, customMessage, ctaUrl } = body;

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json({ error: 'Valid recipient email address is required.' }, { status: 400 });
    }

    // Generate responsive template if raw HTML is not passed
    let subject = customSubject;
    let html = customHtml;
    let text = customText;

    if (!html) {
      const templateOpts: EmailTemplateOptions = {
        leadName: leadName || 'Valued Prospect',
        businessName: businessName || 'Miller SaaS Hub Merchant',
        status: (status as EmailTemplateOptions['status']) || 'new',
        customMessage: customMessage,
        ctaUrl: ctaUrl || 'https://millersaashub.com'
      };

      const generated = generateLeadNurtureEmail(templateOpts);
      subject = subject || generated.subject;
      html = generated.html;
      text = text || generated.text;
    }

    // 1. Dispatch via Resend API (if configured)
    if (RESEND_API_KEY) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject: subject,
          html: html,
          text: text
        }),
        signal: AbortSignal.timeout(10000)
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        return NextResponse.json({ error: resendData.message || 'Failed to send email via Resend' }, { status: resendRes.status });
      }

      return NextResponse.json({
        success: true,
        provider: 'resend',
        id: resendData.id,
        to,
        subject,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Dispatch via SendGrid API (if configured)
    if (SENDGRID_API_KEY) {
      const sendgridRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL.split('<').pop()?.replace('>', '') || 'noreply@millersaashub.com', name: 'Miller AI CRM' },
          subject: subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html }
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!sendgridRes.ok) {
        const errorText = await sendgridRes.text();
        return NextResponse.json({ error: `SendGrid error: ${errorText}` }, { status: sendgridRes.status });
      }

      return NextResponse.json({
        success: true,
        provider: 'sendgrid',
        id: `sg_${Date.now()}`,
        to,
        subject,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Local / Sandbox Simulation (Offline or Demo mode)
    return NextResponse.json({
      success: true,
      provider: 'simulated_delivery',
      id: `sim_${Date.now().toString(36)}`,
      to,
      subject,
      previewHtml: html,
      note: 'Simulated email delivery (set RESEND_API_KEY or SENDGRID_API_KEY in production)',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return NextResponse.json({ error: `Email dispatcher exception: ${(err as Error).message}` }, { status: 500 });
  }
}
