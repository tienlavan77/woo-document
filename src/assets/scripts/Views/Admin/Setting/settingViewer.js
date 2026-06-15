import LayoutViewer from '../../layoutViewer';

/**
 * Lớp hiển thị giao diện Cài đặt, kế thừa từ MainViewer.
 * Chịu trách nhiệm cấu trúc layout và quản lý các thành phần giao diện (UI Elements).
 */
export default class SettingViewer extends LayoutViewer {
	constructor() {
			// Gọi constructor của MainViewer
			super();

			// 1. Cấu hình thông tin cơ bản cho Viewer
			this.id = 'tsp_setting';
			this.header.title = 'Setting';

			/**
			 * Lưu trữ các element để Controller có thể truy cập.
			 * Khởi tạo object rỗng để tránh lỗi undefined trước khi init.
			 */
			this.children = [];
			
	}

	/**
	 * Khởi tạo cấu trúc giao diện và các thành phần con (Partials).
	 */
	init() {
		// 1. Khởi tạo giao diện chính
		super.init();

	
		// Có thể thêm logic render thực tế tại đây nếu MainViewer yêu cầu
		console.log("SettingViewer: UI Components initialized.");
	}
}

