require('dotenv').config();
const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// statische Dateien (Index, CSS, JS, Bilder)
app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const ENV = process.env.PAYPAL_ENV || 'sandbox';

const PAYPAL_BASE =
    ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

// Access Token holen
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('PayPal token error:', errText);
        throw new Error('Could not get PayPal access token');
    }

    const data = await res.json();
    return data.access_token;
}

// PayPal Order anlegen
app.post('/api/paypal/create-order', async (req, res) => {
    try {
        const { total, orderNumber, minecraftName, discordName } = req.body;
        if (!total) return res.status(400).json({ error: 'Missing total' });

        const accessToken = await getPayPalAccessToken();

        const body = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: orderNumber || 'ARCADESMP',
                    amount: {
                        currency_code: 'EUR',
                        value: total
                    },
                    description: `ArcadeSMP Store for ${minecraftName || 'unknown'} (${discordName || ''})`
                }
            ],
            application_context: {
                brand_name: 'ArcadeSMP Store',
                user_action: 'PAY_NOW',
                return_url: 'http://localhost:3000/paypal-success.html',
                cancel_url: 'http://localhost:3000/paypal-cancel.html'
            }
        };

        const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await orderRes.json();
        if (!orderRes.ok) {
            console.error('PayPal create order error:', data);
            return res.status(500).json({ error: 'Failed to create PayPal order' });
        }

        const approveLink = data.links && data.links.find(l => l.rel === 'approve');
        if (!approveLink) {
            return res.status(500).json({ error: 'No approve link from PayPal' });
        }

        res.json({ id: data.id, approvalUrl: approveLink.href });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// optional: Erfolg/Cancel Seiten simple statisch
app.get('/paypal-success.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8">
        <title>PayPal Success</title>
        <style>
            body{font-family:sans-serif;background:#020617;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;}
            .box{padding:20px 24px;border-radius:12px;background:#0b1120;border:1px solid #22c55e;text-align:center;max-width:360px;}
            a{color:#60a5fa;}
        </style>
        </head>
        <body>
            <div class="box">
                <h2>Payment erfolgreich 🎉</h2>
                <p>Du kannst das Fenster schließen und zurück zum Shop gehen.</p>
                <a href="/">Zurück zum Shop</a>
            </div>
        </body></html>
    `);
});

app.get('/paypal-cancel.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html><head><meta charset="utf-8">
        <title>PayPal Cancel</title>
        <style>
            body{font-family:sans-serif;background:#020617;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;}
            .box{padding:20px 24px;border-radius:12px;background:#0b1120;border:1px solid #f97316;text-align:center;max-width:360px;}
            a{color:#60a5fa;}
        </style>
        </head>
        <body>
            <div class="box">
                <h2>Payment abgebrochen</h2>
                <p>Deine PayPal-Zahlung wurde nicht abgeschlossen.</p>
                <a href="/">Zurück zum Shop</a>
            </div>
        </body></html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ArcadeSMP server running at http://localhost:${PORT}`);
});
