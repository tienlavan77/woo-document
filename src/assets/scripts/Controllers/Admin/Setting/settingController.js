import Controller from '../../controller';
import SettingViewer from '../../../Views/Admin/Setting/settingViewer';
import CompanyController from './Components/companyController';
import SystemController from './Components/systemController';
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

      this.viewer = new SettingViewer();
      this.userController = new UserController();

      // Company/System chứa cấu hình nhạy cảm, chỉ khởi tạo ở phía admin.
      if (this.viewer.isAdmin) {
         this.companyController = new CompanyController();
         this.systemController = new SystemController();
      }
      
      // Tự động kích hoạt quá trình khởi tạo
      this.init(); 
   }

   /**
    * Khởi tạo cấu hình ban đầu và các controller phụ thuộc.
    */
   init() {
      
       // 1. Khởi tạo giao diện chính
        this.viewer.body.children = [
            ...(this.viewer.isAdmin ? [
               this.companyController.viewer.main,
               this.systemController.viewer.main,
            ] : []),
            this.userController.viewer.main,
        ];
      
       // 2. Khởi tạo Controller cho Công ty   
        this.viewer.init();
       console.log("SettingController: Initialization completed.");
   }
}

export default SettingController;
