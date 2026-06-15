// thêm model 
import Model from '../model';

export default class DocumentModel extends Model {
   constructor() {
      super();
      // Khởi tạo dữ liệu mặc định cho Document
      this.api = '/wp-json/tinsinhphat/v1/documents'; // API endpoint để lấy dữ liệu tài liệu
      this.storageName = 'documentsData'; // Tên khóa để lưu trữ trong LocalStorage
      this.onlyLocal = false; // Chỉ hiển thị tài liệu nội bộ
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

      // Gọi trực tiếp _httpGet để lấy dữ liệu mà không ghi đè vào this.data và localStorage của danh sách file
      return await this._httpGet(`${this.api}/files/${encodeURIComponent(slug)}`, {
         'Authorization': `Bearer ${this._token}`
      });
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
