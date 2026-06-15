import Model from "../model";

export default class WooCommerceModel extends Model {
   constructor() {
      super();     
      this.getKey();
   }
   
   getKey() {
      let userStorageName = 'user_info';
      try {
         let userInfo = this._getStorage(userStorageName);

         if (userInfo) {
            
            this.key = userInfo?.key || null;
            this.secret = userInfo?.secret || null;
         }
         return true; 

      } catch (error) {
         console.error("[Model] Lỗi khởi tạo dữ liệu:", error); 
      }
   }

   async get(params) {
      // Vì đã dùng X-WP-Nonce, ta không cần đính kèm ck/cs vào URL nữa.
      // WordPress sẽ tự hiểu quyền hạn của User đang đăng nhập.
      const api = this.api + params;

      try {
         const response = await this._httpGet(api);
         if (!response) {
               return {};
         }
         return response;
      } catch (error) {
         console.error("[Model] Không thể tải dữ liệu từ API WooCommerce:", error);
         return {};
      }
   }

};
