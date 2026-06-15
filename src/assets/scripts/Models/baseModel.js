import Model from "./model";
/**
 * QuotationWooModel
 * Lớp Model tổng hợp quản lý dữ liệu Báo giá (Quotation), 
 * bao gồm thông tin Khách hàng và danh sách Sản phẩm.
 */
export default class BaseModel extends Model {
   constructor(customer, products) {    
      super() 
      // Khởi tạo các instance Model thành phần
      this.customer = customer;
      this.products = products;    
   }

   /**
    * Khởi tạo dữ liệu từ bộ nhớ cục bộ cho cả khách hàng và sản phẩm
    */
   init() {
      try {
         this.customer.init();
         this.products.init();      
       
      } catch (error) {
         if (import.meta.env.DEV) console.error("QuotationWooModel Init Error:", error);
      }
   }

   /**
    * Getter để lấy dữ liệu sản phẩm nhanh hơn
    * Sử dụng: model.data thay vì model.products.data
    */
   // --- GETTER/SETTER CHO CUSTOMER ---
   
   /** Lấy dữ liệu object khách hàng hiện tại */
   get customerData() {
      return this.customer.data; // Giả định CustomersModel có thuộc tính .data
   }

   /** Cập nhật dữ liệu khách hàng */
   set customerData(value) {
      this.customer.data = value;
   }

   // --- GETTER/SETTER CHO PRODUCTS ---

   /** Lấy danh sách sản phẩm[cite: 21] */
   get productData() {
      return this.products.data || [];
   }

   /** Cập nhật danh sách sản phẩm[cite: 21] */
   set productData(value) {
      this.products.data = value;
   }


   /**
    * Lưu trạng thái hiện tại của toàn bộ báo giá vào LocalStorage[cite: 21]
    */
   saveLocal() {
      try {
         this.customer.saveLocal();
         this.products.saveLocal();
         
         // Có thể bắn thêm sự kiện đồng bộ nếu cần
         // console.log("Quotation data saved successfully.");
      } catch (error) {
         if (import.meta.env.DEV) console.error("Save Local Storage Error:", error);
      }
   }

   /**
    * Làm mới (xóa sạch) dữ liệu báo giá
    */
   clear() {
      this.customer.data = {};
      this.products.data = {};
      this.saveLocal();
   }
   
}