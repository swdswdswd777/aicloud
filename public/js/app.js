// Global variables
let authToken = null;
let socket = null;
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        verifyToken();
    }
    
    // Set up event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Configuration form
    document.getElementById('config-form').addEventListener('submit', handleConfigSave);
    
    // Send message form
    document.getElementById('send-message-form').addEventListener('submit', handleSendMessage);
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username-input').value;
    const password = document.getElementById('password-input').value;
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showMainInterface();
            initializeSocket();
        } else {
            showError('login-error', data.message);
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showError('login-error', 'حدث خطأ في تسجيل الدخول');
    });
}

function verifyToken() {
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            showMainInterface();
            initializeSocket();
        } else {
            logout();
        }
    })
    .catch(error => {
        console.error('Token verification error:', error);
        logout();
    });
}

function showMainInterface() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-nav').style.display = 'block';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('username').textContent = currentUser.username;
    
    // Show dashboard by default
    showSection('dashboard');
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
    
    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('username-input').value = 'admin';
    document.getElementById('password-input').value = 'password';
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.style.display = 'none');
    
    // Show requested section
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'config':
            loadConfiguration();
            break;
        case 'chat':
            loadChat();
            break;
    }
}

function loadDashboard() {
    fetch('/api/chat/stats', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const stats = data.stats;
            document.getElementById('total-messages').textContent = stats.totalMessages;
            document.getElementById('received-messages').textContent = stats.receivedMessages;
            document.getElementById('sent-messages').textContent = stats.sentMessages;
            document.getElementById('total-contacts').textContent = stats.totalContacts;
        }
    })
    .catch(error => {
        console.error('Error loading dashboard:', error);
    });
}

function loadConfiguration() {
    fetch('/api/whatsapp/config', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.config) {
            const config = data.config;
            document.getElementById('app-id').value = config.app_id || '';
            document.getElementById('whatsapp-id').value = config.whatsapp_id || '';
            document.getElementById('whatsapp-business-id').value = config.whatsapp_business_id || '';
            document.getElementById('webhook-url').value = config.webhook_url || '';
            document.getElementById('verify-token').value = config.verify_token || '';
            
            // Update verification status
            if (config.webhook_verified) {
                document.getElementById('verification-status').innerHTML = 
                    '<span class="status-badge status-verified"><i class="fas fa-check"></i> تم التحقق بنجاح</span>';
            }
        }
    })
    .catch(error => {
        console.error('Error loading configuration:', error);
    });
}

function handleConfigSave(e) {
    e.preventDefault();
    
    const config = {
        app_id: document.getElementById('app-id').value,
        app_password: document.getElementById('app-password').value,
        whatsapp_id: document.getElementById('whatsapp-id').value,
        whatsapp_business_id: document.getElementById('whatsapp-business-id').value,
        webhook_url: document.getElementById('webhook-url').value,
        verify_token: document.getElementById('verify-token').value
    };
    
    fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('نجح', 'تم حفظ الإعدادات بنجاح', 'success');
        } else {
            showAlert('خطأ', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error saving configuration:', error);
        showAlert('خطأ', 'حدث خطأ في حفظ الإعدادات', 'error');
    });
}

function verifyWebhook() {
    fetch('/api/whatsapp/verify-webhook', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.verified) {
            document.getElementById('verification-status').innerHTML = 
                '<span class="status-badge status-verified"><i class="fas fa-check"></i> تم التحقق بنجاح</span>';
            showAlert('نجح', 'تم التحقق من الويب هوك بنجاح', 'success');
        } else {
            document.getElementById('verification-status').innerHTML = 
                '<span class="status-badge status-error"><i class="fas fa-times"></i> فشل التحقق</span>';
            showAlert('خطأ', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error verifying webhook:', error);
        showAlert('خطأ', 'حدث خطأ في التحقق من الويب هوك', 'error');
    });
}

function getProfile() {
    fetch('/api/whatsapp/profile', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const profile = data.profile;
            document.getElementById('profile-info').style.display = 'block';
            document.getElementById('profile-details').innerHTML = `
                <p><strong>الاسم:</strong> ${profile.name || 'غير محدد'}</p>
                <p><strong>المعرف:</strong> ${profile.id}</p>
                <p><strong>الحالة:</strong> ${profile.status || 'نشط'}</p>
            `;
            showAlert('نجح', 'تم جلب معلومات الحساب بنجاح', 'success');
        } else {
            showAlert('خطأ', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error getting profile:', error);
        showAlert('خطأ', 'حدث خطأ في جلب معلومات الحساب', 'error');
    });
}

function loadChat() {
    refreshMessages();
    loadContacts();
}

function refreshMessages() {
    fetch('/api/chat/messages', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayMessages(data.messages);
        }
    })
    .catch(error => {
        console.error('Error loading messages:', error);
    });
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.type === 'sent' ? 'sent' : 'received'}`;
        
        const time = new Date(message.timestamp || message.created_at).toLocaleString('ar-SA');
        
        messageDiv.innerHTML = `
            <div class="message-header">
                ${message.type === 'sent' ? 'أنت' : (message.from || 'مجهول')}
            </div>
            <div class="message-body">${message.text || message.message || ''}</div>
            <div class="message-time">${time}</div>
        `;
        
        container.appendChild(messageDiv);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function loadContacts() {
    fetch('/api/chat/contacts', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayContacts(data.contacts);
        }
    })
    .catch(error => {
        console.error('Error loading contacts:', error);
    });
}

function displayContacts(contacts) {
    const container = document.getElementById('contacts-list');
    container.innerHTML = '';
    
    if (contacts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">لا توجد جهات اتصال</p>';
        return;
    }
    
    contacts.forEach(contact => {
        const contactDiv = document.createElement('div');
        contactDiv.className = 'contact-item';
        contactDiv.onclick = () => selectContact(contact.phone);
        
        contactDiv.innerHTML = `
            <div><strong>${contact.name || contact.phone}</strong></div>
            <div class="text-muted small">${contact.phone}</div>
        `;
        
        container.appendChild(contactDiv);
    });
}

function selectContact(phone) {
    document.getElementById('recipient-phone').value = phone;
}

function handleSendMessage(e) {
    e.preventDefault();
    
    const to = document.getElementById('recipient-phone').value;
    const message = document.getElementById('message-text').value;
    
    fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ to, message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('send-message-form').reset();
            showAlert('نجح', 'تم إرسال الرسالة بنجاح', 'success');
            refreshMessages();
        } else {
            showAlert('خطأ', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showAlert('خطأ', 'حدث خطأ في إرسال الرسالة', 'error');
    });
}

function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join_chat', { user: currentUser.username });
    });
    
    socket.on('new_message', (messageData) => {
        console.log('New message received:', messageData);
        
        // Add to messages if chat section is active
        if (document.getElementById('chat-section').style.display !== 'none') {
            const container = document.getElementById('messages-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message received';
            
            const time = new Date(messageData.received_at).toLocaleString('ar-SA');
            
            messageDiv.innerHTML = `
                <div class="message-header">${messageData.from}</div>
                <div class="message-body">${messageData.text}</div>
                <div class="message-time">${time}</div>
            `;
            
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight;
        }
        
        // Show notification
        showAlert('رسالة جديدة', `رسالة من ${messageData.from}: ${messageData.text}`, 'info');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showAlert(title, message, type = 'info') {
    document.getElementById('alertModalTitle').textContent = title;
    document.getElementById('alertModalBody').textContent = message;
    
    const modal = new bootstrap.Modal(document.getElementById('alertModal'));
    modal.show();
}