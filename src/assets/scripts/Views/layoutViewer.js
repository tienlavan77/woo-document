import Viewer from "./viewer";
import Header from "./Partials/header";
import Body from "./Partials/body";
// import Footer from "./Partials/footer.min.mjs";

/**
 * Quản lý giao diện chính (Layout) của ứng dụng.
 */
export default class LayoutViewer extends Viewer {
	constructor(config = {}) {
		super()
		// Cấu hình ID mặc định hoặc lấy từ tham số truyền vào
		this.id = config.id || 'default';	

		// Khởi tạo các thành phần giao diện
		this.header = new Header();
		this.body = new Body(); 
		// this.footer = new Footer();
		
		 /**
       * Lưu trữ các element để Controller có thể truy cập.
       * Khởi tạo object rỗng để tránh lỗi undefined trước khi init.
       */
		 this.children = [];
	
	}

	/**
	 * Dọn dẹp giao diện Admin WordPress (ẩn các thông báo rác)
	 * Sử dụng private method (#) nếu môi trường hỗ trợ, hoặc đặt tên _modWPAdmin
	 */
	_modWPAdmin() {
		const notices = document.querySelectorAll('.notice-warning, .updated, .error, .notice');
		if (notices.length > 0) {
			notices.forEach(notice => {
				notice.style.display = 'none'; // Ẩn triệt để hoặc dùng class 'hidden' của WP
			});
		}
	}

	/**
	 * Khởi tạo và gắn các thành phần vào DOM 
	 */
	init() {
		const mainContainer = document.getElementById(this.id);
		if (!mainContainer) {
				console.warn(`LayoutViewer: Không tìm thấy element với ID "${this.id}"`);
				return;
		}

		// Tối ưu: Dùng DocumentFragment để tránh reflow nhiều lần nếu có nhiều element
		const fragment = document.createDocumentFragment();

		// Ẩn thông báo WP trước khi render giao diện của mình
		this._modWPAdmin();

		// Thêm các thành phần vào fragment
		
		let header = this.header.build();
		if (header) {
			const adminMenuBack = document.getElementById("adminmenuback");
			if (adminMenuBack) {
				const resizeObserver = new ResizeObserver(entries => {
					for (let entry of entries) {
						 // Lấy clientWidth trực tiếp từ phần tử đang theo dõi
						 const currentWidth = entry.target.clientWidth;
						 
						 // Check trạng thái dựa trên width (WP thường là 36px hoặc 160px)
						 const isCollapsed = currentWidth <= 36;
						 // Cập nhật class cho header
						 header.classList.toggle('collapse', isCollapsed);
					}
			  });
			  resizeObserver.observe(adminMenuBack);
			}
			fragment.append(header);

		}
		if (this.body.render) fragment.append(this.body.build());
		// if (this.footer.create) fragment.append(this.footer.create());

		// Gắn tất cả vào DOM một lần duy nhất
		mainContainer.innerHTML = ''; // Xóa nội dung cũ nếu cần
		mainContainer.append(fragment);
	}
}
