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

// Map form field names to tag names in GHL
const TAG_NAME_MAP = {
  wants_service_notifications: "Service Notifications",
  wants_promotions: "Promotions & Special Offers",
  wants_general_updates: "General Updates",
  wants_surveys: "Client Feedback & Surveys",
  wants_yard_tips: "Yard Tips"
};

// Fetch all GHL tags and return name → id map
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
    const allTagsMap = await getAllTagsMap();

    // Determine which tags to add/remove
    const selectedFields = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
    const selectedTagIds = selectedFields.map(f => allTagsMap[TAG_NAME_MAP[f]]).filter(Boolean);

    const allPossibleTagIds = Object.values(TAG_NAME_MAP)
      .map(name => allTagsMap[name])
      .filter(Boolean);

    const tagsToRemove = allPossibleTagIds.filter(id => !selectedTagIds.includes(id));

    // Remove unwanted tags
    for (const tagId of tagsToRemove) {
      await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
    }

    // Add selected tags
    if (selectedTagIds.length > 0) {
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: selectedTagIds
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
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
  const tagsToRemove = ALL_TAGS.filter(tag => !selectedTags.includes(tag));
  const tagsToAdd = selectedTags.filter(tag => ALL_TAGS.includes(tag));

  console.log("📩 Incoming form submission");
  console.log("👤 Contact ID:", cid);
  console.log("✅ Tags to add:", tagsToAdd);
  console.log("❌ Tags to remove:", tagsToRemove);

  try {
    for (const tag of tagsToRemove) {
      try {
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tag}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
        console.log(`🧹 Removed tag: ${tag}`);
      } catch (err) {
        console.warn(`⚠️ Could not remove tag '${tag}':`, err.response?.data || err.message);
      }
    }

    if (tagsToAdd.length > 0) {
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: tagsToAdd
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
      console.log("➕ Added tags:", tagsToAdd);
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
