const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Allow POSTs from your site
app.use(cors({
  origin: 'https://tcdogwaste.com',
  methods: ['POST'],
  credentials: false
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// GHL API Settings
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Tags you manage with this form
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
    // Step 1: Look up the contact by email
    // Step 1: Look up the contact by email (scoped to correct location)
// Step 1: Look up contacts by email (filtering manually by location)
console.log("🔍 Looking up contact by email...");
const contactRes = await axios.get(`${GHL_API_BASE}/contacts/`, {
  headers: { Authorization: `Bearer ${GHL_API_KEY}` },
  params: { email }
});

const contacts = contactRes.data.contacts || [];
const contact = contacts.find(c => c.locationId === 'zDhzBPMQLNkoGlJ9EExF');

if (!contact || !contact.id) {
  console.error("❌ Contact not found in correct location.");
  return res.status(404).json({ error: 'No matching contact found in the correct location.' });
}

const contactId = contact.id;
console.log(`👤 Found contact ID: ${contactId}`);


    // Step 2: Remove all known preference tags
    for (const tag of ALL_TAGS) {
      console.log(`🧹 Removing tag: ${tag}`);
      await axios.delete(`${GHL_API_BASE}/contacts/${contactId}/tags/${tag}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      }).catch(() => {}); // Ignore if it didn’t exist
    }

    // Step 3: Add selected tags
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
