const express = require('express');
const {Router} = express.Router;

const webhookRouter = Router();

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
app.post('/', (req, res) => {
    console.log('Webhook event received:', req.body);
    res.status(200).send('EVENT_RECEIVED');
});

export default webhookRouter;
