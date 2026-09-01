const nodemailer = require('nodemailer');

function sanitize(value) {
  return String(value || '').trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Alleen POST aanvragen zijn toegestaan.' });
  }

  const name = sanitize(req.body?.name);
  const email = sanitize(req.body?.email);
  const phone = sanitize(req.body?.phone);
  const service = sanitize(req.body?.service);
  const message = sanitize(req.body?.message);

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Naam, e-mailadres en telefoonnummer zijn verplicht.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Vul een geldig e-mailadres in.' });
  }

  const requiredEnv = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASSWORD', 'MAIL_FROM', 'MAIL_TO'];
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    return res.status(500).json({ message: 'Mailinstellingen ontbreken op de server.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
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

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    replyTo: email,
    subject: `Nieuwe aanvraag via website - ${service || 'LoodgieterFixed'}`,
    text: [
      'Nieuwe aanvraag via de website',
      '',
      `Naam: ${name}`,
      `E-mailadres: ${email}`,
      `Telefoon: ${phone}`,
      `Dienst: ${service || '-'}`,
      `Moment: ${submittedAt}`,
      '',
      'Bericht:',
      message || '-',
    ].join('\n'),
  });

  return res.status(200).json({ message: 'Aanvraag verzonden.' });
};
