const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.whatsappConfigFile = path.join(this.dataDir, 'whatsapp_config.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');
    this.contactsFile = path.join(this.dataDir, 'contacts.json');
    
    this.initDatabase();
  }
  
  initDatabase() {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Initialize users file with default admin user
    if (!fs.existsSync(this.usersFile)) {
      const defaultUsers = [{
        id: '1',
        username: 'admin',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: 'admin',
        created_at: new Date().toISOString()
      }];
      this.writeFile(this.usersFile, defaultUsers);
    }
    
    // Initialize other files
    if (!fs.existsSync(this.whatsappConfigFile)) {
      this.writeFile(this.whatsappConfigFile, {});
    }
    
    if (!fs.existsSync(this.messagesFile)) {
      this.writeFile(this.messagesFile, []);
    }
    
    if (!fs.existsSync(this.contactsFile)) {
      this.writeFile(this.contactsFile, []);
    }
  }
  
  readFile(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }
  
  writeFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  }
  
  // User methods
  getUsers() {
    return this.readFile(this.usersFile) || [];
  }
  
  getUserByUsername(username) {
    const users = this.getUsers();
    return users.find(user => user.username === username);
  }
  
  addUser(userData) {
    const users = this.getUsers();
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    return this.writeFile(this.usersFile, users);
  }
  
  // WhatsApp configuration methods
  getWhatsAppConfig() {
    return this.readFile(this.whatsappConfigFile) || {};
  }
  
  saveWhatsAppConfig(config) {
    const existingConfig = this.getWhatsAppConfig();
    const updatedConfig = {
      ...existingConfig,
      ...config,
      updated_at: new Date().toISOString()
    };
    return this.writeFile(this.whatsappConfigFile, updatedConfig);
  }
  
  // Message methods
  getMessages() {
    return this.readFile(this.messagesFile) || [];
  }
  
  addMessage(messageData) {
    const messages = this.getMessages();
    const newMessage = {
      id: messageData.id || Date.now().toString(),
      ...messageData,
      created_at: new Date().toISOString()
    };
    messages.push(newMessage);
    
    // Keep only last 1000 messages to prevent file from growing too large
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }
    
    return this.writeFile(this.messagesFile, messages);
  }
  
  getMessagesPaginated(page = 1, limit = 50) {
    const messages = this.getMessages();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      messages: messages.slice(startIndex, endIndex).reverse(), // Latest first
      total: messages.length,
      page,
      totalPages: Math.ceil(messages.length / limit)
    };
  }
  
  // Contact methods
  getContacts() {
    return this.readFile(this.contactsFile) || [];
  }
  
  addContact(contactData) {
    const contacts = this.getContacts();
    const existingContact = contacts.find(c => c.phone === contactData.phone);
    
    if (existingContact) {
      // Update existing contact
      Object.assign(existingContact, contactData, { updated_at: new Date().toISOString() });
    } else {
      // Add new contact
      const newContact = {
        id: Date.now().toString(),
        ...contactData,
        created_at: new Date().toISOString()
      };
      contacts.push(newContact);
    }
    
    return this.writeFile(this.contactsFile, contacts);
  }
  
  getContactByPhone(phone) {
    const contacts = this.getContacts();
    return contacts.find(contact => contact.phone === phone);
  }
}

module.exports = { DatabaseManager };