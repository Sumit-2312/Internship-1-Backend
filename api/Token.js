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