import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const webhookRouter = express.Router();

webhookRouter.use(express.json());
// Webhook verification route
webhookRouter.get('/', (req, res) => {
    const VERIFY_TOKEN = "my_secret_token";
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verified');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Forbidden');
        }
    }
});
// Endpoint to handle POST requests from Facebook
webhookRouter.post('/', (req, res) => {
    console.log('Webhook event received:', req.body);
    res.status(200).send('EVENT_RECEIVED');
});

// Deauthorization Callback
app.post('/webhooks/deauthorize', (req, res) => {
    const user_id = req.body.user_id;
    console.log(`User deauthorized: ${user_id}`);

    // TODO: Delete user data from your database
    // db.deleteUserData(user_id);

    res.sendStatus(200); // Required response
});

// Data Deletion Callback
app.post('/webhooks/delete-data', (req, res) => {
    const signedRequest = req.body.signed_request;

    // Verify and decode signed request (optional but recommended)
    const payload = parseSignedRequest(signedRequest, 'YOUR_APP_SECRET');

    const user_id = payload.user_id;
    console.log(`Data deletion requested by user: ${user_id}`);

    // TODO: Delete user data from your database
    // db.deleteUserData(user_id);

    const confirmation_code = `delete_${user_id}_${Date.now()}`;
    const url = `https://yourdomain.com/data_deletion_status/${confirmation_code}`;

    res.json({
        url, // Optionally provide this to let user check deletion status
        confirmation_code,
    });
});

// Optional: helper function to verify the signed request
function parseSignedRequest(signedRequest, appSecret) {
    const [encodedSig, payload] = signedRequest.split('.');
    const crypto = require('crypto');
    const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    if (encodedSig !== expectedSig) {
        throw new Error('Invalid signature');
    }

    const decodedPayload = Buffer.from(payload, 'base64').toString();
    return JSON.parse(decodedPayload);
}

export default webhookRouter;
