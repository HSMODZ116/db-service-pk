// Ise 'api' folder mein rakhein
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/api/lookup', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get(`https://hs-sim-database-api.vercel.app/api/lookup?query=${query}`);
        res.json(response.data);
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/truecaller', async (req, res) => {
    try {
        const { number } = req.query;
        const response = await axios.get(`https://truecalleranshapi.vercel.app/truecaller?number=${number}`);
        res.json(response.data);
    } catch (e) { res.status(500).send(e.message); }
});

module.exports = app;