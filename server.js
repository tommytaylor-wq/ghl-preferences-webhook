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
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors()); // Handle preflight requests

app.use(bodyParser.json());

// Utility: fetch global tag name → tag ID mapping
async function getAllTagsMap() {
  const res = await axios.get(`${GHL_API_BASE}/tags`, {
    headers: { Authorization: `Bearer ${GHL_API_KEY}` }
  });
  const map = {};
  res.data.tags.forEach(tag => {
    map[tag.name] = tag.id;
  });
  return map;
}

app.post('/update-preferences', async (req, res) => {
  const { email, cid, ...rawPrefs } = req.body;

  if (!email || !cid) {
    return res.status(400).json({ error: 'Missing email or contact ID.' });
  }

  try {
    console.log(`📩 Request for ${email} (CID: ${cid})`);
    console.log("📝 Raw preferences from form:", rawPrefs);

    // Selected checkboxes from form
    const selectedFields = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
    console.log("✅ Selected form fields:", selectedFields);

    // Step 1: Get all tags in account
    const allTagsMap = await getAllTagsMap();

    // Step 2: Get contact's current tags (names)
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${cid}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });
    const currentTagNames = contactRes.data.contact.tags || [];
    console.log("🏷 Current contact tag names:", currentTagNames);

    // Step 3: Map current tag names → IDs to remove (only for our preference tags)
    const tagsToRemove = currentTagNames
      .filter(name => ALL_TAGS.includes(name))
      .map(name => allTagsMap[name]) // translate to IDs from global map
      .filter(Boolean);
    console.log("❌ Tags to remove (IDs):", tagsToRemove);

    // Step 4: Remove tags
    for (const tagId of tagsToRemove) {
      try {
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tagId}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
        console.log(`🧹 Removed tag ID: ${tagId}`);
      } catch (err) {
        console.warn(`⚠️ Could not remove tag ID ${tagId}:`, err.response?.data || err.message);
      }
    }

    // Step 5: Add selected tags by NAME
    if (selectedFields.length > 0) {
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: selectedFields
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
      console.log(`➕ Added tag names: ${selectedFields}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("💥 Error updating preferences:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
