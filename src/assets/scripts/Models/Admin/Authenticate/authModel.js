import Model from '../../model';
import StorageManager from '../../../Vendor/helpers/storageManager';

export default class AuthModel extends Model {
   constructor() {
      super();
      // Endpoint API xử lý login (Backend cần tạo một REST Route tương ứng)
      this.api = '/wp-json/tinsinhphat/v1/auth/login'; 
      this.storageName = '_token'; // Tên key sẽ lưu trong LocalStorage
      this.onlyLocal = true; 
   }

   /**
    * Gửi request đăng nhập và lưu token
    */
   async login(username , password, remember) {
      try {
         // Sử dụng hàm _httpPost từ class Model mẹ của bạn
         const response = await this._httpPost(this.api, {
            username , password, remember
         });
        
         // Giả định API trả về: { status: { code: 200, data: { token: "eyJhbGci..." } } }
         if (response && response.status && response.status.data && response.status.data.token) {
            // 1. Gán token vào data của Model
            
            this.data = response.status.data.token;
            
            // 2. Kích hoạt hàm saveLocal() của Model mẹ để ghi xuống LocalStorage
            this.saveLocal();
          
            return { success: true, token: this.data };
         }

         return { success: false, message: response?.status?.message || "Đăng nhập thất bại" };
         
      } catch (error) {
         console.error("[AuthModel] Lỗi kết nối đăng nhập:", error);
         return { success: false, message: "Lỗi kết nối đến máy chủ." };
      }
   }

   /**
    * Xóa token khỏi LocalStorage khi đăng xuất
    */
   logout() {
      this.data = null;
      // Giả định StorageManager của bạn có hàm remove (hoặc delete)
      return this._deleteStorage()
   }

   /**
    * Lấy token hiện tại để gắn vào Header cho các request sau
    */
   getToken() {
      return this._getStorage();
   }
}