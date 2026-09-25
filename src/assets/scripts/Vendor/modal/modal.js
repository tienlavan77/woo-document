import TagBuilder from '../helpers/tagBuilder';

/**
 * Lớp Modal - Quản lý hộp thoại, hỗ trợ kéo thả và nội dung động
 */
export default class Modal {
	// Template cấu trúc của Modal
	static TEMPLATE = `
		<div class="modal__wrapper">
			<div class="modal__element modal__header header">
					<div class="modal__icon md-icon">						
							<span class="dashicons dashicons-info"></span>						
					</div>
					<div class="modal__title md-title"><h4 class="title">Thông báo</h4></div>
					<div class="modal__btn close"><span class="dashicons dashicons-no-alt"></span></div>
			</div>
			<div class="modal__element modal__body body"></div>
			<div class="modal__element modal__footer footer"></div>
		</div>
	`;

	constructor() {
		this.elements = {};
		this.dragState = { x: 0, y: 0 };
		this.isDragging = false;
		
		// Bind các hàm sự kiện để có thể add/remove listener chính xác
		this.boundDrag = this.dragElement.bind(this);
		this.boundDrop = this.dropElement.bind(this);
		this.boundEsc = this.handleEsc.bind(this);
	}

	/**
	 * Khởi tạo Modal
	 * @param {Object} options - { id, config }
	 */
	init({ id, config = {} }) {
		if (!id) return this;

		let modalEl = document.querySelector(`#${id}`);

		if (!modalEl) {			
			modalEl = TagBuilder.create('div')
				.setAttributes({ id, className: "modal" })
				.html(Modal.TEMPLATE)
				.build();
			document.body.append(modalEl);
		}

		this.collectElements(modalEl);
		this.setupOverlay();
		this.applyConfig(config);

		return this;
	}

	/**
	 * Lưu trữ các tham chiếu DOM để truy cập nhanh
	 */
	collectElements(modalEl) {
		this.elements = {
			main: modalEl,
			wrapper: modalEl.querySelector(".modal__wrapper"),
			header: modalEl.querySelector(".header"),
			body: modalEl.querySelector(".body"),
			footer: modalEl.querySelector(".footer"),
			title: modalEl.querySelector(".title"),
			closeBtns: modalEl.querySelectorAll(".close"),
		};

		// Gán sự kiện đóng cho tất cả nút có class .close
		this.elements.closeBtns.forEach(btn => {
			btn.onclick = () => this.close();
		});
	}

	/**
	 * Tạo lớp nền (overlay) nếu chưa có
	 */
	setupOverlay() {
		let overlay = this.elements.main.querySelector(".mdoverlay");
		if (!overlay) {			
			overlay = TagBuilder.create('div')
				.setAttributes({ className: "modal__overlay mdoverlay close" })
				.build();
			this.elements.main.append(overlay);
			// Click vào overlay cũng đóng modal
			overlay.onclick = () => this.close();
		}
		this.elements.overlay = overlay;
	}

	/**
	 * Áp dụng cấu hình thông qua các phương thức của class
	 */
	applyConfig(config) {
		Object.entries(config).forEach(([method, value]) => {
			if (typeof this[method] === "function") {
					this[method](value);
			}
		});
	}

	// --- Các phương thức cập nhật UI ---

	title(text) {
		if (this.elements.title) this.elements.title.innerHTML = text;
		return this;
	}

	content(nodes) {
		if (!this.elements.body) return this;
		this.elements.body.innerHTML = ''; // Clear cũ
		const children = Array.isArray(nodes) ? nodes : [nodes];
		this.elements.body.append(...children);
		return this;
	}

	footerContent(nodes) {
		if (!this.elements.footer) return this;
		this.elements.footer.innerHTML = '';
		const children = Array.isArray(nodes) ? nodes : [nodes];
		this.elements.footer.append(...children);
		return this;
	}

	width(val) {
		this.elements.wrapper.style.width = val;
		return this;
	}

	maxWidth(val) {
		this.elements.wrapper.style.maxWidth = val;
		return this;
	}
	style(styles) {
		Object.assign(this.elements.wrapper.style, styles);
		return this;
	}
	
	header(isVisible) {
		this.elements.header.classList.toggle("hide", isVisible === false);
		return this;
	}

	footer(isVisible) {
		this.elements.footer.classList.toggle("hide", isVisible === false);
		return this;
	}

	// --- Logic Kéo thả (Draggable) ---

	draggable(isEnabled) {
		if (! isEnabled) return;
		const header = this.elements.header;
		header.style.cursor = "move";
		header.onmousedown = (e) => this.startDragging(e);
	}

	startDragging(e) {
		if (e.button !== 0) return;
		e.preventDefault();

		this.dragState.x = e.clientX;
		this.dragState.y = e.clientY;
		// Xử lý vị trí ban đầu để tránh Modal bị "nhảy" khi bắt đầu kéo
      const { wrapper } = this.elements;
      const rect = wrapper.getBoundingClientRect();

		// Nếu Modal đang dùng transform: translate(-50%, -50%) để căn giữa, 
      // ta cần chuyển nó về tọa độ cứng (absolute/fixed)
      wrapper.style.margin = "0";
      wrapper.style.transform = "none"; 
      wrapper.style.top = `${rect.top}px`;
      wrapper.style.left = `${rect.left}px`;
		wrapper.style.position = "fixed";
		

		document.addEventListener("mousemove", this.boundDrag);
		document.addEventListener("mouseup", this.boundDrop);
	
	
	}

	dragElement(e) {
		e.preventDefault();
      
      // Tính toán khoảng cách di chuyển (Delta)
      const moveX = e.clientX - this.dragState.x;
      const moveY = e.clientY - this.dragState.y;

      // Cập nhật tọa độ mới cho Modal
      const { wrapper } = this.elements;
      wrapper.style.top = `${wrapper.offsetTop + moveY}px`;
      wrapper.style.left = `${wrapper.offsetLeft + moveX}px`;

      // Cập nhật lại vị trí chuột hiện tại vào state
      this.dragState.x = e.clientX;
      this.dragState.y = e.clientY;
	}

	dropElement() {
		document.removeEventListener("mousemove", this.boundDrag);
		document.removeEventListener("mouseup", this.boundDrop);
	}

	// --- Điều khiển Đóng/Mở ---

	escExit(isEnabled) {
		if (isEnabled !== false) {
			window.addEventListener("keydown", this.boundEsc);
		} else {
			window.removeEventListener("keydown", this.boundEsc);
		}
	}

	handleEsc(e) {
		if (e.key === "Escape") this.close();
	}

	open(config = {}, content = [])  {
		this.applyConfig(config);
		document.documentElement.classList.add("none-flow");
		this.elements.main.classList.add("open");
		return this;
		
	}

	close() {
		document.documentElement.classList.remove("none-flow");
		this.elements.main.classList.remove("open");
		
		// Dọn dẹp event listener khi đóng để tránh rò rỉ bộ nhớ
		window.removeEventListener("keydown", this.boundEsc);
		
		if (this.shouldClearOnClose) {
			this.elements.body.innerHTML = "";
		}
	}

	clear(shouldClear) {
		this.shouldClearOnClose = shouldClear;
	}
}
