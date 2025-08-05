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

// Fetch global tag name → tag ID mapping
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

    // Step 1: Get all tags in account (name → ID)
    const allTagsMap = await getAllTagsMap();
    console.log("📂 Tags from GHL:", allTagsMap);

    // Step 2: Get contact's current tags (IDs only)
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${cid}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });
    const contactTagIds = contactRes.data.contact.tags.map(t => t.id);

    // Step 3: Convert contact tag IDs → names
    const idToNameMap = Object.fromEntries(
      Object.entries(allTagsMap).map(([name, id]) => [id, name])
    );
    const currentTagNames = contactTagIds.map(id => idToNameMap[id]).filter(Boolean);
    console.log("🏷 Current contact tags:", currentTagNames);

    // Step 4: Determine tags to remove (unchecked but present)
    const tagsToRemoveIds = ALL_TAGS
      .filter(name => !selectedFields.includes(name) && currentTagNames.includes(name))
      .map(name => allTagsMap[name]);

    console.log("❌ Tags to remove (IDs):", tagsToRemoveIds);

    // Step 5: Remove tags by ID
    for (const tagId of tagsToRemoveIds) {
      try {
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tagId}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
        console.log(`🧹 Removed tag ID: ${tagId}`);
      } catch (err) {
        console.warn(`⚠️ Could not remove tag ID ${tagId}:`, err.response?.data || err.message);
      }
    }

    // Step 6: Add tags by NAME
    if (selectedFields.length > 0) {
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: selectedFields // names, not IDs
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
