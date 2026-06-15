import Viewer from "../../viewer";

/**
 * ProductWooViewer
 * Chịu trách nhiệm hiển thị các thông báo và tương tác UI liên quan đến sản phẩm.
 * Kế thừa từ WooCommerceViewer để sử dụng các thành phần modal và notice dùng chung.
 */
export default class ProductViewer extends Viewer { 
   constructor() {
      super();    
      // Selector dùng để xác định các nút thêm sản phẩm trong Controller
      this.link = '.addtodocument';

      // Tập trung quản lý nội dung thông báo để dễ bảo trì hoặc đa ngôn ngữ
      this.messages = {
         ...this.messages,
         exist: "The selected product already exists in the quotation. <br/><b style='color:orange;'>Would you like to update its information?</b>",
         updateSuccess: 'Product data has been retrieved and updated successfully!',
     
      }; 
   }

   /**
    * Hiển thị Modal xác nhận khi sản phẩm đã tồn tại trong danh sách
    * @param {Object} params - Các hàm callback xử lý sự kiện
    * @param {Function} params.yes - Xử lý khi nhấn Đồng ý
    * @param {Function} params.no - Xử lý khi nhấn Từ chối
    * @param {string} [params.customMessage] - Thông báo tùy chỉnh (nếu có)
    */
   existProductNotice({ yes, no, customMessage }) {
      return this.yesNoQuestionModal({
         // Ưu tiên customMessage nếu được truyền vào, nếu không dùng mặc định
         message: customMessage || this.messages.exist,
         title: 'Product Already Exists', // Tiêu đề chuyên nghiệp hơn[cite: 2]
         yes,
         no
      });
   }
}
