import express from 'express';
import axios from 'axios';

const UserRouter = express.Router();

/** -------------------------------
 * 📄 GET: Instagram Profile Info
 -------------------------------- */
UserRouter.get('/profile-info', async (req, res) => {
  const { igUserId, pageAccessToken } = req.query;

  if (!igUserId || !pageAccessToken) {
    return res.status(400).json({ error: 'igUserId and pageAccessToken are required' });
  }

  try {
    const userResponse = await axios.get(`https://graph.facebook.com/v18.0/${igUserId}`, {
      params: {
        fields: 'id,username,biography,profile_picture_url,follows_count,followers_count,media_count',
        access_token: pageAccessToken,
      },
    });

    return res.json({ profileInfo: userResponse.data });
  } catch (error) {
    console.error('❌ Error fetching profile:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch profile info',
      details: error.response?.data || error.message
    });
  }
});

/** -------------------------------
 * 🖼️ GET: Instagram Media Info
 -------------------------------- */
UserRouter.get('/media-info', async (req, res) => {
  const { igUserId, pageAccessToken } = req.query;

  if (!igUserId || !pageAccessToken) {
    return res.status(400).json({ error: 'igUserId and pageAccessToken are required' });
  }

  try {
    const mediaResponse = await axios.get(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url,media_type}',
        access_token: pageAccessToken,
      },
    });

    return res.json({ mediaInfo: mediaResponse.data });
  } catch (error) {
    console.error('❌ Error fetching media:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch media info',
      details: error.response?.data || error.message
    });
  }
});

/** ------------------------------------
 * 💬 GET: Comments on Media Post
 ------------------------------------- */
UserRouter.get('/comments', async (req, res) => {
  const { mediaId, accessToken } = req.query;

  if (!mediaId || !accessToken) {
    return res.status(400).json({ error: 'mediaId and accessToken are required' });
  }

  try {
    const commentsResponse = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}/comments`, {
      params: {
        access_token: accessToken,
        fields: 'id,text,username,timestamp,comments{id,text,username,timestamp}',
      },
    });

    return res.json({ comments: commentsResponse.data.data });
  } catch (error) {
    console.error('❌ Error fetching comments:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to fetch comments',
      details: error.response?.data || error.message,
    });
  }
});

/** ------------------------------------
 * 💬 POST: Reply to a Comment
 ------------------------------------- */
UserRouter.post('/reply', async (req, res) => {
  const { commentId, message, accessToken } = req.body;

  if (!commentId || !message || !accessToken) {
    return res.status(400).json({ error: 'commentId, message and accessToken are required' });
  }

  try {
    const replyResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${commentId}/replies`,
      null,
      {
        params: {
          access_token: accessToken,
          message,
        },
      }
    );

    return res.status(200).json({
      success: true,
      replyId: replyResponse.data.id,
    });
  } catch (error) {
    console.error('❌ Error replying to comment:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to reply to comment',
      details: error.response?.data || error.message,
    });
  }
});

export default UserRouter;
