const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Allow POSTs only from your site
app.use(cors({
  origin: 'https://tcdogwaste.com',
  methods: ['POST'],
  credentials: false
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// GHL API settings
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Tags used in your preferences center
const ALL_TAGS = [
  'wants_service_notifications',
  'wants_promotions',
  'wants_general_updates',
  'wants_surveys',
  'wants_yard_tips'
];

app.post('/update-preferences', async (req, res) => {
  const { email, ...rawPrefs } = req.body;
  console.log("📩 Incoming form data:", JSON.stringify(req.body, null, 2));

  if (!email) {
    return res.status(400).json({ error: 'Missing email address.' });
  }

  const selectedTags = Object.keys(rawPrefs).filter(key => rawPrefs[key] === 'on');
  console.log("✅ Selected tags:", selectedTags);

  try {
    // TEMP: Hardcoded contact ID for safe testing
    const contactId = 'Moz8op9wQvT8GnSMhHDd'; // << your real contact ID
    console.log(`👤 [TEMP] Using hardcoded contact ID: ${contactId}`);

    // Step 2: Remove all preference tags
    for (const tag of ALL_TAGS) {
      console.log(`🧹 Removing tag: ${tag}`);
      await axios.delete(`${GHL_API_BASE}/contacts/${contactId}/tags/${tag}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      }).catch(() => {}); // Ignore if not present
    }

    // Step 3: Add valid selected tags
    const validTags = selectedTags.filter(tag => ALL_TAGS.includes(tag));
    if (validTags.length > 0) {
      console.log("➕ Adding tags:", validTags);
      await axios.post(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
        tags: validTags
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
    }

    console.log("✅ Preferences updated successfully.");
    return res.json({ success: true });

  } catch (error) {
    console.error('💥 Error updating preferences:', error?.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
