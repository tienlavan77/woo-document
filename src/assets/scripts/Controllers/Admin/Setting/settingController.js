import Controller from '../../controller';
import SettingViewer from '../../../Views/Admin/Setting/settingViewer';
import CompanyController from './Components/companyController';
import UserController from './Components/userController';

/**
 * Quản lý logic thiết lập hệ thống, điều phối giữa Viewer và các Controller con.
 */
class SettingController extends Controller{
   /**
    * @param {Object} dependencies - Các phụ thuộc bên ngoài.
    * @param {Function} dependencies.notice - Hàm thông báo (callback/notifier).
    */
   constructor() {
      // Lưu trữ dependency
     super()

      // Khởi tạo các thành phần giao diện và controller con
      this.companyController = new CompanyController();
      this.userController = new UserController();    
          
      this.viewer = new SettingViewer();   
      
      // Tự động kích hoạt quá trình khởi tạo
      this.init(); 
   }

   /**
    * Khởi tạo cấu hình ban đầu và các controller phụ thuộc.
    */
   init() {
      
       // 1. Khởi tạo giao diện chính
        this.viewer.body.children =[
            this.companyController.viewer.main,
            this.userController.viewer.main
        ]
      
       // 2. Khởi tạo Controller cho Công ty   
        this.viewer.init();
       console.log("SettingController: Initialization completed.");
   }
}

export default SettingController;