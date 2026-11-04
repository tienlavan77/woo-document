// Provides module declarations and business logic for quotationModel.js.

import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';
import VatModel from '../../Woocommerce/Vat/vatModel';

// Defines QuotationModel class behavior for quotationModel.js.
export default class QuotationModel extends BaseModel {
   // Defines constructor method behavior for quotationModel.js.
   constructor() {
      super(
         new CustomersModel('cs_quotation'),
         new ProductModel('products_quotation')
      );
      this.vat = new VatModel();
      this.init();
   }

   // Defines init method behavior for quotationModel.js.
   async init() {
      try {
         super.init();
         await this.vat.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("QuotationModel Init Error:", error);
      }
   }
}
