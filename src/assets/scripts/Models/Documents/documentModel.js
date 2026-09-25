// thêm model 
import Model from '../model';

export default class DocumentModel extends Model {
   constructor() {
      super();
      // Khởi tạo dữ liệu mặc định cho Document
      this.api = '/wp-json/tinsinhphat/v1/documents'; // API endpoint để lấy dữ liệu tài liệu
      this.storageName = 'documentsData'; // Tên khóa để lưu trữ trong LocalStorage
      // Model này chỉ dùng các method chuyên biệt (/files, /upload, ...),
      // không gọi GET mặc định vào endpoint gốc /documents.
      this.onlyLocal = true;
      this.fileDetailCache = new Map();
      this.fileDetailRequests = new Map();
      this.fileBlobCache = new Map();
      this.fileBlobRequests = new Map();
   }
   
   /**
    * Lấy danh sách file từ Server có phân trang
    * @param {number} page - Trang hiện tại
    * @param {number} count - Số lượng file mỗi trang
    */
   async getFiles(page = 1, count = 12) {
      // Gọi trực tiếp _httpGet để lấy danh sách mà không làm bẩn cache localStorage của model
      return await this._httpGet(`${this.api}/files?page=${page}&count=${count}`, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /**
    * Lấy thông tin chi tiết file từ Server
    * @param {string} path Đường dẫn tương đối của file (relative_path)
    * @returns {Promise} Phản hồi từ API chứa URL tuyệt đối
    */
   async getFileDetail(path) {
      // Loại bỏ phần đuôi .pdf (không phân biệt hoa thường) và chỉ lấy tên file nếu path là đường dẫn
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');

      if (this.fileDetailCache.has(path)) return this.fileDetailCache.get(path);
      if (this.fileDetailRequests.has(path)) return this.fileDetailRequests.get(path);

      // Gọi trực tiếp _httpGet để lấy dữ liệu mà không ghi đè vào this.data và localStorage của danh sách file
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

   /** Lấy trạng thái ba loại tài liệu của một order. */
   async getOrderDocuments(orderId) {
      return await this._httpGet(`${this.api}/orders/${encodeURIComponent(orderId)}`, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /**
    * Xây dựng URL stream file PDF. Request thực tế được gửi bằng JWT ở
    * getFileBlob() vì PDFObject không hỗ trợ custom Authorization header.
    * @param {string} path Đường dẫn tương đối của file (relative_path)
    */
   getStreamUrl(path, version = '') {
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');
      const query = version ? `?v=${encodeURIComponent(version)}` : '';
      return `${this.api}/stream/${encodeURIComponent(slug)}${query}`;
   }

   /**
    * Tải PDF bằng request có JWT để trình xem không cần gửi token trên URL.
    */
   async getFileBlob(path, version = '') {
      const cacheKey = `${path}|${version}`;
      if (this.fileBlobCache.has(cacheKey)) return this.fileBlobCache.get(cacheKey);
      if (this.fileBlobRequests.has(cacheKey)) return this.fileBlobRequests.get(cacheKey);

      const url = this.getStreamUrl(path, version);
      const nonce = document.querySelector('meta[name="wp-api-nonce"]')?.getAttribute('content') || '';
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
               // Response lỗi có thể không phải JSON.
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

   clearFileCache(path) {
      [...this.fileBlobCache.keys()]
         .filter((key) => key.startsWith(`${path}|`))
         .forEach((key) => this.fileBlobCache.delete(key));
      this.fileDetailCache.delete(path);
   }

   /**
    * Upload file lên server
    * @param {File} file Đối tượng File từ input/drag-drop
    */
   async uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      
      // Lưu ý: Không thêm 'Content-Type' vào đây. 
      // Trình duyệt sẽ tự động thêm multipart/form-data kèm boundary.
      return await this._httpPost(`${this.api}/upload`, formData, {
         'Authorization': `Bearer ${this._token}`
      });
   }
   async deleteFile(path) {
      const slug = path.split('/').pop().replace(/\.pdf$/i, '');
      return await this._httpDelete(`${this.api}/files/${slug}/delete`,{ path },{
         'Authorization': `Bearer ${this._token}`
      })
   }
   /**
    * Gán tài liệu cho danh sách đơn hàng
    * @param {Object} payload { relative_path, order_ids, doc_type }
    */
   async assignDocument(payload) {
      return await this._httpPost(`${this.api}/assign`, payload, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   /**
    * Gỡ gán tài liệu cho danh sách đơn hàng
    * @param {Object} payload { order_ids, doc_type }
    */
   async unassignDocument(payload) {
      return await this._httpDelete(`${this.api}/assign`, payload, {
         'Authorization': `Bearer ${this._token}`
      });
   }
}
