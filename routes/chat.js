const express = require('express');
const { DatabaseManager } = require('../database/manager');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const db = new DatabaseManager();

// Get messages with pagination
router.get('/messages', verifyToken, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = db.getMessagesPaginated(page, limit);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
});

// Get contacts
router.get('/contacts', verifyToken, (req, res) => {
  try {
    const contacts = db.getContacts();
    
    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts'
    });
  }
});

// Add or update contact
router.post('/contacts', verifyToken, (req, res) => {
  try {
    const { phone, name, email, notes } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const contactData = {
      phone,
      name: name || '',
      email: email || '',
      notes: notes || ''
    };
    
    if (db.addContact(contactData)) {
      res.json({
        success: true,
        message: 'Contact saved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save contact'
      });
    }
  } catch (error) {
    console.error('Save contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save contact'
    });
  }
});

// Get chat statistics
router.get('/stats', verifyToken, (req, res) => {
  try {
    const messages = db.getMessages();
    const contacts = db.getContacts();
    
    // Calculate stats
    const totalMessages = messages.length;
    const receivedMessages = messages.filter(m => m.type === 'text' && m.from).length;
    const sentMessages = messages.filter(m => m.type === 'sent').length;
    const totalContacts = contacts.length;
    
    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = messages.filter(m => {
      const messageDate = new Date(m.received_at || m.created_at);
      return messageDate > oneDayAgo;
    });
    
    res.json({
      success: true,
      stats: {
        totalMessages,
        receivedMessages,
        sentMessages,
        totalContacts,
        recentMessages: recentMessages.length,
        lastMessageTime: messages.length > 0 ? messages[messages.length - 1].received_at || messages[messages.length - 1].created_at : null
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

// Search messages
router.get('/search', verifyToken, (req, res) => {
  try {
    const { query, from, type } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const messages = db.getMessages();
    
    const filteredMessages = messages.filter(message => {
      let matches = true;
      
      // Text search
      if (query) {
        const searchText = query.toLowerCase();
        const messageText = (message.text || '').toLowerCase();
        matches = matches && messageText.includes(searchText);
      }
      
      // Filter by sender
      if (from && matches) {
        matches = matches && message.from === from;
      }
      
      // Filter by type
      if (type && matches) {
        matches = matches && message.type === type;
      }
      
      return matches;
    });
    
    res.json({
      success: true,
      messages: filteredMessages.reverse(), // Latest first
      total: filteredMessages.length
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages'
    });
  }
});

module.exports = router;