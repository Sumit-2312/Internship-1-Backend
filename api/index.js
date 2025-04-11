const express = require('express');
const  webhookRouter = require('./webhook');
const  AccessTokenRouter  = require('./Token');
const app  = express();
app.use(express.json());


app.use('/webhook',webhookRouter);
app.use('/accessToken',AccessTokenRouter);




app.listen(3000, () => {
    console.log('Webhook server is listening on port 3000');
});