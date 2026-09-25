import TagBuilder from '../helpers/tagBuilder';

/**
 * Lớp Notice - Hiển thị thông báo (Toast Notification)
 * Cải tiến: Quản lý state tốt hơn, hỗ trợ đóng/mở linh hoạt.
 */
class Notice {
	// Cấu trúc HTML cố định của thông báo
	static HTML_TEMPLATE = `
		<div class="noticer__icon"><span class="dashicons"></span></div>
		<div class="noticer__message"><p class="message"></p></div>
		<div class="noticer__button">
			<span class="dashicons dashicons-no-alt close"></span>
		</div>
	`;

	constructor() {
		this.elements = null; // Lưu trữ các DOM elements
		this.timerId = null;  // Quản lý thời gian tự động đóng
	}

	/**
	 * Khởi tạo hoặc kết nối với một Notice đã có trong DOM
	 * @param {Object} options - { id: string, config: Object }
	 */
	init({ id, config }) {
		if (!id) return this;

		let noticeEl = document.querySelector(`#${id}`);

		if (!noticeEl) {
			// Tạo mới nếu chưa tồn tại			
			noticeEl = TagBuilder.create('div')
				.setAttributes({ id, className: "noticer" })
				.html(Notice.HTML_TEMPLATE)
				.build();

			document.body.append(noticeEl);
		}

		// Thu thập các element con để thao tác sau này
		this.elements = {
				container: noticeEl,
				icon: noticeEl.querySelector(".noticer__icon"),
				message: noticeEl.querySelector(".message"),
				closeBtn: noticeEl.querySelector(".close"),
		};

		// Gán sự kiện đóng
		this.elements.closeBtn.onclick = () => this.close();

		// Áp dụng config ban đầu nếu có
		if (config) this.applyConfig(config);

		return this;
	}

	/**
	 * Duyệt qua các key trong config để gọi các hàm tương ứng
	 * @param {Object} config 
	 */
	applyConfig(config) {
		Object.entries(config).forEach(([key, value]) => {
				if (typeof this[key] === "function") {
					this[key](value);
				}
		});
	}

	// --- Các phương thức cập nhật UI ---

	message(content) {
		if (this.elements) this.elements.message.innerHTML = content;
		return this;
	}

	button(isVisible) {
		if (this.elements) {
				this.elements.closeBtn.classList.toggle("hide", isVisible === false);
		}
		return this;
	}

	style(type) {
		if (!this.elements) return this;
		// Xóa các class style cũ (bắt đầu bằng --) và thêm mới
		const container = this.elements.container;
		container.className = container.className.replace(/\s--\w+/g, "");
		container.classList.add(type ? `--${type}` : "--info");
		return this;
	}

	icon(isVisible) {
		if (this.elements) {
				this.elements.icon.classList.toggle("hide", isVisible === false);
		}
		return this;
	}

	/**
	 * Hẹn giờ tự động đóng
	 * @param {number} ms - Thời gian (miliseconds)
	 */
	timer(ms) {
		this.clearTimer();
		this.timerId = setTimeout(() => this.close(), ms);
		return this;
	}

	clearTimer() {
		if (this.timerId) {
				clearTimeout(this.timerId);
				this.timerId = null;
		}
	}

	// --- Hành động ---

	/**
	 * Hiển thị thông báo
	 * @param {Object} config - Config nhanh khi mở (message, style, timer...)
	 */
	open(config = {}) {
		if (!this.elements) return;
		
		this.applyConfig(config);
		this.elements.container.classList.add("open");
	}

	close() {
		if (!this.elements) return;
		
		this.elements.container.classList.remove("open");
		this.clearTimer(); // Quan trọng: Xóa timer khi đóng thủ công
	}
}

export default Notice;