import Model from '../../model'
import BaseModel from '../../baseModel'

class CustomerModel extends Model {
   constructor() {
      super()
      this.storageName = 'cs_delivery'
      this.onlyLocal = true
   }
}

class ProductsModel extends Model {
   constructor() {
      super()
      this.storageName = 'products_delivery'
      this.onlyLocal = true
   }
}

export default class DeliveryModel extends BaseModel {
   constructor() {
      super(new CustomerModel(), new ProductsModel() )      
      this.init()      
   }
}
