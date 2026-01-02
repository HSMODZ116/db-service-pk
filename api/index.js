const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Truecaller API کیلئے user-agent ضروری ہے
const TRUECALLER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

app.use((req, res, next) => {
    if (!req.headers['x-requested-with']) {
        return res.status(403).json({ error: "Unauthorized access" });
    }
    next();
});

app.get('/api/lookup', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 10) {
            return res.status(400).json({ error: "Invalid query parameter" });
        }
        
        const response = await axios.get(`https://hs-sim-database-api.vercel.app/api/lookup?query=${query}`, {
            timeout: 15000
        });
        res.json(response.data);
    } catch (error) {
        console.error('SIM API Error:', error.message);
        res.status(500).json({ 
            error: "SIM API Error", 
            message: error.message 
        });
    }
});

app.get('/api/truecaller', async (req, res) => {
    try {
        const { number } = req.query;
        
        if (!number || number.length < 10) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid phone number",
                message: "Please provide a valid 10-11 digit phone number"
            });
        }
        
        // نمبر فارمیٹ کرنا
        let cleanNumber = number.replace(/\D/g, '');
        
        // اگر 0 سے شروع ہو تو ہٹائیں
        if (cleanNumber.startsWith('0')) {
            cleanNumber = cleanNumber.substring(1);
        }
        
        // اگر پاکستانی نمبر ہے تو 92 جوڑیں
        if (cleanNumber.length === 10 && !cleanNumber.startsWith('92')) {
            cleanNumber = '92' + cleanNumber;
        }
        
        // Truecaller API کیلئے ہیڈرز
        const headers = {
            'User-Agent': TRUECALLER_USER_AGENT,
            'Accept': 'application/json',
            'Origin': 'https://truecalleranshapi.vercel.app',
            'Referer': 'https://truecalleranshapi.vercel.app/'
        };
        
        const apiUrl = `https://truecalleranshapi.vercel.app/truecaller?number=${cleanNumber}`;
        
        console.log('Calling Truecaller API:', apiUrl);
        
        const response = await axios.get(apiUrl, { 
            headers: headers,
            timeout: 10000 
        });
        
        if (response.data && typeof response.data === 'object') {
            const result = {
                success: true,
                name: response.data.name || null,
                sim: response.data.sim || null,
                raw: response.data
            };
            
            // اگر نام نہیں ملا تو success: false کریں
            if (!response.data.name || response.data.name.trim() === '') {
                result.success = false;
                result.message = "No name found in Truecaller database";
            }
            
            res.json(result);
        } else {
            res.json({
                success: false,
                message: "Invalid response from Truecaller API"
            });
        }
        
    } catch (error) {
        console.error('Truecaller API Error:', error.message);
        
        // Backup API try karein
        try {
            const cleanNumber = req.query.number.replace(/\D/g, '');
            const backupUrl = `https://drab-teal-bass-slip.cyclic.app/api/truecaller?number=${cleanNumber}`;
            
            const backupResponse = await axios.get(backupUrl, {
                timeout: 8000
            });
            
            if (backupResponse.data && backupResponse.data.name) {
                return res.json({
                    success: true,
                    name: backupResponse.data.name,
                    sim: backupResponse.data.sim || "Unknown",
                    source: "backup-api"
                });
            }
        } catch (backupError) {
            console.error('Backup API also failed:', backupError.message);
        }
        
        res.status(500).json({ 
            success: false,
            error: "Truecaller API Error", 
            message: "Could not fetch data from Truecaller. Please try again later."
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'DB Service PK API'
    });
});

module.exports = app;