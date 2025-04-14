import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { Users } from './db.js';

dotenv.config();

const AccessTokenRouter = express.Router();

AccessTokenRouter.get('/', async (req, res) => {
  const { code, error_description } = req.query;

  console.log('👉 Full URL:', req.url);
  console.log('👉 Query Params:', req.query);

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
    console.log('🔑 Short-Lived Token:', shortLivedToken);

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
    console.log('🔐 Long-Lived Token:', longLivedToken);

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
    console.log('🆔 FB User ID:', fbUserId);

    /** -------------------------
     * 🔎 STEP 3a.5: Debug Token
     -------------------------- */
    const debugResp = await axios.get(`https://graph.facebook.com/debug_token`, {
      params: {
        input_token: longLivedToken,
        access_token: `${process.env.CLIENT_ID}|${process.env.APP_SECRET}`,
      },
    });

    const grantedScopes = debugResp.data.data.scopes;
    console.log('🔍 Granted Scopes:', grantedScopes);

    if (!grantedScopes.includes('pages_show_list')) {
      return res.status(403).json({
        error: 'Missing required scope: pages_show_list',
        grantedScopes,
      });
    }

    /** -------------------------
     * 📄 STEP 3b: Get Pages
     -------------------------- */
    const pagesResp = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/accounts`, {
      params: { access_token: longLivedToken },
    });
    
    // Add more detailed logging
    console.log('📄 Pages Response:', JSON.stringify(pagesResp.data, null, 2));

    const pages = pagesResp.data.data || [];

    if (!pages.length) {
      // Check if user has any pages at all
      try {
        // Try getting user's permissions and roles directly
        const permissionsResp = await axios.get(`https://graph.facebook.com/v18.0/${fbUserId}/permissions`, {
          params: { access_token: longLivedToken },
        });
        
        console.log('👮‍♂️ User Permissions:', JSON.stringify(permissionsResp.data, null, 2));
        
        return res.status(400).json({
          error: 'No Facebook pages connected to this user.',
          debug: {
            fbUserId,
            grantedScopes,
            permissions: permissionsResp.data,
            suggestion: 'Make sure you are an admin of the Facebook page and have connected Instagram to the page.'
          },
        });
      } catch (permErr) {
        console.error('❌ Error getting permissions:', permErr.message);
        return res.status(400).json({
          error: 'No Facebook pages connected to this user.',
          debug: {
            fbUserId,
            grantedScopes,
            suggestion: 'Verify that you are an admin of a Facebook page and have connected an Instagram business account to it.'
          },
        });
      }
    }

    const page = pages[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    console.log('📘 Page ID:', pageId);
    console.log('🪪 Page Access Token:', pageAccessToken);

    /** -------------------------
     * 📸 STEP 3c: Get Instagram Account
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

    console.log('📷 Instagram Business Account ID:', igUserId);

    /** -------------------------
     * 👤 STEP 3d: Instagram Profile
     -------------------------- */
    const igDetails = await axios.get(`https://graph.facebook.com/v18.0/${igUserId}`, {
      params: {
        fields: 'id,username',
        access_token: pageAccessToken,
      },
    });

    const { id: instagramUserId, username } = igDetails.data;
    console.log('👤 Instagram Username:', username);

    /** -------------------------
     * 💾 STEP 4: Save to DB
     -------------------------- */
    let user = await Users.findOne({ InstaId: instagramUserId });

    if (user) {
      user.accessToken = longLivedToken;
      await user.save();
    } else {
      user = await Users.create({
        userName: username,
        InstaId: instagramUserId,
        accessToken: longLivedToken,
      });
    }

    /** -------------------------
     * 🌐 STEP 5: Redirect
     -------------------------- */
    return res.redirect(`${process.env.FE_URL}?token=${encodeURIComponent(longLivedToken)}`);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
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