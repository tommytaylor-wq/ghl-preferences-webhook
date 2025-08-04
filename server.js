const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Allow POSTs from your frontend only
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

// Tags managed by preferences center
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
    // Step 1: Remove unselected managed tags
    for (const tag of ALL_TAGS) {
      if (!selectedTags.includes(tag)) {
        console.log(`🧹 Removing tag: ${tag}`);
        await axios.delete(`${GHL_API_BASE}/contacts/${cid}/tags/${tag}`, {
          headers: { Authorization: `Bearer ${GHL_API_KEY}` }
        }).catch(() => {});
      }
    }

    // Step 2: Add selected tags
    if (selectedTags.length > 0) {
      console.log("➕ Adding:", selectedTags);
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
  console.log(`🚀 Live on port ${PORT}`);
});

  if (!email || !contactId) {
    return res.status(400).json({ error: 'Missing email or contact ID.' });
  }

  const selectedTags = Object.keys(rawPrefs).filter(key => rawPrefs[key] === 'on');
  console.log("✅ Selected tags:", selectedTags);

  try {
    // Step 1: Get current tags on contact
    const existingRes = await axios.get(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });

    const existingTags = existingRes.data.tags || [];
    console.log("📎 Current tags on contact:", existingTags);

    // Step 2: Keep only tags we don't manage
    const nonPreferenceTags = existingTags.filter(tag => !ALL_TAGS.includes(tag));
    const validNewTags = selectedTags.filter(tag => ALL_TAGS.includes(tag));
    const finalTags = [...new Set([...nonPreferenceTags, ...validNewTags])];

    console.log("🔁 Final tags to apply:", finalTags);

    // Step 3: Overwrite all tags with updated list
    await axios.put(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
      tags: finalTags
    }, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` }
    });

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
