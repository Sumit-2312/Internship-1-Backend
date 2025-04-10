const express = require('express');
const serverless = require('serverless-http');
const app = express();

// Your secret token
const VERIFY_TOKEN = "my_secret_token";

// Required for receiving POST requests
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from the webhook endpoint!");
});

// GET endpoint for webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log("mode: ", mode);
  console.log("token: ", token);
  console.log("challenge: ", challenge);
  console.log("VERIFY_TOKEN: ", VERIFY_TOKEN);

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST handler
app.post('/webhook', (req, res) => {
  console.log("Webhook Event: ", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

module.exports = app;
module.exports.handler = serverless(app);