import WPMediaManager from '../../../../Vendor/helpers/wordpressMediaBox';

/**
 * MasterSetting Class
 * Quản lý đồng bộ dữ liệu giữa UI Elements và Data Model (thường dùng cho WordPress Settings)
 */
export default class ComponentBaseController {
	/**
	 * @param {Object} elements - Danh sách các DOM elements (input, img, v.v.)
	 * @param {Object} notice - Module hiển thị thông báo
	 */
	constructor() {		

		// Khởi tạo các thuộc tính mặc định
	   // Danh sách tên các field cần theo dõi sự kiện blur	
		this.saveButton = null; // DOM của nút Save
		this.model = null;  
		this.wpMedia = new WPMediaManager();
	}

	/**
	 * Cập nhật dữ liệu từ UI vào Model khi người dùng nhập liệu
	 */
	_handleUpdate = (event) => {
		const { name, value } = event.target;
		if (this.model) {
			this.model.data[name] = value;
		}
	};

	/**
	 * Xử lý chọn ảnh từ WordPress Media Box
	 */
	_handleSelectImage = ({ link, element }) => {
		// Cập nhật giao diện	
		element.link.value = link;
			
		// // Cập nhật dữ liệu vào model (sử dụng spread để trigger reactivity nếu cần)
		this.model.data = { 
			...this.model.data, 
			[element.link.name]: link 
		};
	};
	

	/**
	 * Đồng bộ dữ liệu từ Model ngược lại các UI Elements
	 */
	syncModelToUI() {
		if (!this.model || !this.model.data) return;

		Object.entries(this.model.data).forEach(([key, value]) => {
			const el = this.viewer.elements[key];
			if (!el) return;

			// Kiểm tra nếu là Image Box (có cấu trúc đặc biệt)
			const isImageBox = el.typeof === 'imagebox';

			if (isImageBox) {
				el.element.link.value = value;
				
			} else {
				el.element.value = value;
			}
		});
	}

	/**
	 * Xử lý sự kiện click nút lưu
	 */
	_handleSave = async (event) => {
		if (!this.model) return;

		try {
			const response = await this.model.save();
			// Xác định style thông báo dựa trên mã phản hồi
			const statusMap = {
				200: 'success',
				201: 'warning',
				202: 'dangerous'
			};
			const style = statusMap[response.status.code] || 'info';

			this.viewer._showNotice(response.status.message, style);
		} catch (error) {
			console.error("Save error:", error);
			this.viewer._showNotice("Đã có lỗi xảy ra khi lưu dữ liệu", "dangerous");
		}
	};

	
	/**
	 * Khởi tạo các sự kiện và dữ liệu ban đầu
	 */
	async init() {
		if (!this.model) {
			console.error("Model chưa được thiết lập.");
			return;
		}
		
		// 1. Khởi tạo dữ liệu từ model
		await this.model.init();

		// 2. Gán sự kiện blur cho các input fields
		let elements = this.viewer.elements;
		Object.keys(elements).forEach(key => {
			let controller = elements[key];
			if (controller.typeof === 'imagebox') {
				controller.element.link.onblur = this._handleUpdate;
				controller.element.view.onclick = event => this.viewer._viewImage(controller.element);
				controller.element.choice.onclick = () => this.wpMedia.open({ 
						element: controller.element, 
						callback: (data) => this._handleSelectImage(data) 
					});
			}
			else {
				controller.element.onblur = this._handleUpdate;
			}
		})
		
		// 5. Đồng bộ dữ liệu lần đầu lên giao diện
		this.syncModelToUI();
	}
}
