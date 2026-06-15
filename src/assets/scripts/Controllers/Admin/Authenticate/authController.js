import Controller from '../../controller';
import AuthModel from  '../../../Models/Admin/Authenticate/authModel';
import AuthViewer from '../../../Views/Admin/Authenticate/authViewer';

export default class AuthController extends Controller {
   constructor() {
      super();
      this.model = new AuthModel();  
          
      this.viewer = new AuthViewer();
      
      this.init();
   }

   init() {
      // Gắn sự kiện submit cho form đăng nhập
      if (this.viewer.body) {
         this.viewer.body.addEventListener('submit', this.handleLogin.bind(this));
         console.log("[AuthController]: Đã liên kết thành công với form đăng nhập WordPress.");
      }
      
      // Gắn sự kiện cho nút Logout (nếu có)
    
      if (this.viewer.logout) {
         this.viewer.logout.addEventListener('click', this.handleLogout.bind(this));
      }
   }

   async handleLogin(event) {
      event.preventDefault();

      // Lấy dữ liệu từ giao diện
      const username = this.viewer.user.value.trim();
      const password = this.viewer.pass.value.trim();
      const remember = this.viewer.remember.checked;
      
      if (!username || !password) {
         this.viewer.message.innerText = "Vui lòng nhập đầy đủ tài khoản và mật khẩu";
         return;
      }

      // Gọi model xử lý
      const result = await this.model.login(username , password, remember);
      
      if (result.success) {
         console.log("Token đã được lưu vào LocalStorage:");         
         let href = this.viewer.directto.value;
         window.location.href = href ? href : '/wp-admin/';         
      } else {
         console.log(result)         
      }
   }

   handleLogout(event) {
      // event.preventDefault();
      this.model.logout();
      window.location.reload(); // Reload lại trang sau khi xóa token
   }
}