const nodemailer = require('nodemailer');
const { resolve } = require('path');

function sanitize(value) {
  return String(value || '').trim();
}

function escapeHtml(value) {
  return sanitize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function logoAttachment() {
  return {
    filename: 'logo.png',
    path: resolve(__dirname, '..', 'images', 'Logo.png'),
    cid: 'loodgieterfixed-logo',
  };
}

function emailShell({ preheader, title, intro, rows, message, footerNote, cta }) {
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#5f7288;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;width:145px;">${label}</td>
          <td style="padding:10px 0;color:#071c33;font-size:15px;font-weight:700;">${value || '-'}</td>
        </tr>`,
    )
    .join('');

  const messageHtml = message
    ? `
      <div style="margin-top:22px;padding:18px 20px;border-radius:14px;background:#f8fbff;border:1px solid #dce8f5;">
        <div style="color:#5f7288;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Bericht</div>
        <div style="color:#071c33;font-size:15px;line-height:1.65;">${message}</div>
      </div>`
    : '';

  const ctaHtml = cta
    ? `
      <a href="${cta.href}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#0074d9;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;">${cta.label}</a>`
    : '';

  return `
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef5fc;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef5fc;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dce8f5;box-shadow:0 18px 44px rgba(7,28,51,.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0074d9 0%,#005bab 52%,#06182c 100%);padding:30px 34px;color:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;width:78px;">
                      <div style="width:64px;height:64px;border-radius:18px;background:#ffffff;display:block;text-align:center;line-height:64px;">
                        <img src="cid:loodgieterfixed-logo" width="42" alt="LoodgieterFixed" style="vertical-align:middle;border:0;max-height:50px;">
                      </div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:26px;line-height:1;font-weight:900;letter-spacing:-.02em;">Loodgieter<span style="color:#b8dcff;">Fixed</span></div>
                      <div style="margin-top:8px;color:#d7ecff;font-size:13px;font-weight:700;">Snel · betrouwbaar · vakkundig</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px;">
                <h1 style="margin:0 0 12px;color:#071c33;font-size:30px;line-height:1.15;font-weight:900;">${title}</h1>
                <p style="margin:0;color:#5f7288;font-size:16px;line-height:1.65;">${intro}</p>
                ${ctaHtml}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;border-top:1px solid #dce8f5;border-bottom:1px solid #dce8f5;">
                  ${rowHtml}
                </table>
                ${messageHtml}
                <p style="margin:24px 0 0;color:#5f7288;font-size:13px;line-height:1.55;">${footerNote}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 34px;background:#f8fbff;color:#5f7288;font-size:12px;line-height:1.5;">
                LoodgieterFixed · 06 28 21 36 62 · info@loodgieterfixed.nl
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function validateContactPayload(body) {
  const name = sanitize(body?.name);
  const email = sanitize(body?.email);
  const phone = sanitize(body?.phone);
  const service = sanitize(body?.service);
  const message = sanitize(body?.message);

  if (!name || !email || !phone) {
    const error = new Error('Naam, e-mailadres en telefoonnummer zijn verplicht.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Vul een geldig e-mailadres in.');
    error.statusCode = 400;
    throw error;
  }

  return { name, email, phone, service, message };
}

async function sendContactRequest(body) {
  const payload = validateContactPayload(body);
  const requiredEnv = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASSWORD', 'MAIL_FROM', 'MAIL_TO'];
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    const error = new Error(`Mailinstellingen ontbreken: ${missing.join(', ')}.`);
    error.statusCode = 500;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const submittedAt = new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date());

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      replyTo: payload.email,
      subject: `Nieuwe aanvraag via website - ${payload.service || 'LoodgieterFixed'}`,
      attachments: [logoAttachment()],
      text: [
        'Nieuwe aanvraag via de website',
        '',
        `Naam: ${payload.name}`,
        `E-mailadres: ${payload.email}`,
        `Telefoon: ${payload.phone}`,
        `Dienst: ${payload.service || '-'}`,
        `Moment: ${submittedAt}`,
        '',
        'Bericht:',
        payload.message || '-',
      ].join('\n'),
      html: emailShell({
        preheader: `Nieuwe aanvraag van ${escapeHtml(payload.name)} via de website.`,
        title: 'Nieuwe aanvraag via de website',
        intro: 'Er is een nieuw formulier ingevuld op de website. Neem contact op met de aanvrager voor een afspraak of eerste inschatting.',
        rows: [
          ['Naam', escapeHtml(payload.name)],
          ['E-mailadres', `<a href="mailto:${escapeHtml(payload.email)}" style="color:#0074d9;text-decoration:none;">${escapeHtml(payload.email)}</a>`],
          ['Telefoon', `<a href="tel:${escapeHtml(payload.phone)}" style="color:#0074d9;text-decoration:none;">${escapeHtml(payload.phone)}</a>`],
          ['Dienst', escapeHtml(payload.service || '-')],
          ['Moment', escapeHtml(submittedAt)],
        ],
        message: nl2br(payload.message || '-'),
        footerNote: 'Deze aanvraag is automatisch verzonden via het contactformulier van LoodgieterFixed.',
        cta: {
          href: `tel:${escapeHtml(payload.phone)}`,
          label: 'Bel de aanvrager',
        },
      }),
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: payload.email,
      replyTo: process.env.MAIL_TO,
      subject: 'We hebben je aanvraag ontvangen',
      attachments: [logoAttachment()],
      text: [
        `Beste ${payload.name},`,
        '',
        'Bedankt voor je aanvraag via LoodgieterFixed.',
        'We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.',
        '',
        'Je aanvraag:',
        `Dienst: ${payload.service || '-'}`,
        `Telefoon: ${payload.phone}`,
        '',
        'Bericht:',
        payload.message || '-',
        '',
        'Met vriendelijke groet,',
        'LoodgieterFixed',
        '06 28 21 36 62',
        'info@loodgieterfixed.nl',
      ].join('\n'),
      html: emailShell({
        preheader: 'We hebben je aanvraag ontvangen en nemen zo snel mogelijk contact met je op.',
        title: 'Je aanvraag is ontvangen',
        intro: `Beste ${escapeHtml(payload.name)}, bedankt voor je aanvraag. We hebben je bericht ontvangen en nemen zo snel mogelijk contact met je op.`,
        rows: [
          ['Dienst', escapeHtml(payload.service || '-')],
          ['Telefoon', escapeHtml(payload.phone)],
          ['E-mailadres', escapeHtml(payload.email)],
          ['Moment', escapeHtml(submittedAt)],
        ],
        message: nl2br(payload.message || '-'),
        footerNote: 'Heb je spoed of lekkage? Bel dan direct naar 06 28 21 36 62.',
        cta: {
          href: 'tel:+31628213662',
          label: 'Bel LoodgieterFixed',
        },
      }),
    });
  } catch (error) {
    const mailError = new Error(`Mailserver weigert of reageert niet: ${error.message || 'onbekende SMTP-fout'}`);
    mailError.statusCode = 502;
    throw mailError;
  }
}

module.exports = { sendContactRequest };
