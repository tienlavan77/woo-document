import ModuleLoader from '../../Vendor/helpers/loadModule'
import TextHelper from "../../Vendor/helpers/textHelper";

/**
 * MasterWooCommerce: Lớp điều phối (Dispatcher) cho các Controller của WooCommerce
 * Nhiệm vụ: Xác định trang hiện tại và load module tương ứng một cách linh hoạt.
 */
export default class WooCommerceController {
   /**
    * @param {Object} dependencies - Các tiện ích dùng chung
    * @param {Object} dependencies.notice - Instance của lớp thông báo
    * @param {Object} dependencies.modal - Instance của lớp Modal
    */
   constructor() {
      // Đường dẫn gốc tới thư mục chứa các controller
     
     
      // Khởi chạy hệ thống
      this.init();
   }

   /**
    * Danh mục các Controller và file tương ứng
    * Sử dụng Getter để trả về object cấu hình
    */
   get routeMap() {      
      return {
         'editOrder': 'Orders/orderController',
         'postOrder': 'productInPostController',
         'editProduct': 'Products/editProductController',
         'postProduct': 'Products/postProductController', // load controller thêm sản phẩm trong trang chỉnh sửa sản phẩm
         'usersUser': 'Customers/customersController',
         'usereditUser': null, // Sẽ bổ sung sau       
      };
   }

   /**
    * Khởi tạo logic chính: Đọc metaTag và kích hoạt controller
    */
   async init() {
      try {
         const metaTag = document.querySelector("meta#pagenow");

         // 1. Lấy dữ liệu trang từ metaTag (Giả định metaTag đã tồn tại toàn cục)
         if (typeof metaTag === 'undefined' || !metaTag.dataset.page) {
            console.warn("MasterWooCommerce: Không tìm thấy thông tin trang (metaTag).");
            return;
         }

         const { page, type } = JSON.parse(metaTag.dataset.page);

         // 2. Tạo key để định danh controller (Ví dụ: "edit" + "Product" = "editProduct")
         // Lưu ý: Sử dụng TextHelper để chuẩn hóa string nếu cần
         const controllerKey = `${page}${TextHelper.capitalize(type)}`;

         // 3. Gọi hàm load module
         await this._dispatch(controllerKey);

      } catch (error) {
         console.error("MasterWooCommerce Init Error:", error);
      }
   }

   /**
    * Điều phối việc nạp Module dựa trên key
    * @param {string} key - Tên controller cần load
    */
   async _dispatch(key) {
      const fileName = this.routeMap[key];

      if (!fileName) {
         console.warn(`MasterWooCommerce: Không tìm thấy Controller cho key: [${key}]`);
         return;
      }

      console.log(`🚀 Loading Controller: ${key} từ file ${fileName}`);

      // Gọi hàm loadModule (Giả định loadModule là hàm toàn cục hoặc được import)
      return ModuleLoader.load(`WooCommerce/${fileName}`);
   }
  
}
