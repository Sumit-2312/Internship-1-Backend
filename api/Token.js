import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Users } from './db.js';  // Ensure this is the correct path
dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('Full URL:', req.url);
  console.log('Query Params:', req.query);
  console.log('Received Code:', code);

  if (!code) {
    console.log('No code received, user may have denied access.');
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

    // Step 3: Fetch Instagram user ID and username
    const userResponse = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username',
        access_token: longLivedToken,
      },
    });

    const { id: instagramUserId, username } = userResponse.data;

    // Step 4: Check if user exists in DB
    let existingUser = await Users.findOne({ InstaId: instagramUserId });

    if (existingUser) {
      // If reconnect triggered but user exists without valid token
      if (!existingUser.accessToken || existingUser.accessToken !== longLivedToken) {
        console.log('Updating access token...');
        existingUser.accessToken = longLivedToken;
        await existingUser.save();
      }
    
      // Always redirect with fresh token
      return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);
    }
    

    // Step 5: Store new user in DB
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
