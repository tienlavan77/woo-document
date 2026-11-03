import Model from './model';
import CustomersModel from './Woocommerce/Customers/customersModel';
import ProductModel from './Woocommerce/Products/productModel';

export default class BaseModel extends Model {
   /**
    * @param {Object|string} [customer='cs_quotation'] - Instance CustomersModel hoặc tên khóa localStorage cho khách hàng
    * @param {Object|string} [products='products_quotation'] - Instance ProductModel hoặc tên khóa localStorage cho sản phẩm
    */
   constructor(customer = 'cs_quotation', products = 'products_quotation') {
      super();
      this.customer = typeof customer === 'string' ? new CustomersModel(customer) : customer;
      this.products = typeof products === 'string' ? new ProductModel(products) : products;
   }

   /**
    * Khởi tạo dữ liệu từ bộ nhớ cục bộ cho cả khách hàng và sản phẩm
    */
   init() {
      try {
         this.customer.init();
         this.products.init();
      } catch (error) {
         if (import.meta.env.DEV) console.error("BaseModel Init Error:", error);
      }
   }

   // --- GETTER/SETTER CHO CUSTOMER ---

   /** Lấy dữ liệu object khách hàng hiện tại */
   get customerData() {
      return this.customer.data;
   }

   /** Cập nhật dữ liệu khách hàng */
   set customerData(value) {
      this.customer.data = value;
   }

   // --- GETTER/SETTER CHO PRODUCTS ---

   /** Lấy danh sách sản phẩm */
   get productData() {
      return this.products.data || [];
   }

   /** Cập nhật danh sách sản phẩm */
   set productData(value) {
      this.products.data = value;
   }

   /**
    * Lưu trạng thái hiện tại vào LocalStorage
    */
   saveLocal() {
      try {
         this.customer.saveLocal();
         this.products.saveLocal();
      } catch (error) {
         if (import.meta.env.DEV) console.error("Save Local Storage Error:", error);
      }
   }

   /**
    * Làm mới (xóa sạch) dữ liệu
    */
   clear() {
      this.customer.data = {};
      this.products.data = {};
      this.saveLocal();
   }
}
