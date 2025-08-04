const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// GHL API settings
const GHL_API_KEY = 'YOUR_GHL_API_KEY'; // replace with actual key
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Tags we're managing
const ALL_TAGS = [
  'wants_service_notifications',
  'wants_promotions',
  'wants_general_updates',
  'wants_surveys',
  'wants_yard_tips'
];

app.post('/update-preferences', async (req, res) => {
  const { email, preferences = [] } = req.body;

  console.log("Incoming form data:", JSON.stringify(req.body, null, 2));

  if (!email) {
    return res.status(400).json({ error: 'Missing email address.' });
  }

  try {
    // Step 1: Look up the contact in GHL
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      params: { email }
    });

    const contact = contactRes.data.contacts?.[0];
    if (!contact || !contact.id) {
      return res.status(404).json({ error: 'The contact id is invalid.' });
    }

    const contactId = contact.id;

    // Step 2: Remove all existing preference tags
    for (const tag of ALL_TAGS) {
      await axios.delete(`${GHL_API_BASE}/contacts/${contactId}/tags/${tag}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      }).catch(() => {}); // Ignore if tag wasn't there
    }

    // Step 3: Add only the selected tags
    for (const tag of preferences) {
      if (ALL_TAGS.includes(tag)) {
        await axios.post(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
          tags: [tag]
        }, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
      }
    }

    return res.json({ success: true });

  } catch (error) {
    console.error('Error updating preferences:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
