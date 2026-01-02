const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    if (!req.headers['x-requested-with']) {
        return res.status(403).json({ error: "Unauthorized access" });
    }
    next();
});

app.get('/api/lookup', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get(`https://hs-sim-database-api.vercel.app/api/lookup?query=${query}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "SIM API Error" });
    }
});

app.get('/api/truecaller', async (req, res) => {
    try {
        const { number } = req.query;
        const response = await axios.get(`https://truecalleranshapi.vercel.app/truecaller?number=${number}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Truecaller API Error" });
    }
});

module.exports = app;