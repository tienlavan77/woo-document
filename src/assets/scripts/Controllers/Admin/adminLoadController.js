import ModuleLoader from "../../Vendor/helpers/loadModule";
import TextHelper from "../../Vendor/helpers/textHelper";
import App from "../../app.js";

export default class AdminLoadController {
   /**
    * @param {Object} [pageData] - Thông tin định tuyến { page, type } được truyền từ App
    */
   constructor(pageData = null) {
      this.pageData = pageData || App.getPageData();

      // Danh sách các controller có thể tải
      this.loadController = {
         adminSetting: () => this._importModule('Admin/Setting/settingController'),
         adminQuotation: () => this._importModule('Admin/Quotation/quotationAdminController'),
         adminDelivery: () => this._importModule('Admin/Delivery/deliveryAdminController'),
         adminInvoice: () => this._importModule('Admin/Invoice/invoiceAdminController')
      };
      this.init(this.pageData);
   }

   /**
    * Phương thức khởi tạo: Nhận dữ liệu định tuyến từ App và kích hoạt module tương ứng.
    * @param {Object} [routeData]
    */
   init(routeData = null) {
      try {
         const { page, type } = routeData || this.pageData || {};

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
      return ModuleLoader.load(`${path}`);
   }
}
