import { describe, it, expect } from 'vitest';
import { generateLeadNurtureEmail } from '@/lib/emailTemplates';

describe('Miller AI Lead Nurture Email Generator', () => {
  it('generates welcome email for "new" stage leads with custom business branding', () => {
    const result = generateLeadNurtureEmail({
      leadName: 'Alex Mercer',
      businessName: 'Apex Wholesale UK',
      status: 'new',
      ctaUrl: 'https://apexwholesale.co.uk/catalog'
    });

    expect(result.subject).toContain('Welcome to Apex Wholesale UK');
    expect(result.html).toContain('Alex Mercer');
    expect(result.html).toContain('Apex Wholesale UK');
    expect(result.html).toContain('https://apexwholesale.co.uk/catalog');
    expect(result.html).toContain('Powered by Miller AI');
    expect(result.text).toContain('Alex Mercer');
  });

  it('generates proposal email with custom action message for "proposal" stage', () => {
    const customMsg = 'Your wholesale quote of £4,500 for Monster Energy crates is ready for sign-off.';
    const result = generateLeadNurtureEmail({
      leadName: 'Sarah Jenkins',
      businessName: 'Miller Demo Store',
      status: 'proposal',
      customMessage: customMsg
    });

    expect(result.subject).toContain('Action Required');
    expect(result.html).toContain(customMsg);
    expect(result.text).toContain(customMsg);
  });

  it('generates celebration onboarding email for "won" stage leads', () => {
    const result = generateLeadNurtureEmail({
      leadName: 'David Sterling',
      businessName: 'Kingston Distribution',
      status: 'won'
    });

    expect(result.subject).toContain('Welcome Onboard to Kingston Distribution');
    expect(result.html).toContain('Congratulations David Sterling');
  });
});
