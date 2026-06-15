import ComponentBaseController from "./componentBaseController";
import UserViewer from '../../../../Views/Admin/Setting/Partials/userViewer';
import UserModel from '../../../../Models/Admin/Setting/userModel'

/**
 * Lớp UserController - Chuyên biệt cho quản lý thông tin người dùng (User)
 * Quản lý: API Key, Secret và Chữ ký số (Signature)
 */
export default class UserController extends ComponentBaseController {
	/**
	 * @param {Object} elements - Các DOM elements (key, secret, signature, saveBtn...)
	 * @param {Object} notice - Instance của class Notice
	 */
	constructor() {
			// 1. Gọi constructor của MasterSetting để thiết lập elements và notice
			super();

			// 2 khởi tạo hiển thị
			this.viewer = new UserViewer();
		
			// 2. Khởi tạo Model dành riêng cho User
			this.model = new UserModel();
			
			// 3. Gán nút lưu       
			this.viewer.button.onclick = this._handleSave;	
				
			// 6. Kích hoạt quá trình khởi tạo (Load data, gán sự kiện)
			this.init();
	}

	/**
	 * Ghi đè hoặc mở rộng hàm init nếu User cần logic đặc thù
	 */
	async init() {
			// Ví dụ: Thêm log hoặc check quyền user tại đây
			// console.log("Đang tải cấu hình User...");
			
			// Thực thi logic init tổng quát của MasterSetting
			await super.init();
	}
}

