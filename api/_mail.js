const nodemailer = require('nodemailer');

function sanitize(value) {
  return String(value || '').trim();
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
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: payload.email,
      replyTo: process.env.MAIL_TO,
      subject: 'We hebben je aanvraag ontvangen',
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
    });
  } catch (error) {
    const mailError = new Error(`Mailserver weigert of reageert niet: ${error.message || 'onbekende SMTP-fout'}`);
    mailError.statusCode = 502;
    throw mailError;
  }
}

module.exports = { sendContactRequest };
