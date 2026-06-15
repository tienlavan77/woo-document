import ComponentBaseController from './componentBaseController';
import CompanyViewer from '../../../../Views/Admin/Setting/Partials/companyViewer';
import CompanyModel from '../../../../Models/Admin/Setting/companyModel';

/**
 * Lớp CompanyController - Chuyên biệt cho quản lý thông tin công ty
 * Kế thừa toàn bộ logic từ MasterSetting 
 */
class CompanyController extends ComponentBaseController {
   /**
   * @param {Object} elements - Các DOM elements (address, email, stamp, saveBtn...)
    * @param {Object} notice - Instance của class Notice
    */
   constructor() {
      // Gọi constructor của lớp cha (MasterSetting)
      super();

       // 1. Khởi tạo hiển thị 
      this.viewer = new CompanyViewer();      

      // 2. Thiết lập Model riêng cho Công ty
      this.model = new CompanyModel();     
       
      // 3. Gán nút lưu       
      this.viewer.button.onclick = this._handleSave;

      // 4. Tự động khởi chạy logic   
      this.init();
   }

   /**
    * Bạn có thể ghi đè (Override) hoặc mở rộng các phương thức của lớp cha nếu cần
    */
   async init() {
      // Có thể thêm logic kiểm tra quyền trước khi init
      // console.log("Khởi tạo cấu hình Công ty...");
      
      // Gọi lại hàm init của MasterSetting
      await super.init();

   }
}

export default CompanyController;

