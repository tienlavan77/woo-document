/**
 * StorageManager: Tiện ích quản lý LocalStorage an toàn
 * Giúp xử lý lỗi JSON, lỗi tràn bộ nhớ và hỗ trợ môi trường SSR.
 */
class StorageManager {
   /**
    * Lưu dữ liệu vào LocalStorage
    * @param {string} key - Tên khóa
    * @param {any} value - Dữ liệu (String, Object, Array...)
    * @returns {boolean} - Trả về true nếu thành công
    */
   static set(key, value) {
      if (typeof window === "undefined") return false; // Kiểm tra nếu là môi trường Server

      try {
         const serializedData = JSON.stringify(value);
         window.localStorage.setItem(key, serializedData);
         return true;
      } catch (error) {
         console.error(`[StorageManager] Lỗi khi ghi key "${key}":`, error);
         // Có thể xử lý lỗi QuotaExceededError (hết dung lượng) tại đây
         return false;
      }
   }

   /**
    * Đọc dữ liệu từ LocalStorage
    * @param {string} key - Tên khóa
    * @param {any} defaultValue - Giá trị mặc định nếu không tìm thấy hoặc lỗi
    * @returns {any}
    */
   static get(key, defaultValue = null) {
      if (typeof window === "undefined") return defaultValue;

      try {
         const dataJson = window.localStorage.getItem(key);
         
         // Nếu không có dữ liệu, trả về giá trị mặc định
         if (dataJson === null) return defaultValue;

         return JSON.parse(dataJson);
      } catch (error) {
         console.error(`[StorageManager] Lỗi khi đọc hoặc parse key "${key}":`, error);
         return defaultValue;
      }
   }

   /**
    * Xóa một key cụ thể
    * @param {string} key 
    */
   static remove(key) {
      if (typeof window !== "undefined") {
         window.localStorage.removeItem(key);
      }
   }

   /**
    * Dọn sạch toàn bộ LocalStorage
    */
   static clear() {
      if (typeof window !== "undefined") {
         window.localStorage.clear();
      }
   }
}

export default StorageManager;