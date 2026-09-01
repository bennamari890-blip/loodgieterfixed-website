const { sendContactRequest } = require('./_mail');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Alleen POST aanvragen zijn toegestaan.' });
  }

  try {
    await sendContactRequest(req.body);
    return res.status(200).json({ message: 'Aanvraag verzonden.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Verzenden is niet gelukt.',
    });
  }
};
