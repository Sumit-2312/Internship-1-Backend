const express = require('express');
const bodyParser = require('body-parser');
// Initialize app
const app = express();
// Middleware for parsing request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Webhook verification route
app.get('/webhook', (req, res) => {
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
app.post('/webhook', (req, res) => {
    console.log('Webhook event received:', req.body);
    res.status(200).send('EVENT_RECEIVED');
});
// Export a more efficient serverless handler
// module.exports = serverless(app, {
//   binary: false // Set to false to improve performance if you don't need binary support
// });

app.listen(3000, () => {
    console.log('Webhook server is listening on port 3000');
});