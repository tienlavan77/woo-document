import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';

export default class DeliveryModel extends BaseModel {
   constructor() {
      super(
         new CustomersModel('cs_delivery'),
         new ProductModel('products_delivery')
      );
      this.init();
   }
}
