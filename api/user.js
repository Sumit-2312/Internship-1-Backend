import express from 'express';
import axios from 'axios';
const UserRouter = express.Router();

UserRouter.get('/profile-info', async (req, res) => {
  const { userId, accessToken } = req.query;
  console.log('Received userId:', userId);

  // Validate that userId and accessToken are provided
  if (!userId || !accessToken) {
    return res.status(400).json({ error: 'userId and accessToken are required' });
  }

  try {
    // Request to Instagram Graph API for user profile info
    const userResponse = await axios.get(`https://graph.instagram.com/${userId}`, {
      params: {
        fields: 'id,username,name,email,picture,biography,followers_count,following_count,media_count,post_count',
        access_token: accessToken,
      },
    });

    console.log('User profile info:', userResponse.data);

    if(!userResponse.data) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the full profile data, media data, and tags
    return res.json({
      profileInfo: userResponse.data,
    });

  } catch (error) {
    console.error('Error fetching user profile info:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to fetch user profile info' });
  }
});

UserRouter.get('/media-info', async (req, res) => {
  const { userId, accessToken } = req.query;
  console.log('Received userId:', userId);

  // Validate that userId and accessToken are provided
  if (!userId || !accessToken) {
    return res.status(400).json({ error: 'userId and accessToken are required' });
  }

  try {
    // Request to Instagram Graph API for user media info
    const mediaResponse = await axios.get(`https://graph.instagram.com/${userId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp',
        access_token: accessToken,
      },
    });

    console.log('User media info:', mediaResponse.data);

    if(!mediaResponse.data) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Return the full media data
    return res.json({
      mediaInfo: mediaResponse.data,
    });

  } catch (error) {
    console.error('Error fetching user media info:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to fetch user media info' });
  }
});

export default UserRouter;
