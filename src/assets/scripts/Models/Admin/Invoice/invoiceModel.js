import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';
import VatModel from '../../Woocommerce/Vat/vatModel';

export default class InvoiceModel extends BaseModel {
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

   async init() {
      try {
         super.init();
         await this.vat.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("InvoiceModel Init Error:", error);
      }
   }
}
