// Provides module declarations and business logic for wooCommerceController.js.

import ModuleLoader from '../../Vendor/helpers/loadModule';
import TextHelper from '../../Vendor/helpers/textHelper';
import App from '../../app.js';

// Defines WooCommerceController class behavior for wooCommerceController.js.
export default class WooCommerceController {
   /* Executes documented symbol logic in wooCommerceController.js. */
   constructor(pageData = null) {
      this.pageData = pageData || App.getPageData();

      // Executes documented symbol logic in wooCommerceController.js.
      this.init(this.pageData);
   }

   /* Executes documented symbol logic in wooCommerceController.js. */
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

   /* Executes documented symbol logic in wooCommerceController.js. */
   async init(routeData = null) {
      try {
         const { page, type } = routeData || this.pageData || {};

         if (!page || !type) {
            console.warn("MasterWooCommerce: Không tìm thấy thông tin trang (pageData).");
            return;
         }

         // Executes documented symbol logic in wooCommerceController.js.
         const controllerKey = `${page}${TextHelper.capitalize(type)}`;

         // Executes documented symbol logic in wooCommerceController.js.
         await this._dispatch(controllerKey);

      } catch (error) {
         console.error("MasterWooCommerce Init Error:", error);
      }
   }

   /* Executes documented symbol logic in wooCommerceController.js. */
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
