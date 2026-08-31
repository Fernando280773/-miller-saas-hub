// Responsive HTML Email Templates for Miller AI Lead Nurture Sequences

export interface EmailTemplateOptions {
  leadName: string;
  businessName: string;
  storeLogo?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  customMessage?: string;
  ctaUrl?: string;
}

export function generateLeadNurtureEmail(opts: EmailTemplateOptions): { subject: string; html: string; text: string } {
  const biz = opts.businessName || 'Miller SaaS Hub Merchant';
  const name = opts.leadName || 'Valued Customer';
  const cta = opts.ctaUrl || 'https://millersaashub.com';

  let subject = '';
  let headline = '';
  let bodyContent = '';
  let ctaText = 'View Details & Connect';

  switch (opts.status) {
    case 'new':
      subject = `Welcome to ${biz} — Thank You for Your Inquiry`;
      headline = `Hello ${name}, thank you for reaching out!`;
      bodyContent = opts.customMessage || `We received your inquiry through our official catalog. Our automated AI assistant is preparing your personalized product recommendations. Reply directly to this email or book a consultation below.`;
      ctaText = 'Explore Catalog & Schedule';
      break;

    case 'contacted':
      subject = `${biz} · Following Up on Your Request`;
      headline = `Special Recommendations Tailored for You`;
      bodyContent = opts.customMessage || `We’ve curated a tailored selection of products and wholesale pricing tiers matching your exact business needs. Take a look at our current stock availability and pricing.`;
      ctaText = 'View Curated Selection';
      break;

    case 'qualified':
      subject = `${biz} · Custom Proposal & Wholesale Rates`;
      headline = `Exclusive Commercial Proposal for ${name}`;
      bodyContent = opts.customMessage || `Based on our previous discussion, we have prepared a custom pricing proposal with dedicated volume discounts and delivery schedules.`;
      ctaText = 'Review Custom Proposal';
      break;

    case 'proposal':
      subject = `Action Required: Finalize Your ${biz} Order`;
      headline = `Your Order & Agreement are Ready for Review`;
      bodyContent = opts.customMessage || `Your custom quote is active and reserved for the next 48 hours. Click below to confirm your line items and initiate rapid dispatch.`;
      ctaText = 'Confirm & Finalize Order';
      break;

    case 'won':
      subject = `🎉 Welcome Onboard to ${biz}!`;
      headline = `Congratulations ${name}, your order is confirmed!`;
      bodyContent = opts.customMessage || `Thank you for partnering with us! Your dedicated merchant account is active, and our fulfillment team has started processing your order.`;
      ctaText = 'Access Your Customer Portal';
      break;

    default:
      subject = `An Update from ${biz}`;
      headline = `Hello ${name},`;
      bodyContent = opts.customMessage || `We wanted to check in and see if you have any questions regarding our e-commerce solutions and product catalog.`;
      ctaText = 'Contact Support';
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#090d16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#090d16;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#0f172a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 36px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%);text-align:left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:4px;">
                      ${biz}
                    </div>
                    <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">
                      Powered by Miller AI · Lead CRM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 28px 36px;background-color:#0f172a;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${headline}
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                ${bodyContent}
              </p>

              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);">
                    <a href="${cta}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">
                Have questions or need immediate assistance? Simply reply to this email directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background-color:#090d16;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;">
                Sent on behalf of <strong>${biz}</strong> via Miller AI CRM Automation.
              </p>
              <p style="margin:0;font-size:11px;color:#475569;">
                80% AI Agent Driven · Tenant Isolated · Privacy Protected
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${biz} — ${subject}
=====================================================

${headline}

${bodyContent}

Link: ${cta}

--
Sent on behalf of ${biz} via Miller AI CRM Automation.
  `.trim();

  return { subject, html, text };
}
