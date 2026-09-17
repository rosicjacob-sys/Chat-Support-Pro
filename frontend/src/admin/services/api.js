
// const API_URL = import.meta.env.PROD 
//   ? import.meta.env.VITE_API_URL || 'https://chat-support-pro.onrender.com'
//   : '';

// class ApiService {
//   constructor() {
//     this.baseUrl = API_URL;
//   }

//   getToken() {
//     return localStorage.getItem('token');
//   }

//   handleUnauthorized() {
//     console.log('🚨 UNAUTHORIZED - Clearing session');
//     localStorage.removeItem('token');
//     localStorage.removeItem('employee');
//     sessionStorage.setItem('auth_error', 'Session expired. Please login again.');
//     window.location.reload();
//   }

//   async fetch(endpoint, options = {}) {
//     const method = (options.method || 'GET').toUpperCase();
//     let url = `${this.baseUrl}${endpoint}`;
//     if (method === 'GET') {
//       url += (url.includes('?') ? '&' : '?') + `_=${Date.now()}`;
//     }

//     const token = this.getToken();

//     const defaultOptions = {
//       cache: 'no-store', // never read or write the HTTP cache for this request
//       headers: {
//         'Content-Type': 'application/json',
//         ...(token && { 'Authorization': `Bearer ${token}` }),
//         ...options.headers,
//       },
//     };

//     try {
//       const response = await fetch(url, { ...defaultOptions, ...options });
      
//       if (response.status === 401) {
//         this.handleUnauthorized();
//         throw new Error('Session expired. Please login again.');
//       }

//       if (response.status === 403) {
//         throw new Error('Access denied. You do not have permission.');
//       }
      
//       if (!response.ok) {
//         const error = await response.json().catch(() => ({ error: 'Request failed' }));
//         throw new Error(error.error || error.message || 'API request failed');
//       }

//       return await response.json();
//     } catch (error) {
//       console.error('API Error:', error);
//       throw error;
//     }
//   }

//   async uploadFile(formData, onUploadProgress) {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       const url = `${this.baseUrl}/api/files/upload`;
//       const token = this.getToken();

//       if (onUploadProgress) {
//         xhr.upload.addEventListener('progress', (e) => {
//           if (e.lengthComputable) {
//             onUploadProgress({ loaded: e.loaded, total: e.total });
//           }
//         });
//       }

//       xhr.addEventListener('load', () => {
//         if (xhr.status === 200 || xhr.status === 201) {
//           try {
//             resolve(JSON.parse(xhr.responseText));
//           } catch (error) {
//             reject(new Error('Failed to parse upload response'));
//           }
//         } else if (xhr.status === 401) {
//           this.handleUnauthorized();
//           reject(new Error('Session expired. Please login again.'));
//         } else {
//           try {
//             const error = JSON.parse(xhr.responseText);
//             reject(new Error(error.message || error.error || 'File upload failed'));
//           } catch (e) {
//             reject(new Error('File upload failed'));
//           }
//         }
//       });

//       xhr.addEventListener('error', () => reject(new Error('Network error during file upload')));
//       xhr.addEventListener('abort', () => reject(new Error('File upload was cancelled')));

//       xhr.open('POST', url);
//       if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
//       xhr.send(formData);
//     });
//   }

//   async deleteFile(fileName) {
//     return this.fetch(`/api/files/${fileName}`, { method: 'DELETE' });
//   }

//   // ============ Authentication ============

//   async login(email, password) {
//     return this.fetch('/api/employees/login', {
//       method: 'POST',
//       body: JSON.stringify({ email, password }),
//     });
//   }

//   async logout() {
//     try {
//       await this.fetch('/api/employees/logout', { method: 'POST' });
//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       localStorage.removeItem('token');
//       localStorage.removeItem('employee');
//     }
//   }

//   async verifyToken() {
//     return this.fetch('/api/auth/verify');
//   }

//   // ============ Conversations ============

//   // async getConversations(filters = {}) {
//   //   const params = new URLSearchParams(filters).toString();
//   //   return this.fetch(`/api/conversations${params ? '?' + params : ''}`);
//   // }

//   async getConversations(filters = {}) {
//   const params = new URLSearchParams(filters).toString();
//   return this.fetch(`/api/conversations${params ? '?' + params : ''}`);
// }

// async searchConversations({ q, storeGroup, storeId } = {}) {
//     const params = new URLSearchParams({ q });
//     if (storeGroup) params.set('storeGroup', storeGroup);
//     if (storeId)    params.set('storeId', storeId);
//     return this.fetch(`/api/conversations/search?${params}`);
//   }
  
//   async getConversation(id) {
//     return this.fetch(`/api/conversations/${id}`);
//   }

//   async createConversation(data) {
//     return this.fetch('/api/conversations', {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   async updateConversation(id, updates) {
//     return this.fetch(`/api/conversations/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(updates),
//     });
//   }

//   async closeConversation(id) {
//     return this.fetch(`/api/conversations/${id}/close`, { method: 'PUT' });
//   }

//   async markConversationRead(id) {
//     return this.fetch(`/api/conversations/${id}/read`, { method: 'PUT' });
//   }

//   async markConversationUnread(id) {
//     return this.fetch(`/api/conversations/${id}/unread`, { method: 'PUT' });
//   }

//   // ============ Archive ============

//   async archiveConversation(id) {
//     return this.fetch(`/api/conversations/${id}/archive`, { method: 'PATCH' });
//   }

//   async unarchiveConversation(id) {
//     return this.fetch(`/api/conversations/${id}/unarchive`, { method: 'PATCH' });
//   }

//   async getArchivedConversations({ page = 1, limit = 30, storeIdentifier } = {}) {
//     const params = new URLSearchParams({ page, limit });
//     if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
//     return this.fetch(`/api/conversations/archived?${params}`);
//   }

//   // ============ Blacklist ============

//   async blacklistCustomer({ email, storeIdentifier, allStores = false, reason, customerName }) {
//     return this.fetch('/api/blacklist', {
//       method: 'POST',
//       body: JSON.stringify({ email, storeIdentifier, allStores, reason, customerName }),
//     });
//   }

//   async getBlacklist({ page = 1, limit = 50, storeIdentifier, email } = {}) {
//     const params = new URLSearchParams({ page, limit });
//     if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
//     if (email)           params.set('email', email);
//     return this.fetch(`/api/blacklist?${params}`);
//   }

//   async removeFromBlacklist(blacklistId) {
//   return this.fetch(`/api/blacklist/${blacklistId}`, { method: 'DELETE' });
// }

//   // async removeBlacklistEntry(blacklistId) {
//   //   return this.fetch(`/api/blacklist/${blacklistId}`, { method: 'DELETE' });
//   // }

//   async checkBlacklist(email, storeIdentifier) {
//     const params = new URLSearchParams({ email });
//     if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
//     return this.fetch(`/api/blacklist/check?${params}`);
//   }

//   // ============ Cross-Store History ============

//   async getLinkedConversations(email, excludeConversationId = null) {
//     const params = excludeConversationId
//       ? `?excludeConversationId=${excludeConversationId}`
//       : '';
//     return this.fetch(
//       `/api/conversations/linked/${encodeURIComponent(email)}${params}`
//     );
//   }

//   // ============ Messages ============

//   async getMessages(conversationId) {
//     return this.fetch(`/api/conversations/${conversationId}/messages`);
//   }

//   async sendMessage(data) {
//     return this.fetch('/api/messages', {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   async deleteMessage(messageId) {
//     return this.fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
//   }

//   // ============ Stores ============

//   // async getStores() {
//   //   return this.fetch('/api/stores');
//   // }

//   // async getStore(id) {
//   //   return this.fetch(`/api/stores/${id}`);
//   // }
//   async getStores(filters = {}) {
//     const params = new URLSearchParams(filters).toString();
//     return this.fetch(`/api/stores${params ? '?' + params : ''}`);
//   }

//   async getStore(id) {
//     return this.fetch(`/api/stores/${id}`);
//   }

//   async getStoreGroups() {
//     return this.fetch('/api/stores/groups');
//   }

//   async createStoreGroup({ groupKey, groupName, color }) {
//     return this.fetch('/api/stores/groups', {
//       method: 'POST',
//       body: JSON.stringify({ groupKey, groupName, color }),
//     });
//   }

//   // Groups are identified by their key (slug) everywhere in the UI — there is no
//   // numeric group id in StoreManagement.jsx. These signatures match the call
//   // sites: api.updateStoreGroup({ groupKey, ... }) and api.deleteStoreGroup(key).
//   async updateStoreGroup({ groupKey, groupName, color }) {
//     return this.fetch(`/api/stores/groups/${encodeURIComponent(groupKey)}`, {
//       method: 'PUT',
//       body: JSON.stringify({ groupKey, groupName, color }),
//     });
//   }

//   async deleteStoreGroup(groupKey, { force = false } = {}) {
//     return this.fetch(
//       `/api/stores/groups/${encodeURIComponent(groupKey)}${force ? '?force=true' : ''}`,
//       { method: 'DELETE' }
//     );
//   }
//   // ============ Customer Context ============

//   async getCustomerContext(storeId, email) {
//     return this.fetch(`/api/customer-context/${storeId}/${encodeURIComponent(email)}`);
//   }

//   async getCustomerById(id, storeId) {
//     return this.fetch(`/api/customers/${id}/context?storeId=${storeId}`);
//   }

//   // ============ Stats ============

//   async getDashboardStats(filters = {}) {
//     const params = new URLSearchParams(filters).toString();
//     return this.fetch(`/api/stats/dashboard${params ? '?' + params : ''}`);
//   }

//   async getWebSocketStats() {
//     return this.fetch('/api/stats/websocket');
//   }

//   async getTeamResponseStats() {
//     return this.fetch('/api/stats/response-times/team');
//   }

//   async getConversationResponseStats(conversationId) {
//     return this.fetch(`/api/conversations/${conversationId}/response-stats`);
//   }

//   async triggerDiscordReport() {
//   return this.fetch('/api/stats/discord-report/trigger', { method: 'POST' });
// }

//   async triggerDailyDiscordReport() {
//     return this.fetch('/api/stats/discord-daily-report/trigger', { method: 'POST' });
//   }
  
//   // ============ Employees ============

//   async getEmployees() {
//     return this.fetch('/api/employees');
//   }

//   async getEmployee(email) {
//     return this.fetch(`/api/employees/${encodeURIComponent(email)}`);
//   }

//   async getEmployeeById(id) {
//     return this.fetch(`/api/employees/${id}`);
//   }

//   async createEmployee(data) {
//     return this.fetch('/api/employees', {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   async updateEmployee(id, data) {
//     return this.fetch(`/api/employees/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(data),
//     });
//   }

//   async deleteEmployee(id) {
//     return this.fetch(`/api/employees/${id}`, { method: 'DELETE' });
//   }

//   async updateEmployeeStatus(id, status) {
//     return this.fetch(`/api/employees/${id}/status`, {
//       method: 'PUT',
//       body: JSON.stringify({ status }),
//     });
//   }

//   async updateNotesOrder(employeeId, order) {
//     return this.fetch(`/api/employees/${employeeId}/notes-order`, {
//       method: 'PATCH',
//       body: JSON.stringify({ order }),
//     });
//   }

//   // ============ Message Templates ============

//   async getTemplates() {
//     return this.fetch('/api/templates');
//   }

//   async createTemplate(data) {
//     return this.fetch('/api/templates', {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   async updateTemplate(id, data) {
//     return this.fetch(`/api/templates/${id}`, {
//       method: 'PUT',
//       body: JSON.stringify(data),
//     });
//   }

//   async deleteTemplate(id) {
//     return this.fetch(`/api/templates/${id}`, { method: 'DELETE' });
//   }

//   // ============ Conversation Notes ============

//   async getConversationNotes(conversationId) {
//     return this.fetch(`/api/conversations/${conversationId}/notes`);
//   }

//   async getEmployeeNotes(employeeId) {
//     return this.fetch(`/api/employees/${employeeId}/notes`);
//   }

//   async createNote(data) {
//     return this.fetch('/api/conversation-notes', {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   async deleteNote(noteId) {
//     return this.fetch(`/api/conversation-notes/${noteId}`, { method: 'DELETE' });
//   }

//   // ============ Email ============

//   async sendEmail({ to, subject, body, conversationId, customerName }) {
//     return this.fetch('/api/email/send', {
//       method: 'POST',
//       body: JSON.stringify({ to, subject, body, conversationId, customerName }),
//     });
//   }

//   // ============ Promo Email Blast ============

// async getPromoRecipients({ storeIds = 'all' } = {}) {
//   const value  = Array.isArray(storeIds) ? storeIds.join(',') : storeIds;
//   const params = new URLSearchParams({ storeIds: value });
//   return this.fetch(`/api/promo/recipients?${params}`);
// }
 
// async sendPromoBlast(payload) {
//   return this.fetch('/api/promo/send', {
//     method: 'POST',
//     body:   JSON.stringify(payload),
//   });
// }
 
// async recordPromoSent({ emails, discountCode }) {
//   return this.fetch('/api/promo/record-sent', {
//     method: 'POST',
//     body:   JSON.stringify({ emails, discountCode }),
//   });
// }
 
// async getPromoSent() {
//   return this.fetch('/api/promo/sent');
// }

//   // ============ AI Training / Brain ============

//   async getBrain() {
//     return this.fetch('/api/ai/training/brain');
//   }

//   async searchBrain(query, { perCategory = 8, totalCap = 30 } = {}) {
//     const params = new URLSearchParams({ q: query, perCategory, totalCap });
//     return this.fetch(`/api/ai/training/brain-search?${params}`);
//   }

//   async clearBrainCache() {
//     return this.fetch('/api/ai/brain-cache/clear', { method: 'POST' });
//   }
  
//   // ============ Health Check ============

//   async healthCheck() {
//     return this.fetch('/health');
//   }
// }

// export default new ApiService();





const API_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_URL || 'https://chat-support-pro.onrender.com'
  : '';

class ApiService {
  constructor() {
    this.baseUrl = API_URL;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  handleUnauthorized() {
    console.log('🚨 UNAUTHORIZED - Clearing session');
    localStorage.removeItem('token');
    localStorage.removeItem('employee');
    sessionStorage.setItem('auth_error', 'Session expired. Please login again.');
    window.location.reload();
  }

  async fetch(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    let url = `${this.baseUrl}${endpoint}`;
    if (method === 'GET') {
      url += (url.includes('?') ? '&' : '?') + `_=${Date.now()}`;
    }

    const token = this.getToken();

    const defaultOptions = {
      cache: 'no-store', // never read or write the HTTP cache for this request
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      // options is spread FIRST and headers is set explicitly from the merged
      // object above. The old order ({ ...defaultOptions, ...options }) let a
      // caller's `headers` replace the whole object, dropping Content-Type and
      // the bearer token.
      const response = await fetch(url, {
        ...options,
        ...defaultOptions,
        method,
        headers: defaultOptions.headers,
      });
      
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. You do not have permission.');
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      // A cancelled request is not a failure. Callers that pass an AbortSignal
      // would otherwise log on every superseded keystroke or filter change.
      if (error?.name !== 'AbortError') console.error('API Error:', error);
      throw error;
    }
  }

  async uploadFile(formData, onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseUrl}/api/files/upload`;
      const token = this.getToken();

      if (onUploadProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onUploadProgress({ loaded: e.loaded, total: e.total });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else if (xhr.status === 401) {
          this.handleUnauthorized();
          reject(new Error('Session expired. Please login again.'));
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || error.error || 'File upload failed'));
          } catch (e) {
            reject(new Error('File upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during file upload')));
      xhr.addEventListener('abort', () => reject(new Error('File upload was cancelled')));

      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async deleteFile(fileName) {
    return this.fetch(`/api/files/${fileName}`, { method: 'DELETE' });
  }

  // ============ Authentication ============

  async login(email, password) {
    return this.fetch('/api/employees/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    try {
      await this.fetch('/api/employees/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('employee');
    }
  }

  async verifyToken() {
    return this.fetch('/api/auth/verify');
  }

  // ============ Conversations ============

  // async getConversations(filters = {}) {
  //   const params = new URLSearchParams(filters).toString();
  //   return this.fetch(`/api/conversations${params ? '?' + params : ''}`);
  // }

  async getConversations(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return this.fetch(`/api/conversations${params ? '?' + params : ''}`);
}

async searchConversations({ q, storeGroup, storeId } = {}) {
    const params = new URLSearchParams({ q });
    if (storeGroup) params.set('storeGroup', storeGroup);
    if (storeId)    params.set('storeId', storeId);
    return this.fetch(`/api/conversations/search?${params}`);
  }
  
  async getConversation(id) {
    return this.fetch(`/api/conversations/${id}`);
  }

  async createConversation(data) {
    return this.fetch('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConversation(id, updates) {
    return this.fetch(`/api/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async closeConversation(id) {
    return this.fetch(`/api/conversations/${id}/close`, { method: 'PUT' });
  }

  async markConversationRead(id) {
    return this.fetch(`/api/conversations/${id}/read`, { method: 'PUT' });
  }

  async markConversationUnread(id) {
    return this.fetch(`/api/conversations/${id}/unread`, { method: 'PUT' });
  }

  // ============ Archive ============

  async archiveConversation(id) {
    return this.fetch(`/api/conversations/${id}/archive`, { method: 'PATCH' });
  }

  async unarchiveConversation(id) {
    return this.fetch(`/api/conversations/${id}/unarchive`, { method: 'PATCH' });
  }

  async getArchivedConversations({ page = 1, limit = 30, storeIdentifier } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
    return this.fetch(`/api/conversations/archived?${params}`);
  }

  // ============ Blacklist ============

  async blacklistCustomer({ email, storeIdentifier, allStores = false, reason, customerName }) {
    return this.fetch('/api/blacklist', {
      method: 'POST',
      body: JSON.stringify({ email, storeIdentifier, allStores, reason, customerName }),
    });
  }

  async getBlacklist({ page = 1, limit = 50, storeIdentifier, email } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
    if (email)           params.set('email', email);
    return this.fetch(`/api/blacklist?${params}`);
  }

  async removeFromBlacklist(blacklistId) {
  return this.fetch(`/api/blacklist/${blacklistId}`, { method: 'DELETE' });
}

  // async removeBlacklistEntry(blacklistId) {
  //   return this.fetch(`/api/blacklist/${blacklistId}`, { method: 'DELETE' });
  // }

  async checkBlacklist(email, storeIdentifier) {
    const params = new URLSearchParams({ email });
    if (storeIdentifier) params.set('storeIdentifier', storeIdentifier);
    return this.fetch(`/api/blacklist/check?${params}`);
  }

  // ============ Cross-Store History ============

  async getLinkedConversations(email, excludeConversationId = null) {
    const params = excludeConversationId
      ? `?excludeConversationId=${excludeConversationId}`
      : '';
    return this.fetch(
      `/api/conversations/linked/${encodeURIComponent(email)}${params}`
    );
  }

  // ============ Orders (Shopify) ============

  // Returns { connected, customerFound, orders: [...] }. `connected: false` means
  // the store never completed the Shopify install — a normal state to render,
  // not an error to throw on.
  async getOrders(storeId, email) {
    return this.fetch(`/api/orders/${encodeURIComponent(storeId)}/${encodeURIComponent(email)}`);
  }

  // ============ Messages ============

  async getMessages(conversationId) {
    return this.fetch(`/api/conversations/${conversationId}/messages`);
  }

  async sendMessage(data) {
    return this.fetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMessage(messageId) {
    return this.fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
  }

  // ============ Stores ============

  // async getStores() {
  //   return this.fetch('/api/stores');
  // }

  // async getStore(id) {
  //   return this.fetch(`/api/stores/${id}`);
  // }
  async getStores(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.fetch(`/api/stores${params ? '?' + params : ''}`);
  }

  async getStore(id) {
    return this.fetch(`/api/stores/${id}`);
  }

  async getStoreGroups() {
    return this.fetch('/api/stores/groups');
  }

  async createStoreGroup({ groupKey, groupName, color }) {
    return this.fetch('/api/stores/groups', {
      method: 'POST',
      body: JSON.stringify({ groupKey, groupName, color }),
    });
  }

  // Groups are identified by their key (slug) everywhere in the UI — there is no
  // numeric group id in StoreManagement.jsx. These signatures match the call
  // sites: api.updateStoreGroup({ groupKey, ... }) and api.deleteStoreGroup(key).
  async updateStoreGroup({ groupKey, groupName, color }) {
    return this.fetch(`/api/stores/groups/${encodeURIComponent(groupKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ groupKey, groupName, color }),
    });
  }

  async deleteStoreGroup(groupKey, { force = false } = {}) {
    return this.fetch(
      `/api/stores/groups/${encodeURIComponent(groupKey)}${force ? '?force=true' : ''}`,
      { method: 'DELETE' }
    );
  }
  // ============ Customer Context ============

  async getCustomerContext(storeId, email) {
    return this.fetch(`/api/customer-context/${storeId}/${encodeURIComponent(email)}`);
  }

  async getCustomerById(id, storeId) {
    return this.fetch(`/api/customers/${id}/context?storeId=${storeId}`);
  }

  // ============ Stats ============

  async getDashboardStats(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.fetch(`/api/stats/dashboard${params ? '?' + params : ''}`);
  }

  async getWebSocketStats() {
    return this.fetch('/api/stats/websocket');
  }

  async getTeamResponseStats() {
    return this.fetch('/api/stats/response-times/team');
  }

  async getConversationResponseStats(conversationId) {
    return this.fetch(`/api/conversations/${conversationId}/response-stats`);
  }

  async triggerDiscordReport() {
  return this.fetch('/api/stats/discord-report/trigger', { method: 'POST' });
}

  async triggerDailyDiscordReport() {
    return this.fetch('/api/stats/discord-daily-report/trigger', { method: 'POST' });
  }
  
  // ============ Employees ============

  async getEmployees() {
    return this.fetch('/api/employees');
  }

  async getEmployee(email) {
    return this.fetch(`/api/employees/${encodeURIComponent(email)}`);
  }

  async getEmployeeById(id) {
    return this.fetch(`/api/employees/${id}`);
  }

  async createEmployee(data) {
    return this.fetch('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id, data) {
    return this.fetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id) {
    return this.fetch(`/api/employees/${id}`, { method: 'DELETE' });
  }

  async updateEmployeeStatus(id, status) {
    return this.fetch(`/api/employees/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateNotesOrder(employeeId, order) {
    return this.fetch(`/api/employees/${employeeId}/notes-order`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    });
  }

  // ============ Message Templates ============

  async getTemplates() {
    return this.fetch('/api/templates');
  }

  async createTemplate(data) {
    return this.fetch('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id, data) {
    return this.fetch(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id) {
    return this.fetch(`/api/templates/${id}`, { method: 'DELETE' });
  }

  // ============ Conversation Notes ============

  async getConversationNotes(conversationId) {
    return this.fetch(`/api/conversations/${conversationId}/notes`);
  }

  async getEmployeeNotes(employeeId) {
    return this.fetch(`/api/employees/${employeeId}/notes`);
  }

  async createNote(data) {
    return this.fetch('/api/conversation-notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(noteId) {
    return this.fetch(`/api/conversation-notes/${noteId}`, { method: 'DELETE' });
  }

  // ============ Email ============

  async sendEmail({ to, subject, body, conversationId, customerName }) {
    return this.fetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, body, conversationId, customerName }),
    });
  }

  // ============ Promo Email Blast ============

async getPromoRecipients({ storeIds = 'all' } = {}) {
  const value  = Array.isArray(storeIds) ? storeIds.join(',') : storeIds;
  const params = new URLSearchParams({ storeIds: value });
  return this.fetch(`/api/promo/recipients?${params}`);
}
 
async sendPromoBlast(payload) {
  return this.fetch('/api/promo/send', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}
 
async recordPromoSent({ emails, discountCode }) {
  return this.fetch('/api/promo/record-sent', {
    method: 'POST',
    body:   JSON.stringify({ emails, discountCode }),
  });
}
 
async getPromoSent() {
  return this.fetch('/api/promo/sent');
}

async getPromoSettings() {
  return this.fetch('/api/promo/settings');
}

async updatePromoSettings({ dailyCap }) {
  return this.fetch('/api/promo/settings', {
    method: 'PUT',
    body:   JSON.stringify({ dailyCap }),
  });
}

async applyPromoDomainUpdates({ pairs }) {
  return this.fetch('/api/promo/domain-updates/apply', {
    method: 'POST',
    body:   JSON.stringify({ pairs }),
  });
}

// Multipart upload (CSV/XLSX) — can't go through fetch() above, which forces
// a JSON Content-Type; the browser needs to set its own multipart boundary.
async uploadPromoRecipients(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${this.baseUrl}/api/promo/uploads/parse`;
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (error) {
          reject(new Error('Failed to parse upload response'));
        }
      } else if (xhr.status === 401) {
        this.handleUnauthorized();
        reject(new Error('Session expired. Please login again.'));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || error.error || 'Upload failed'));
        } catch (e) {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

  // ============ AI Training / Brain ============

  async getBrain() {
    return this.fetch('/api/ai/training/brain');
  }

  async searchBrain(query, { perCategory = 8, totalCap = 30 } = {}) {
    const params = new URLSearchParams({ q: query, perCategory, totalCap });
    return this.fetch(`/api/ai/training/brain-search?${params}`);
  }

  async clearBrainCache() {
    return this.fetch('/api/ai/brain-cache/clear', { method: 'POST' });
  }

  // ============ QA Automation (admin only) ============
  // Every route is admin-gated server-side; a non-admin gets a 403, which
  // this.fetch turns into 'Access denied. You do not have permission.'
  // `signal` is passed through so callers can cancel superseded requests.

  async getQaHealth({ signal } = {}) {
    return this.fetch('/api/qa/health', { signal });
  }

  async getQaRules({ signal } = {}) {
    return this.fetch('/api/qa/rules', { signal });
  }

  async getQaOverview({ days = 14, dateFrom, dateTo, signal } = {}) {
    const params = new URLSearchParams({ days });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo)   params.set('dateTo', dateTo);
    return this.fetch(`/api/qa/overview?${params}`, { signal });
  }

  async getQaLeaderboard({ days = 14, signal } = {}) {
    return this.fetch(`/api/qa/leaderboard?days=${days}`, { signal });
  }

  async getQaViolations({ days = 14, agentId, signal } = {}) {
    const params = new URLSearchParams({ days });
    if (agentId) params.set('agentId', agentId);
    return this.fetch(`/api/qa/violations?${params}`, { signal });
  }

  async getQaReviews({
    days = 14, page = 1, limit = 25, sort = 'recent',
    agentId, grade, criticalOnly, q, ruleId, storeId, signal,
  } = {}) {
    const params = new URLSearchParams({ days, page, limit, sort });
    if (agentId)      params.set('agentId', agentId);
    if (grade)        params.set('grade', grade);
    if (criticalOnly) params.set('criticalOnly', 'true');
    if (q)            params.set('q', q);
    if (ruleId)       params.set('ruleId', ruleId);
    if (storeId)      params.set('storeId', storeId);
    return this.fetch(`/api/qa/reviews?${params}`, { signal });
  }

  async getQaReview(id) {
    return this.fetch(`/api/qa/reviews/${id}`);
  }

  async regradeQaReview(id, { useAi = true } = {}) {
    return this.fetch(`/api/qa/reviews/${id}/regrade`, {
      method: 'POST',
      body: JSON.stringify({ useAi }),
    });
  }

  async deleteQaReview(id) {
    return this.fetch(`/api/qa/reviews/${id}`, { method: 'DELETE' });
  }

  async checkQaDraft({ text, customerMessage = null, useAi = false }) {
    return this.fetch('/api/qa/check', {
      method: 'POST',
      body: JSON.stringify({ text, customerMessage, useAi }),
    });
  }

  // Returns 409 when a scan is already running on another instance — that
  // arrives here as a thrown Error carrying the server's message.
  async runQaScan({ hours = 24, limit = 100, useAi = true, agentId, storeGroup } = {}) {
    return this.fetch('/api/qa/scan', {
      method: 'POST',
      body: JSON.stringify({ hours, limit, useAi, agentId, storeGroup }),
    });
  }
  
  // ============ Health Check ============

  async healthCheck() {
    return this.fetch('/health');
  }
}

export default new ApiService();