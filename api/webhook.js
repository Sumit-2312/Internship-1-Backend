const express = require('express');
const serverless = require('serverless-http');
const app = express();

// Your secret token - make sure this EXACTLY matches what you entered in Facebook
const VERIFY_TOKEN = "my_secret_token";

// Required for receiving POST requests
app.use(express.json());

// Add detailed logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Query params:', req.query);
  next();
});

app.get("/", (req, res) => {
  res.send("Hello from the webhook endpoint!");
});

// GET endpoint for webhook verification
app.get('/webhook', (req, res) => {
  console.log("Webhook verification request received");
  console.log("Full query:", req.query);
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log(`Mode: ${mode}, Token: ${token}, Challenge: ${challenge}`);
  console.log(`Expected token: ${VERIFY_TOKEN}`);

  // Check if all required parameters are present
  if (!mode || !token || !challenge) {
    console.log("Missing required parameters");
    return res.status(400).send('Missing parameters');
  }
  
  // Perform verification
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  } else {
    console.log("Verification failed");
    return res.status(403).send('Verification failed');
  }
});

// POST handler
app.post('/webhook', (req, res) => {
  console.log("Webhook Event: ", JSON.stringify(req.body, null, 2));
  res.status(200).send('EVENT_RECEIVED');
});

// Catch-all route in case Facebook is hitting a different path
app.all('*', (req, res) => {
  console.log(`Unhandled request: ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  res.status(404).send('Not found');
});

module.exports = app;
module.exports.handler = serverless(app);