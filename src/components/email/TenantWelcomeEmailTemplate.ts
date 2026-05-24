const CLEARNAV_FAVICON_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='5' fill='%230A1628'/%3E%3Cpolyline points='5%2C23 11%2C14 17%2C19 23%2C9 27%2C13' fill='none' stroke='%2306B6D4' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E`;

export interface WelcomeEmailParams {
  tenantName: string;
  adminName: string;
  tenantSlug?: string;
}

export function buildTenantWelcomeEmailHtml({ tenantName, adminName, tenantSlug }: WelcomeEmailParams): string {
  const portalUrl = tenantSlug
    ? `https://${tenantSlug}.clearnav.cv`
    : 'https://app.clearnav.cv';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ClearNAV</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#020617;border-radius:12px 12px 0 0;padding:32px 40px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);border-radius:6px;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:300;color:#ffffff;letter-spacing:2px;">CLEAR</span><span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">NAV</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cyan accent bar -->
          <tr>
            <td style="background-color:#06b6d4;height:4px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <!-- Congratulations badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:20px;padding:6px 16px;">
                    <span style="font-size:12px;font-weight:600;color:#0891b2;letter-spacing:0.5px;text-transform:uppercase;">Official Tenant Confirmation</span>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#0f172a;line-height:1.2;">
                Welcome to ClearNAV,<br />${escapeHtml(tenantName)}
              </h1>

              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.7;">
                Dear ${escapeHtml(adminName)},
              </p>

              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.7;">
                Congratulations — <strong style="color:#0f172a;">${escapeHtml(tenantName)}</strong> is now officially onboarded as a ClearNAV tenant. Your fund administration platform is fully provisioned and ready for your team.
              </p>

              <p style="margin:0 0 32px;font-size:16px;color:#475569;line-height:1.7;">
                We've attached the following documents for your records. Please review them carefully and retain copies for your compliance files:
              </p>

              <!-- Attachment callout -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Attached Documents</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <div style="width:20px;height:20px;background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:4px;text-align:center;line-height:20px;font-size:11px;">📄</div>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">Fund Administration Agreement</p>
                                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Outlines the terms of our fund administration services</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <div style="width:20px;height:20px;background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:4px;text-align:center;line-height:20px;font-size:11px;">🔒</div>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">KYC/AML Protocols</p>
                                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Know Your Customer and Anti-Money Laundering procedures for your firm</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;">Next Steps</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                ${[
                  ['1', 'Log in to your portal', 'Access your dedicated ClearNAV dashboard and explore all available modules.'],
                  ['2', 'Invite your team', 'Add staff members and assign roles from the Staff Management section.'],
                  ['3', 'Configure your branding', 'Personalise your investor-facing portal with your firm\'s colours, logo, and domain.'],
                  ['4', 'Review compliance settings', 'Complete your KYC/AML configuration before onboarding investors.'],
                  ['5', 'Contact us anytime', 'Reach us at info@clearnav.cv for onboarding support or platform questions.'],
                ].map(([num, title, desc]) => `
                <tr>
                  <td style="padding:8px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width:32px;vertical-align:top;padding-top:2px;">
                          <div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">${num}</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">${title}</p>
                          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">${desc}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background-color:#06b6d4;border-radius:8px;">
                    <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Access Your ClearNAV Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
                We look forward to supporting your fund administration journey.<br />
                <strong style="color:#0f172a;">The ClearNAV Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#020617;border-radius:0 0 12px 12px;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:8px;">
                          <img src="${CLEARNAV_FAVICON_SVG}" width="20" height="20" alt="ClearNAV" style="display:block;" />
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:13px;font-weight:300;color:#94a3b8;letter-spacing:1px;">CLEAR</span><span style="font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:1px;">NAV</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="mailto:info@clearnav.cv" style="font-size:12px;color:#64748b;text-decoration:none;">info@clearnav.cv</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
                      This email and any attachments are confidential and intended solely for the named recipient. If you have received this in error, please notify us immediately and delete this message. ClearNAV is a fund administration platform. This communication does not constitute legal or financial advice.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildTenantWelcomeEmailSubject(tenantName: string): string {
  return `Welcome to ClearNAV — ${tenantName}'s Fund Administration Platform is Ready`;
}

export function buildTenantWelcomeEmailText({ tenantName, adminName, tenantSlug }: WelcomeEmailParams): string {
  const portalUrl = tenantSlug ? `https://${tenantSlug}.clearnav.cv` : 'https://app.clearnav.cv';
  return `Welcome to ClearNAV, ${tenantName}

Dear ${adminName},

Congratulations — ${tenantName} is now officially onboarded as a ClearNAV tenant. Your fund administration platform is fully provisioned and ready for your team.

We've attached the following documents for your records:
- Fund Administration Agreement
- KYC/AML Protocols for your firm

NEXT STEPS
1. Log in to your portal: ${portalUrl}
2. Invite your team from the Staff Management section
3. Configure your branding (colours, logo, domain)
4. Review and complete your KYC/AML compliance settings
5. Contact us anytime at info@clearnav.cv

We look forward to supporting your fund administration journey.

The ClearNAV Team
info@clearnav.cv

---
This email and any attachments are confidential and intended solely for the named recipient.`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
