import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import webhookRouter from './webhook.js';
import AccessTokenRouter from './Token.js';
import mongoose from 'mongoose';
import UserRouter from './user.js';
const app  = express();
app.use(express.json());
app.use(cors());

async function main(){
   await mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

    
    app.use('/',AccessTokenRouter);
    app.use('/webhook',webhookRouter);
    app.use('/accessToken',AccessTokenRouter);
    app.use('/user',UserRouter);
    
    app.listen(3000, () => {
        console.log('Webhook server is listening on port 3000');
    });


}

main();