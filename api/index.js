import express from 'express';
import webhookRouter from './webhook.js';
import AccessTokenRouter from './Token.js';
const app  = express();
app.use(express.json());


app.use('/webhook',webhookRouter);
app.use('/accessToken',AccessTokenRouter);




app.listen(3000, () => {
    console.log('Webhook server is listening on port 3000');
});