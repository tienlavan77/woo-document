// Provides module declarations and business logic for adminLoadController.js.

import ModuleLoader from "../../Vendor/helpers/loadModule";
import TextHelper from "../../Vendor/helpers/textHelper";
import App from "../../app.js";

// Defines AdminLoadController class behavior for adminLoadController.js.
export default class AdminLoadController {
   /* Executes documented symbol logic in adminLoadController.js. */
   constructor(pageData = null) {
      this.pageData = pageData || App.getPageData();

      // Executes documented symbol logic in adminLoadController.js.
      this.loadController = {
         adminSetting: () => this._importModule('Admin/Setting/settingController'),
         adminQuotation: () => this._importModule('Admin/Quotation/quotationAdminController'),
         adminDelivery: () => this._importModule('Admin/Delivery/deliveryAdminController'),
         adminInvoice: () => this._importModule('Admin/Invoice/invoiceAdminController')
      };
      this.init(this.pageData);
   }

   /* Executes documented symbol logic in adminLoadController.js. */
   init(routeData = null) {
      try {
         const pageData = routeData || this.pageData || window.DocumentPluginConfig || {};
         const { page, type } = pageData;

         if (!page || !type) {
            throw new Error("Dữ liệu page hoặc type không hợp lệ.");
         }

         // Executes documented symbol logic in adminLoadController.js.
         const methodName = `${page}${TextHelper.capitalize(type)}`;

         // Executes documented symbol logic in adminLoadController.js.
         if (typeof this.loadController[methodName] === 'function') {
            this.loadController[methodName]();
         } else {
            console.error(`Admin Init: Không tìm thấy controller cho "${methodName}"`);
         }

      } catch (error) {
         console.error("Admin Init Error:", error.message);
      }
   }

   /* Executes documented symbol logic in adminLoadController.js. */
   _importModule(path) {
      return ModuleLoader.load(`${path}`);
   }
}
