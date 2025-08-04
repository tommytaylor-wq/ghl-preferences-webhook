const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Allow requests from your domain
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

  console.log("📩 Form submission:");
  console.log("Email:", email);
  console.log("Contact ID:", cid);
  console.log("Add Tags:", tagsToAdd);
  console.log("Remove Tags:", tagsToRemove);

  try {
    for (const tag of tagsToRemove) {
      try {
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tag}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        });
        console.log(`🧹 Removed tag: ${tag}`);
      } catch (err) {
        console.warn(`⚠️ Couldn't remove tag '${tag}':`, err.response?.data || err.message);
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

    return res.json({ success: true });

  } catch (err) {
    console.error("💥 Error:", err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Preferences server running on port ${PORT}`);
});
