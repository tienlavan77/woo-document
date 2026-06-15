import TextHelper from '../../Vendor/helpers/textHelper'
import ModuleLoader from "../../Vendor/helpers/loadModule"

/**
 * Lớp Admin - Quản lý việc khởi tạo và tải các module điều hướng trong khu vực Admin.
 */
export default class AdminLoadController {
   // Đường dẫn gốc tới thư mục Controllers

   /**
    * @param {Object} props - Nhận các công cụ hỗ trợ như notice, modal từ ứng dụng chính.
    */
   constructor() { 
   
      // Danh sách các controller có thể tải
      // Việc đóng gói vào object giúp dễ quản lý và kiểm tra tồn tại (mapping)
      this.loadController = {
         adminSetting: () => this._importModule('Admin/Setting/settingController'),
         adminQuotation: () => this._importModule('Admin/Quotation/quotationAdminController'),
         adminDelivery: () => this._importModule('Admin/Delivery/deliveryAdminController'),
         adminInvoice: () => this._importModule('Admin/Invoice/invoiceAdminController')
         // Bạn có thể thêm các controller khác tại đây
      };
      this.init();
   }

   /**
    * Phương thức khởi tạo: Đọc dữ liệu từ meta tag và kích hoạt module tương ứng.
    */
   init() {
      try {
         const metaTag = document.querySelector("meta#pagenow");
         if (!metaTag) {
               console.warn("Admin Init: Không tìm thấy thẻ meta#pagenow");
               return;
         }

         // Giải mã JSON từ thuộc tính data của thẻ meta
         // const pageType = JSON.parse(metaTag.dataset.page);
         const { page, type } = JSON.parse(metaTag.dataset.page);;

         if (!page || !type) {
               throw new Error("Dữ liệu page hoặc type không hợp lệ.");
         }

         // Tạo tên hàm cần gọi (ví dụ: admin + Setting = adminSetting)
         const methodName = `${page}${TextHelper.capitalize(type)}`;

         // Kiểm tra xem phương thức có tồn tại trong danh sách loadController không
         if (typeof this.loadController[methodName] === 'function') {
               this.loadController[methodName]();
         } else {
               console.error(`Admin Init: Không tìm thấy controller cho "${methodName}"`);
         }

      } catch (error) {
         console.error("Admin Init Error:", error.message);
      }
   }

   /**
    * Hàm hỗ trợ tải module để tránh lặp lại code (DRY - Don't Repeat Yourself)
    * @param {string} path - Đường dẫn tương đối từ ADM_DIR
    * @private
    */
   _importModule(path) {
      return ModuleLoader.load( `${path}` );
   }
}
