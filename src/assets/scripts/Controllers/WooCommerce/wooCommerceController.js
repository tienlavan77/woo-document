import ModuleLoader from '../../Vendor/helpers/loadModule';
import TextHelper from '../../Vendor/helpers/textHelper';
import App from '../../app.js';

export default class WooCommerceController {
   /**
    * @param {Object} [pageData] - Thông tin định tuyến { page, type } được truyền từ App
    */
   constructor(pageData = null) {
      this.pageData = pageData || App.getPageData();

      // Khởi chạy hệ thống
      this.init(this.pageData);
   }

   /**
    * Danh mục các Controller và file tương ứng
    * Sử dụng Getter để trả về object cấu hình
    */
   get routeMap() {
      return {
         'editOrder': 'Orders/orderController',
         'postOrder': 'Orders/postOrderController',
         'editProduct': 'Products/editProductController',
         'postProduct': 'Products/postProductController',
         'usersUser': 'Customers/customersController',
         'usereditUser': null,
      };
   }

   /**
    * Khởi tạo logic chính: Nhận dữ liệu định tuyến từ App và kích hoạt controller
    * @param {Object} [routeData]
    */
   async init(routeData = null) {
      try {
         const { page, type } = routeData || this.pageData || {};

         if (!page || !type) {
            console.warn("MasterWooCommerce: Không tìm thấy thông tin trang (pageData).");
            return;
         }

         // Tạo key để định danh controller (Ví dụ: "edit" + "Product" = "editProduct")
         const controllerKey = `${page}${TextHelper.capitalize(type)}`;

         // Gọi hàm load module
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

      return ModuleLoader.load(`WooCommerce/${fileName}`);
   }
}
