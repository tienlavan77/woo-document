import Model from '../model';

export default class PrintFileModel extends Model {
   constructor() {
      super();
      this.api = '/wp-json/tinsinhphat/v1';
      this.storageName = 'printFilesData';
      this.onlyLocal = true;
   }

   async getAssets({ page = 1, count = 24, search = '' } = {}) {
      const query = new URLSearchParams({ page, count });
      if (search) query.set('search', search);
      return this._httpGet(`${this.api}/print-files?${query.toString()}`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async getMaterials() {
      return this._httpGet(`${this.api}/print-materials`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async getPrintOptions() {
      return this._httpGet(`${this.api}/print-options`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async getTemplate(slug = 'print-template-A4') {
      // Template files are edited during development; avoid serving an older
      // response from a browser or reverse-proxy cache after a reload.
      const cacheBust = Date.now();
      return this._httpGet(`${this.api}/template/prints/${encodeURIComponent(slug)}?v=${cacheBust}`, {
         Authorization: `Bearer ${this._token}`,
         'X-TSP-Plugin-Request': 'document',
      });
   }

   async uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      return this._httpPost(`${this.api}/print-files/upload`, formData, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async getOrderJobs(orderId) {
      return this._httpGet(`${this.api}/orders/${encodeURIComponent(orderId)}/print-jobs`, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async createJob(orderId, data) {
      return this._httpPost(`${this.api}/orders/${encodeURIComponent(orderId)}/print-jobs`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async updateJob(jobId, data) {
      return this._httpPut(`${this.api}/print-jobs/${encodeURIComponent(jobId)}`, data, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async deleteAsset(assetId) {
      return this._httpDelete(`${this.api}/print-files/${encodeURIComponent(assetId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async deleteJob(jobId) {
      return this._httpDelete(`${this.api}/print-jobs/${encodeURIComponent(jobId)}`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

   async deletePrintTicket(jobId) {
      return this._httpDelete(`${this.api}/print-jobs/${encodeURIComponent(jobId)}/print-ticket`, {}, {
         Authorization: `Bearer ${this._token}`,
      });
   }

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
         cache: 'force-cache',
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
