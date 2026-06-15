import BaseModel from '../../baseModel';
import Model from '../../model';
import VatModel from '../../Woocommerce/Vat/vatModel';

class CustomerInvoiceModel extends Model {
   constructor() {
      super();
      this.storageName = 'cs_invoice';
      this.onlyLocal = true      
   }
}

class ProductInvoiceModel extends Model {
   constructor() {
      super()
      this.data = [];
      this.storageName = 'products_invoice';
      this.onlyLocal = true
      
   }
}

export default class InvoiceModel extends BaseModel {
   constructor() {
      super(new CustomerInvoiceModel(), new ProductInvoiceModel())
      this.vat = new VatModel()  
      this.init()
   }
   async init() {
      try {
        super.init()
        await this.vat.init()
      } catch(error) {
         
      }
   }   
}
