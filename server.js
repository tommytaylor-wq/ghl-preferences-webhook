const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Allow POSTs only from your frontend
app.use(cors({
  origin: 'https://tcdogwaste.com',
  methods: ['POST'],
  credentials: false
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// GHL API config
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Tags you manage in preferences
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
  console.log("📩 Incoming:", { email, cid, selectedTags });

  try {
    // 🔁 Delete only unselected managed tags
    const unselected = ALL_TAGS.filter(tag => !selectedTags.includes(tag));
    for (const tag of unselected) {
      console.log(`🧹 Removing tag: ${tag}`);
      await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tag}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      }).catch((err) => {
        console.warn(`⚠️ Failed to delete tag '${tag}':`, err?.response?.data || err.message);
      });
    }

    // ➕ Add selected ones
    if (selectedTags.length > 0) {
      console.log("➕ Adding tags:", selectedTags);
      await axios.post(`${GHL_API_BASE}/contacts/${cid}/tags`, {
        tags: selectedTags
      }, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      });
    }

    console.log("✅ Preferences updated.");
    res.json({ success: true });

  } catch (err) {
    console.error('💥 Update failed:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Update failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
