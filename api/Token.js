import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Users } from './db.js';  // Adjust if necessary

dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('👉 Full URL:', req.url);
  console.log('👉 Query Params:', req.query);
  console.log('👉 Received Code:', code);

  console.log('\n🔍 ENVIRONMENT CONFIGURATION');
  console.log('✅ CLIENT_ID:', process.env.CLIENT_ID);
  console.log('✅ REDIRECT_URI:', process.env.REDIRECT_URI);
  console.log('✅ APP_SECRET:', process.env.APP_SECRET?.slice(0, 4) + '****');
  console.log('✅ FE_URL:', process.env.FE_URL);

  if (!code) {
    return res.status(400).json({
      error: error_description || 'No code provided in the query parameters.',
    });
  }

  try {
    // Step 1: Get short-lived access token from Facebook
    console.log('\n🚀 Requesting short-lived token from Facebook...');
    const shortTokenURL = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const shortTokenParams = {
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      client_secret: process.env.APP_SECRET,
      code,
    };
    console.log('🌐 Short Token Request URL:', shortTokenURL);
    console.log('📦 Params:', shortTokenParams);

    const shortTokenResponse = await axios.get(shortTokenURL, { params: shortTokenParams });
    const shortLivedToken = shortTokenResponse.data.access_token;

    console.log('🔑 Short-Lived Token:', shortLivedToken);

    if (!shortLivedToken) {
      return res.status(500).json({
        error: 'Failed to retrieve short-lived token',
        response: shortTokenResponse.data,
      });
    }

    // Step 2: Exchange short-lived token for long-lived token
    console.log('\n🔁 Exchanging for long-lived token...');
    const longTokenParams = {
      grant_type: 'fb_exchange_token',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.APP_SECRET,
      fb_exchange_token: shortLivedToken,
    };
    console.log('📦 Long Token Params:', longTokenParams);

    const longTokenResponse = await axios.get(shortTokenURL, { params: longTokenParams });
    const longLivedToken = longTokenResponse.data.access_token;

    console.log('🔐 Long-Lived Token:', longLivedToken);

    if (!longLivedToken) {
      return res.status(500).json({
        error: 'Failed to retrieve long-lived token',
        response: longTokenResponse.data,
      });
    }

    // Step 3a: Get Facebook user ID
    console.log('\n👤 Fetching Facebook user info...');
    const fbUser = await axios.get(`https://graph.facebook.com/v18.0/me`, {
      params: { access_token: longLivedToken },
    });

    const fbUserId = fbUser.data.id;
    console.log('🆔 Facebook User ID:', fbUserId);

    if (!fbUserId) {
      return res.status(400).json({ error: "Failed to retrieve Facebook user ID." });
    }

    // Step 3b: Get user's Facebook Pages
    console.log('\n📄 Fetching connected Facebook pages...');
    const pages = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/accounts`, {
      params: { access_token: longLivedToken },
    });

    if (!pages.data.data.length) {
      return res.status(400).json({ error: "No Facebook pages connected to this user." });
    }

    const page = pages.data.data[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    console.log('📘 Page ID:', pageId);
    console.log('🪪 Page Access Token:', pageAccessToken);

    // Step 3c: Get Instagram Business Account ID
    console.log('\n📸 Fetching Instagram Business Account...');
    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      }
    });

    const igUserId = igResponse.data.instagram_business_account?.id;
    console.log('📷 Instagram Business Account ID:', igUserId);

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
    console.log('👤 Instagram ID:', instagramUserId);
    console.log('👤 Instagram Username:', username);

    // Step 4: Check if user exists in DB
    let existingUser = await Users.findOne({ InstaId: instagramUserId });

    if (existingUser) {
      console.log('🟢 Existing user found');
      if (!existingUser.accessToken || existingUser.accessToken !== longLivedToken) {
        console.log('📝 Updating access token...');
        existingUser.accessToken = longLivedToken;
        await existingUser.save();
      }

      console.log('🔁 Redirecting to frontend with token...');
      return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);
    }

    // Step 5: Create new user in DB
    const newUser = await Users.create({
      userName: username,
      InstaId: instagramUserId,
      accessToken: longLivedToken,
    });

    console.log('🆕 New user created:', newUser);

    // Step 6: Redirect to frontend
    return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);

  } catch (err) {
    console.error('\n❌ Error during token exchange:', err.message);
    if (err.response) {
      console.error('⛔ Status:', err.response.status);
      console.error('🪵 Data:', err.response.data);
    }

    return res.status(500).json({
      error: err.response?.data?.error?.message || 'Unexpected error during token exchange',
    });
  }
});

export default AccessTokenRouter;
