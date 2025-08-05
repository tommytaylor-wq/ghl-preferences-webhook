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

// Map form field names → actual GHL tag names
const TAG_NAME_MAP = {
  wants_service_notifications: "Service Notifications",
  wants_promotions: "Promotions & Special Offers",
  wants_general_updates: "General Updates",
  wants_surveys: "Client Feedback & Surveys",
  wants_yard_tips: "Yard Tips"
};

// Get all tags from GHL and return { name: id } mapping
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
    console.log(`📩 Incoming request for ${email} (CID: ${cid})`);

    // Get all available tags from GHL
    const allTagsMap = await getAllTagsMap();

    // Figure out which tags the user selected
    const selectedFields = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
    const selectedTagIds = selectedFields
      .map(field => allTagsMap[TAG_NAME_MAP[field]])
      .filter(Boolean);

    // All possible tag IDs from our map
    const allPossibleTagIds = Object.values(TAG_NAME_MAP)
      .map(name => allTagsMap[name])
      .filter(Boolean);

    // Tags to remove = all possible tags minus selected ones
    const tagsToRemove = allPossibleTagIds.filter(id => !selectedTagIds.includes(id));

    // Remove unwanted tags
    for (const tagId of tagsToRemove) {
      try {
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tagId}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
        console.log(`🧹 Removed tag ID: ${tagId}`);
      } catch (err) {
        console.warn(`⚠️ Could not remove tag ${tagId}:`, err.response?.data || err.message);
      }
    }

    // Add selected tags
    if (selectedTagIds.length > 0) {
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: selectedTagIds
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
      console.log(`➕ Added tags: ${selectedTagIds.join(', ')}`);
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
