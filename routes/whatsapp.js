const express = require('express');
const axios = require('axios');
const { DatabaseManager } = require('../database/manager');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const db = new DatabaseManager();

// Get WhatsApp configuration
router.get('/config', verifyToken, (req, res) => {
  try {
    const config = db.getWhatsAppConfig();
    
    // Don't send sensitive information like passwords
    const safeConfig = {
      ...config,
      app_password: config.app_password ? '********' : '',
      webhook_token: config.webhook_token ? '********' : ''
    };
    
    res.json({
      success: true,
      config: safeConfig
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration'
    });
  }
});

// Save WhatsApp configuration
router.post('/config', verifyToken, (req, res) => {
  try {
    const {
      app_id,
      app_password,
      whatsapp_id,
      whatsapp_business_id,
      webhook_url,
      webhook_token,
      verify_token
    } = req.body;
    
    const config = {
      app_id,
      app_password,
      whatsapp_id,
      whatsapp_business_id,
      webhook_url,
      webhook_token,
      verify_token,
      configured_by: req.user.username
    };
    
    if (db.saveWhatsAppConfig(config)) {
      res.json({
        success: true,
        message: 'Configuration saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save configuration'
      });
    }
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save configuration'
    });
  }
});

// Verify webhook
router.post('/verify-webhook', verifyToken, async (req, res) => {
  try {
    const config = db.getWhatsAppConfig();
    
    if (!config.webhook_url || !config.verify_token) {
      return res.status(400).json({
        success: false,
        message: 'Webhook URL and verify token must be configured first'
      });
    }
    
    // Try to verify webhook by making a GET request
    try {
      const verifyUrl = `${config.webhook_url}?hub.mode=subscribe&hub.verify_token=${config.verify_token}&hub.challenge=test_challenge`;
      const response = await axios.get(verifyUrl, { timeout: 10000 });
      
      if (response.status === 200 && response.data === 'test_challenge') {
        // Update config to mark as verified
        config.webhook_verified = true;
        config.webhook_verified_at = new Date().toISOString();
        db.saveWhatsAppConfig(config);
        
        res.json({
          success: true,
          message: 'Webhook verified successfully',
          verified: true
        });
      } else {
        res.json({
          success: false,
          message: 'Webhook verification failed - invalid response',
          verified: false
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `Webhook verification failed: ${error.message}`,
        verified: false
      });
    }
  } catch (error) {
    console.error('Verify webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify webhook'
    });
  }
});

// Get WhatsApp Business profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const config = db.getWhatsAppConfig();
    
    if (!config.app_id || !config.app_password || !config.whatsapp_business_id) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp configuration is incomplete'
      });
    }
    
    try {
      // Get access token first
      const tokenResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
        params: {
          client_id: config.app_id,
          client_secret: config.app_password,
          grant_type: 'client_credentials'
        }
      });
      
      const accessToken = tokenResponse.data.access_token;
      
      // Get business profile
      const profileResponse = await axios.get(`https://graph.facebook.com/v17.0/${config.whatsapp_business_id}`, {
        params: {
          access_token: accessToken
        }
      });
      
      res.json({
        success: true,
        profile: profileResponse.data
      });
      
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      res.status(400).json({
        success: false,
        message: `Failed to fetch profile: ${error.response?.data?.error?.message || error.message}`
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Send test message
router.post('/send-message', verifyToken, async (req, res) => {
  try {
    const { to, message } = req.body;
    const config = db.getWhatsAppConfig();
    
    if (!config.app_id || !config.app_password || !config.whatsapp_id) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp configuration is incomplete'
      });
    }
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }
    
    try {
      // Get access token
      const tokenResponse = await axios.get(`https://graph.facebook.com/oauth/access_token`, {
        params: {
          client_id: config.app_id,
          client_secret: config.app_password,
          grant_type: 'client_credentials'
        }
      });
      
      const accessToken = tokenResponse.data.access_token;
      
      // Send message
      const messageResponse = await axios.post(
        `https://graph.facebook.com/v17.0/${config.whatsapp_id}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Store sent message
      const messageData = {
        id: messageResponse.data.messages[0].id,
        to: to,
        message: message,
        type: 'sent',
        timestamp: new Date().toISOString()
      };
      
      db.addMessage(messageData);
      
      res.json({
        success: true,
        message: 'Message sent successfully',
        messageId: messageResponse.data.messages[0].id
      });
      
    } catch (error) {
      console.error('Send message error:', error.response?.data || error.message);
      res.status(400).json({
        success: false,
        message: `Failed to send message: ${error.response?.data?.error?.message || error.message}`
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

module.exports = router;