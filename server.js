const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: 'https://tcdogwaste.com',
  methods: ['POST'],
  credentials: false
}));

app.use(bodyParser.urlencoded({ extended: true }));
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

app.post('/update-preferences', async (req, res) => {
  const { email, cid, ...rawPrefs } = req.body;

  if (!email || !cid) {
    return res.status(400).json({ error: 'Missing email or contact ID.' });
  }

  const selectedTags = Object.keys(rawPrefs).filter(k => rawPrefs[k] === 'on');
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
