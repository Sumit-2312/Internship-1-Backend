const express = require('express');
const axios = require('axios');
const { Router } = express;
const AccessTokenRouter = Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  if (!code) {
    return res.redirect(
      `${process.env.FE_URL}/error?error=${encodeURIComponent(error_description || 'User denied access')}`
    );
  }

  try {
    const shortTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
     
        client_id: process.env.APP_ID,
        redirect_uri: process.env.REDIRECT_URI,
        client_secret: process.env.APP_SECRET,
        code: code,
      
    });

    const shortLivedToken = shortTokenResponse.data.access_token;

    if (!shortLivedToken) {
      return res.redirect(
        `${process.env.FE_URL}/error?error=${encodeURIComponent('Failed to retrieve short-lived token')}`
      );
    }

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
