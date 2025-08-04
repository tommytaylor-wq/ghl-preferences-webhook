const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

const TAG_MAP = {
  wants_service_notifications: 'Service Notifications (Necessary)',
  wants_promotions: 'Promotions & Special Offers',
  wants_general_updates: 'General Updates',
  wants_surveys: 'Client Feedback & Surveys',
  wants_yard_tips: 'Tips & Seasonal Yard Advice'
};

app.post('/update-preferences', async (req, res) => {
  const { email, ...formData } = req.body;
  if (!email) return res.status(400).send('Missing email');

  try {
    const contactRes = await axios.get(`${GHL_BASE_URL}/contacts/search`, {
      headers: { Authorization: `Bearer ${GHL_API_KEY}` },
      params: { email }
    });

    const contact = contactRes.data.contacts[0];
    if (!contact) return res.status(404).send('Contact not found');

    const contactId = contact.id;

    for (let tag of Object.keys(TAG_MAP)) {
      await axios.delete(`${GHL_BASE_URL}/contacts/${contactId}/tags/${tag}`, {
        headers: { Authorization: `Bearer ${GHL_API_KEY}` }
      }).catch(() => {});
    }

    for (let tag in formData) {
      if (formData[tag] === 'on') {
        await axios.post(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
          tag
        }, {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    res.status(200).send('Preferences updated');
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Something went wrong');
  }
});

app.get('/', (_, res) => res.send('Webhook running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
