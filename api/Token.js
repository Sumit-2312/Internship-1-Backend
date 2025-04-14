import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Users } from './db.js';

dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  // Log the full URL and query parameters for debugging
  console.log('👉 Full URL:', req.url);
  console.log('👉 Query Params:', req.query);

  // Ensure the code parameter is provided in the request
  if (!code) {
    return res.status(400).json({
      error: error_description || 'No code provided in the query parameters.',
    });
  }

  try {
    /** -------------------------
     * 🔐 STEP 1: Short-lived Token
     -------------------------- */
    const shortTokenResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        client_secret: process.env.APP_SECRET,
        code,
      },
    });

    const shortLivedToken = shortTokenResp.data.access_token;
    if (!shortLivedToken) {
      return res.status(500).json({ error: 'Could not retrieve short-lived token.' });
    }

    /** -------------------------
     * 🔄 STEP 2: Exchange for Long-lived Token
     -------------------------- */
    const longTokenResp = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longTokenResp.data.access_token;
    if (!longLivedToken) {
      return res.status(500).json({ error: 'Could not retrieve long-lived token.' });
    }

    /** -------------------------
     * 🔎 STEP 3a: Get /me Info
     -------------------------- */
    const fbUserResp = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: { access_token: longLivedToken },
    });

    const fbUserId = fbUserResp.data.id;
    if (!fbUserId) {
      return res.status(500).json({ error: 'Could not retrieve Facebook User ID.' });
    }

    /** -------------------------
     * 🔎 STEP 3b: Debug Token (Check for required permissions)
     -------------------------- */
    const debugResp = await axios.get(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: longLivedToken,
        access_token: `${process.env.CLIENT_ID}|${process.env.APP_SECRET}`,
      },
    });

    const grantedScopes = debugResp.data.data.scopes;
    if (!grantedScopes.includes('pages_show_list')) {
      return res.status(403).json({
        error: 'Missing required scope: pages_show_list',
        grantedScopes,
      });
    }

    /** -------------------------
     * 📄 STEP 3c: Get Facebook Pages
     -------------------------- */
    const pagesResp = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/accounts`, {
      params: { access_token: longLivedToken },
    });

    const pages = pagesResp.data.data || [];
    if (!pages.length) {
      return res.status(400).json({
        error: 'No Facebook pages connected to this user.',
        debug: {
          fbUserId,
          grantedScopes,
          suggestion: 'Make sure you are an admin of the Facebook page and have connected Instagram to the page.',
        },
      });
    }

    const page = pages[0]; // Select the first page if multiple pages exist
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    /** -------------------------
     * 📸 STEP 3d: Get Instagram Business Account
     -------------------------- */
    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      },
    });

    const igUserId = igResponse.data.instagram_business_account?.id;
    if (!igUserId) {
      return res.status(400).json({ error: 'No Instagram Business account linked to this Facebook Page.' });
    }

    /** -------------------------
     * 👤 STEP 3e: Get Instagram Profile Details
     -------------------------- */
    const igDetails = await axios.get(`https://graph.facebook.com/v18.0/${igUserId}`, {
      params: {
        fields: 'id,username',
        access_token: pageAccessToken,
      },
    });

    const { id: instagramUserId, username } = igDetails.data;
    if (!instagramUserId || !username) {
      return res.status(500).json({ error: 'Failed to retrieve Instagram user details.' });
    }

    /** -------------------------
     * 💾 STEP 4: Save to DB
     -------------------------- */
    let user = await Users.findOne({ InstaId: instagramUserId });

    if (user) {
      user.accessToken = longLivedToken; // Update access token if user exists
      await user.save();
    } else {
      // Create a new user entry if none exists
      user = await Users.create({
        userName: username,
        InstaId: instagramUserId,
        accessToken: longLivedToken,
      });
    }

    /** -------------------------
     * 🌐 STEP 5: Redirect to Frontend
     -------------------------- */
    return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('⛔ Status:', err.response.status);
      console.error('🪵 Data:', JSON.stringify(err.response.data, null, 2));
    }

    return res.status(500).json({
      error: err.response?.data?.error?.message || 'Unexpected error during token exchange.',
    });
  }
});

export default AccessTokenRouter;
