// Provides module declarations and business logic for printFileModel.js.

import Model from '../model';

// Defines PrintFileModel class behavior for printFileModel.js.
export default class PrintFileModel extends Model {
   // Defines constructor method behavior for printFileModel.js.
   constructor() {
      super();
      this.api = '/wp-json/tinsinhphat/v1';
      this.storageName = 'printFilesData';
      this.onlyLocal = true;
   }

   // Defines getAssets method behavior for printFileModel.js.
   async getAssets({ page = 1, count = 24, search = '' } = {}) {
      const query = new URLSearchParams({ page, count });
      if (search) query.set('search', search);
      return this._httpGet(`${this.api}/print-files?${query.toString()}`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines getMaterials method behavior for printFileModel.js.
   async getMaterials() {
      return this._httpGet(`${this.api}/print-materials`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines getPrintOptions method behavior for printFileModel.js.
   async getPrintOptions() {
      return this._httpGet(`${this.api}/print-options`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines getTemplate method behavior for printFileModel.js.
   async getTemplate(slug = 'print-template-A4') {
      // Template files are edited during development; avoid serving an older
      // response from a browser or reverse-proxy cache after a reload.
      const cacheBust = Date.now();
      return this._httpGet(`${this.api}/template/prints/${encodeURIComponent(slug)}?v=${cacheBust}`, {
         Authorization: `Bearer ${this._token}`,
         'X-TSP-Plugin-Request': 'document',
      });
   }

   // Defines uploadFile method behavior for printFileModel.js.
   async uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      return this._httpPost(`${this.api}/print-files/upload`, formData, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines getOrderJobs method behavior for printFileModel.js.
   async getOrderJobs(orderId) {
      return this._httpGet(`${this.api}/orders/${encodeURIComponent(orderId)}/print-jobs`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines createJob method behavior for printFileModel.js.
   async createJob(orderId, data) {
      return this._httpPost(`${this.api}/orders/${encodeURIComponent(orderId)}/print-jobs`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines createProductTicket method behavior for printFileModel.js.
   async createProductTicket(orderId, data) {
      return this._httpPost(`${this.api}/orders/${encodeURIComponent(orderId)}/product-tickets`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines detachAsset method behavior for printFileModel.js.
   async detachAsset(orderId, assetId) {
      return this._httpDelete(`${this.api}/orders/${encodeURIComponent(orderId)}/print-files/${encodeURIComponent(assetId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines updateJob method behavior for printFileModel.js.
   async updateJob(jobId, data) {
      return this._httpPut(`${this.api}/print-jobs/${encodeURIComponent(jobId)}`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines updateProductTicket method behavior for printFileModel.js.
   async updateProductTicket(ticketId, data) {
      return this._httpPut(`${this.api}/product-tickets/${encodeURIComponent(ticketId)}`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines deleteAsset method behavior for printFileModel.js.
   async deleteAsset(assetId) {
      return this._httpDelete(`${this.api}/print-files/${encodeURIComponent(assetId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines deleteJob method behavior for printFileModel.js.
   async deleteJob(jobId) {
      return this._httpDelete(`${this.api}/print-jobs/${encodeURIComponent(jobId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines deleteProductTicket method behavior for printFileModel.js.
   async deleteProductTicket(ticketId) {
      return this._httpDelete(`${this.api}/product-tickets/${encodeURIComponent(ticketId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines deletePrintTicket method behavior for printFileModel.js.
   async deletePrintTicket(jobId) {
      return this._httpDelete(`${this.api}/print-jobs/${encodeURIComponent(jobId)}/print-ticket`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   // Defines getBlob method behavior for printFileModel.js.
   async getBlob(url, expectedType = '') {
      const nonce = document.querySelector('meta[name="wp-api-nonce"]')?.getAttribute('content') || '';
      const headers = {
         Authorization: `Bearer ${this._token}`,
         'X-TSP-Plugin-Request': 'document',
      };
      if (nonce) headers['X-WP-Nonce'] = nonce;

      const response = await fetch(url, {
         method: 'GET',
         credentials: 'same-origin',
         cache: 'no-store',
         headers,
      });
      if (!response.ok) throw new Error(`Không thể tải file (${response.status}).`);
      const contentType = response.headers.get('content-type') || '';
      if (expectedType && !contentType.toLowerCase().startsWith(expectedType.toLowerCase())) {
         throw new Error('Server không trả về thumbnail hợp lệ.');
      }
      return response.blob();
   }
}
