// Provides module declarations and business logic for invoiceModel.js.

import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';
import VatModel from '../../Woocommerce/Vat/vatModel';

// Defines InvoiceModel class behavior for invoiceModel.js.
export default class InvoiceModel extends BaseModel {
   // Defines constructor method behavior for invoiceModel.js.
   constructor() {
      const productModel = new ProductModel('products_invoice');
      productModel.data = [];
      super(
         new CustomersModel('cs_invoice'),
         productModel
      );
      this.vat = new VatModel();
      this.init();
   }

   // Defines init method behavior for invoiceModel.js.
   async init() {
      try {
         super.init();
         await this.vat.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("InvoiceModel Init Error:", error);
      }
   }
}
