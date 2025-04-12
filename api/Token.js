import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('Url',req.url);
  console.log('Query',req.query);
  console.log('Code',code);
  console.log('Error Description',error_description);

  if (!code) {
    console.log('No code provided in the query parameters');
    return res.redirect(
      `${process.env.FE_URL}/error?error=${encodeURIComponent(error_description || 'User denied access')}`
    );
  }

  try {
    console.log('Code received:', code);
    console.log('Starting token exchange process...');  
    const shortTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.APP_ID,
        redirect_uri: process.env.REDIRECT_URI,
        client_secret: process.env.APP_SECRET,
        code: code,
      }
    });
    
    const shortLivedToken = shortTokenResponse.data.access_token;

    if (!shortLivedToken) {
      console.log('No short-lived token received from Facebook');
      console.log('Response data:', shortTokenResponse.data);
      return res.redirect(
        `${process.env.FE_URL}/error?error=${encodeURIComponent('Failed to retrieve short-lived token')}`
      );
    }

    console.log('Short-lived token received:', shortLivedToken);
    console.log('Exchanging short-lived token for long-lived token...');
    const longTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {

      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longTokenResponse.data.access_token;

    if (!longLivedToken) {
      console.log('No long-lived token received from Facebook');
      console.log('Response data:', longTokenResponse.data);
      return res.redirect(
        `${process.env.FE_URL}/error?error=${encodeURIComponent('Failed to retrieve long-lived token')}`
      );
    }

    res.redirect(
      `${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`
    );

  } catch (err) {

    console.error('Token flow failed:', err.message);

    const errorMessage = err.response?.data?.error?.message || 'Unexpected error during token exchange';

    res.redirect(`${process.env.FE_URL}/error?error=${encodeURIComponent(errorMessage)}`);
  }
});

export default AccessTokenRouter;
