const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['POST'] }));
app.use(bodyParser.json());

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

const ALL_TAGS = [
  'wants_service_notifications',
  'wants_promotions',
  'wants_general_updates',
  'wants_surveys',
  'wants_yard_tips'
];

// Fetch global tag name → tag ID mapping (for reference)
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

    const allTagsMap = await getAllTagsMap();
    console.log("📂 Tags from GHL:", allTagsMap);

    // Selected checkboxes from form
    const selectedFields = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
    console.log("✅ Selected form fields:", selectedFields);

    // Step 1: Get contact's current tags
    const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${cid}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });

    const currentTagIds = contactRes.data.contact.tags.map(t => t.id);
    const currentTagNames = contactRes.data.contact.tags.map(t => t.name);
    console.log("🏷 Current contact tags:", currentTagNames);

    // Step 2: Determine tags to remove (unchecked but present on contact)
    const tagsToRemove = ALL_TAGS
      .filter(name => !selectedFields.includes(name) && currentTagNames.includes(name))
      .map(name => {
        const index = currentTagNames.indexOf(name);
        return currentTagIds[index];
      });

    console.log("❌ Tags to remove (contact-specific IDs):", tagsToRemove);

    // Step 3: Remove tags
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

    // Step 4: Add tags by NAME
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
