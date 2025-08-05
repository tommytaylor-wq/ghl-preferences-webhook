const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

const ALL_TAGS = [
  'wants_service_notifications',
  'wants_promotions',
  'wants_general_updates',
  'wants_surveys',
  'wants_yard_tips'
];

// --- CORS FIX ---
app.use(cors({
  origin: '*', // Change to your domain for security
  methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors()); // Handle preflight requests

app.use(bodyParser.json());

app.post('/update-preferences', async (req, res) => {
  const { email, cid, ...rawPrefs } = req.body;

  if (!email || !cid) {
    return res.status(400).json({ error: 'Missing email or contact ID.' });
  }

  try {
    console.log(`📩 Request for ${email} (CID: ${cid})`);
    console.log("📝 Raw preferences from form:", rawPrefs);

    // Selected checkboxes from form (preferences to keep)
    const selectedFields = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
    console.log("✅ Selected preference tags:", selectedFields);

    // Step 1: Get current contact tags
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${cid}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });
    const currentTags = contactRes.data.contact.tags || [];
    console.log("🏷 Current contact tags:", currentTags);

    // Step 2: Keep all tags that are NOT in the preferences list
    const preservedTags = currentTags.filter(tag => !ALL_TAGS.includes(tag));
    console.log("🔒 Preserved non-preference tags:", preservedTags);

    // Step 3: Merge preserved + selected preference tags
    const finalTags = [...preservedTags, ...selectedFields];
    console.log("📦 Final tags to save:", finalTags);

    // Step 4: Update contact with full tag list (one API call)
    await axios.put(`${GHL_API_BASE}/contacts/${cid}`, {
      tags: finalTags
    }, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });

    console.log(`✅ Preferences updated successfully for ${email}`);
    res.json({ success: true });
  } catch (err) {
    console.error("💥 Error updating preferences:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get('/get-preferences', async (req, res) => {
  const { cid } = req.query;
  if (!cid) return res.status(400).json({ error: 'Missing contact ID' });

  try {
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${cid}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });

    const currentTags = contactRes.data.contact.tags || [];
    const preferenceTags = currentTags.filter(tag => ALL_TAGS.includes(tag));

    res.json({ tags: preferenceTags });
  } catch (err) {
    console.error("💥 Error fetching preferences:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

