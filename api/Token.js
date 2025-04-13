import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Users } from './db.js';  // Adjust if necessary

dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('Full URL:', req.url);
  console.log('Query Params:', req.query);
  console.log('Received Code:', code);

  if (!code) {
    return res.status(400).json({
      error: error_description || 'No code provided in the query parameters.',
    });
  }

  try {
    // Step 1: Get short-lived access token from Facebook
    console.log('Fetching short-lived access token from Facebook');
    const shortTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        client_secret: process.env.APP_SECRET,
        code,
      }
    });

    const shortLivedToken = shortTokenResponse.data.access_token;
    if (!shortLivedToken) {
      return res.status(500).json({
        error: 'Failed to retrieve short-lived token',
        response: shortTokenResponse.data,
      });
    }

    // Step 2: Exchange short-lived token for long-lived token
    const longTokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longTokenResponse.data.access_token;
    if (!longLivedToken) {
      return res.status(500).json({
        error: 'Failed to retrieve long-lived token',
        response: longTokenResponse.data,
      });
    }

    // Step 3a: Get Facebook user ID
    const fbUser = await axios.get(`https://graph.facebook.com/v18.0/me`, {
      params: {
        access_token: longLivedToken,
      }
    });

    const fbUserId = fbUser.data.id;
    console.log('Facebook User ID:', fbUserId);
    if (!fbUserId) {
      return res.status(400).json({ error: "Failed to retrieve Facebook user ID." });
    }
    // Step 3b: Get user's Facebook Pages
    const pages = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/accounts`, {
      params: {
        access_token: longLivedToken,
      }
    });

    if (!pages.data.data.length) {
      return res.status(400).json({ error: "No Facebook pages connected to this user." });
    }

    const page = pages.data.data[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    // Step 3c: Get Instagram Business Account ID
    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      }
    });

    const igUserId = igResponse.data.instagram_business_account?.id;
    if (!igUserId) {
      return res.status(400).json({ error: "No Instagram Business account linked to this Facebook Page." });
    }

    // Step 3d: Get Instagram user details
    const igDetails = await axios.get(`https://graph.facebook.com/v18.0/${igUserId}`, {
      params: {
        fields: 'id,username',
        access_token: pageAccessToken,
      }
    });

    const { id: instagramUserId, username } = igDetails.data;

    // Step 4: Check if user exists in DB
    let existingUser = await Users.findOne({ InstaId: instagramUserId });

    if (existingUser) {
      if (!existingUser.accessToken || existingUser.accessToken !== longLivedToken) {
        console.log('Updating access token...');
        existingUser.accessToken = longLivedToken;
        await existingUser.save();
      }

      return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);
    }

    // Step 5: Create new user in DB
    const newUser = await Users.create({
      userName: username,
      InstaId: instagramUserId,
      accessToken: longLivedToken,
    });

    console.log('New user created in DB:', newUser);

    // Step 6: Redirect to frontend with token
    return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);

  } catch (err) {
    console.error('Error during token exchange:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }

    return res.status(500).json({
      error: err.response?.data?.error?.message || 'Unexpected error during token exchange',
    });
  }
});

export default AccessTokenRouter;
