import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('=== Incoming Request ===');
  console.log('Full URL:', req.url);
  console.log('Query Params:', req.query);
  console.log('Received Code:', code);
  console.log('Error Description (if any):', error_description);
  console.log('========================');

  if (!code) {
    console.log('🚫 No code received. Possibly user denied access.');
    return res.status(400).json({
      error: error_description || 'No code provided in the query parameters.',
    });
  }

  // Log environment variables
  console.log('=== Environment Variables ===');
  console.log('CLIENT_ID:', process.env.CLIENT_ID);
  console.log('APP_SECRET:', process.env.APP_SECRET?.slice(0, 4) + '...');
  console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
  console.log('FE_URL:', process.env.FE_URL);
  console.log('==============================');

  try {
    console.log('🔄 Requesting short-lived access token from Facebook...');

    const shortTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        client_secret: process.env.APP_SECRET,
        code,
      }
    });

    console.log('✅ Short token response:', shortTokenResponse.data);

    const shortLivedToken = shortTokenResponse.data.access_token;

    if (!shortLivedToken) {
      console.log('🚫 No short-lived token received. Something went wrong.');
      return res.status(500).json({
        error: 'Failed to retrieve short-lived token',
        response: shortTokenResponse.data,
      });
    }

    console.log('🎉 Short-lived token received:', shortLivedToken);
    console.log('🔄 Exchanging short-lived token for long-lived token...');

    const longTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    console.log('✅ Long token response:', longTokenResponse.data);

    const longLivedToken = longTokenResponse.data.access_token;

    if (!longLivedToken) {
      console.log('🚫 No long-lived token received.');
      return res.status(500).json({
        error: 'Failed to retrieve long-lived token',
        response: longTokenResponse.data,
      });
    }

    console.log('🎉 Long-lived token received:', longLivedToken);
    console.log('✅ Redirecting to FE with token...');

    return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);

  } catch (err) {
    console.log('❌ Error during token exchange process');
    console.error('Axios Error Message:', err.message);

    if (err.response) {
      console.error('Axios Response Status:', err.response.status);
      console.error('Axios Response Data:', err.response.data);
    }

    const errorMessage = err.response?.data?.error?.message || 'Unexpected error during token exchange';

    return res.status(500).json({ error: errorMessage });
  }
});

export default AccessTokenRouter;
