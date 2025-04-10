import express from 'express';
// const serverless = require('serverless-http');
import serverless from 'serverless-http';
const app = express();

// Your secret token — make one up (Instagram uses it to check your server)
const VERIFY_TOKEN = "my_secret_token"; // you can change this

// Required for receiving POST requests (Instagram sends data this way)
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from the webhook endpoint!");
});

// GET endpoint for webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Later you’ll handle POSTs here
app.post('/webhook', (req, res) => {
  console.log("Webhook Event: ", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

module.exports.handler = serverless(app);
