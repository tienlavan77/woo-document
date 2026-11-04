// Provides module declarations and business logic for deliveryModel.js.

import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';

// Defines DeliveryModel class behavior for deliveryModel.js.
export default class DeliveryModel extends BaseModel {
   // Defines constructor method behavior for deliveryModel.js.
   constructor() {
      super(
         new CustomersModel('cs_delivery'),
         new ProductModel('products_delivery')
      );
      this.init();
   }
}
