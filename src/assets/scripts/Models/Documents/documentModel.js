// Provides module implementation and exported declarations for documentModel.js.
import Model from '../model';

// Defines DocumentModel class behavior for documentModel.js.
export default class DocumentModel extends Model {
   // Defines constructor method behavior for documentModel.js.
   constructor() {
      super();
      // Executes documented symbol logic in documentModel.js.
      this.api = '/wp-json/tinsinhphat/v1/documents'; // API endpoint để lấy dữ liệu tài liệu
      this.storageName = 'documentsData'; // Tên khóa để lưu trữ trong LocalStorage
      // Executes documented symbol logic in documentModel.js.
      this.onlyLocal = true;
      this.fileDetailCache = new Map();
      this.fileDetailRequests = new Map();
      this.fileBlobCache = new Map();
      this.fileBlobRequests = new Map();
   }
   
   /* Executes documented symbol logic in documentModel.js. */
   async getFiles(page = 1, count = 12) {
      // Executes documented symbol logic in documentModel.js.
      return await this._httpGet(`${this.api}/files?page=${page}&count=${count}`, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /* Executes documented symbol logic in documentModel.js. */
   async getFileDetail(path) {
      // Executes documented symbol logic in documentModel.js.
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');

      if (this.fileDetailCache.has(path)) return this.fileDetailCache.get(path);
      if (this.fileDetailRequests.has(path)) return this.fileDetailRequests.get(path);

      // Executes documented symbol logic in documentModel.js.
      const request = this._httpGet(`${this.api}/files/${encodeURIComponent(slug)}`, {
         'Authorization': `Bearer ${this._token}`
      }).then((response) => {
         this.fileDetailRequests.delete(path);
         if (response?.status?.code === 200) this.fileDetailCache.set(path, response);
         return response;
      }).catch((error) => {
         this.fileDetailRequests.delete(path);
         throw error;
      });
      this.fileDetailRequests.set(path, request);
      return request;
   }

   /* Executes documented symbol logic in documentModel.js. */
   async getOrderDocuments(orderId) {
      return await this._httpGet(`${this.api}/orders/${encodeURIComponent(orderId)}`, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /* Executes documented symbol logic in documentModel.js. */
   getStreamUrl(path, version = '') {
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');
      const query = version ? `?v=${encodeURIComponent(version)}` : '';
      return `${this.api}/stream/${encodeURIComponent(slug)}${query}`;
   }

   /* Executes documented symbol logic in documentModel.js. */
   async getFileBlob(path, version = '') {
      const cacheKey = `${path}|${version}`;
      if (this.fileBlobCache.has(cacheKey)) return this.fileBlobCache.get(cacheKey);
      if (this.fileBlobRequests.has(cacheKey)) return this.fileBlobRequests.get(cacheKey);

      const url = this.getStreamUrl(path, version);
      const nonce = window.DocumentPluginConfig?.nonce || '';
      const headers = {
         'Authorization': `Bearer ${this._token}`,
         'X-TSP-Plugin-Request': 'document'
      };

      if (nonce) headers['X-WP-Nonce'] = nonce;

      const request = fetch(url, {
         method: 'GET',
         credentials: 'same-origin',
         cache: 'force-cache',
         headers
      }).then(async (response) => {
         if (!response.ok) {
            let message = `Không thể tải tài liệu (${response.status}).`;
            try {
               const data = await response.json();
               message = data.message || data.code || message;
            } catch (error) {
               // Executes documented symbol logic in documentModel.js.
            }
            throw new Error(message);
         }

         const blob = await response.blob();
         this.fileBlobRequests.delete(cacheKey);
         this.fileBlobCache.set(cacheKey, blob);
         return blob;
      }).catch((error) => {
         this.fileBlobRequests.delete(cacheKey);
         throw error;
      });
      this.fileBlobRequests.set(cacheKey, request);
      return request;
   }

   // Defines clearFileCache method behavior for documentModel.js.
   clearFileCache(path) {
      [...this.fileBlobCache.keys()]
         .filter((key) => key.startsWith(`${path}|`))
         .forEach((key) => this.fileBlobCache.delete(key));
      this.fileDetailCache.delete(path);
   }

   /* Executes documented symbol logic in documentModel.js. */
   async uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      
      // Executes documented symbol logic in documentModel.js.
      return await this._httpPost(`${this.api}/upload`, formData, {
         'Authorization': `Bearer ${this._token}`
      });
   }
   // Defines deleteFile method behavior for documentModel.js.
   async deleteFile(path) {
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');
      return await this._httpDelete(`${this.api}/files/${slug}/delete`,{ path },{
         'Authorization': `Bearer ${this._token}`
      })
   }
   /* Executes documented symbol logic in documentModel.js. */
   async assignDocument(payload) {
      return await this._httpPost(`${this.api}/assign`, payload, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /* Executes documented symbol logic in documentModel.js. */
   async unassignDocument(payload) {
      return await this._httpDelete(`${this.api}/assign`, payload, {
         'Authorization': `Bearer ${this._token}`
      });
   }
}
