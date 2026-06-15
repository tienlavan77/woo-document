import BaseModel from '../../baseModel';
import CustomersModel from '../../Woocommerce/Customers/customersModel';
import ProductModel from '../../Woocommerce/Products/productModel';
import VatModel from '../../Woocommerce/Vat/vatModel'

/**
 * QuotationWooModel
 * Lớp Model tổng hợp quản lý dữ liệu Báo giá (Quotation), 
 * bao gồm thông tin Khách hàng và danh sách Sản phẩm.
 */
export default class QuotationModel extends BaseModel{
   constructor() {
      super(new CustomersModel(), new ProductModel())  
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
