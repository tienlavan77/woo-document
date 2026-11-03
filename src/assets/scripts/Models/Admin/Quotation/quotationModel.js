import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';
import VatModel from '../../Woocommerce/Vat/vatModel';

export default class QuotationModel extends BaseModel {
   constructor() {
      super(
         new CustomersModel('cs_quotation'),
         new ProductModel('products_quotation')
      );
      this.vat = new VatModel();
      this.init();
   }

   async init() {
      try {
         super.init();
         await this.vat.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("QuotationModel Init Error:", error);
      }
   }
}
