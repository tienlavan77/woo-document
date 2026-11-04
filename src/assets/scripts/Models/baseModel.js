// Provides module declarations and business logic for baseModel.js.

import Model from './model';
import CustomersModel from './Woocommerce/Customers/customersModel';
import ProductModel from './Woocommerce/Products/productModel';

// Defines BaseModel class behavior for baseModel.js.
export default class BaseModel extends Model {
   /* Executes documented symbol logic in baseModel.js. */
   constructor(customer = 'cs_quotation', products = 'products_quotation') {
      super();
      this.customer = typeof customer === 'string' ? new CustomersModel(customer) : customer;
      this.products = typeof products === 'string' ? new ProductModel(products) : products;
   }

   /* Executes documented symbol logic in baseModel.js. */
   init() {
      try {
         this.customer.init();
         this.products.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("BaseModel Init Error:", error);
      }
   }

   // --- GETTER/SETTER CHO CUSTOMER ---

   /* Executes documented symbol logic in baseModel.js. */
   get customerData() {
      return this.customer.data;
   }

   /* Executes documented symbol logic in baseModel.js. */
   set customerData(value) {
      this.customer.data = value;
   }

   // --- GETTER/SETTER CHO PRODUCTS ---

   /* Executes documented symbol logic in baseModel.js. */
   get productData() {
      return this.products.data || [];
   }

   /* Executes documented symbol logic in baseModel.js. */
   set productData(value) {
      this.products.data = value;
   }

   /* Executes documented symbol logic in baseModel.js. */
   saveLocal() {
      try {
         this.customer.saveLocal();
         this.products.saveLocal();
      } catch (error) {
         if (import.meta.env.DEV) console.error("Save Local Storage Error:", error);
      }
   }

   /* Executes documented symbol logic in baseModel.js. */
   clear() {
      this.customer.data = {};
      this.products.data = {};
      this.saveLocal();
   }
}
