/**
 * Lớp TagBuilder - Hỗ trợ xây dựng HTML Element một cách linh hoạt
 */
class TagBuilder {
	/**
	* Khởi tạo Builder với một tên thẻ
	* @param {string} tag - Tên thẻ HTML (vd: 'div', 'span')
	*/
	constructor(tag) {
		this.element = document.createElement(tag);
	}

	/**
	* Tạo nhanh một instance mà không cần dùng từ khóa new bên ngoài
	*/
	static create(tag) {
		return new TagBuilder(tag);
	}

	/**
	* Thiết lập nội dung HTML (Cẩn thận XSS)
	*/
	html(content) {
		if (content !== undefined) this.element.innerHTML = content;
		return this; 
	}

	/**
	* Thiết lập nội dung văn bản thuần (An toàn hơn html)
	*/
	text(content) {
		if (content !== undefined) this.element.textContent = content;
		return this;
	}

	/**
	* Thêm các phần tử con
	* @param {Array|HTMLElement} children 
	*/
	append(children) {
		if (!children) return this;
		const childrenArray = Array.isArray(children) ? children : [children];
		this.element.append(...childrenArray);
		return this;
	}

	/**
	* Thiết lập các thuộc tính (Attributes và Properties)
	* @param {Object} attrs 
	*/
	setAttributes(attrs) {
		Object.entries(attrs).forEach(([key, value]) => {
			// Xử lý sự kiện (vd: onclick, onchange)
			if (key.startsWith('on') && typeof value === 'function') {
				this.element[key] = value;
			} 
			// Xử lý style dưới dạng object
			else if (key === 'style' && typeof value === 'object') {
				Object.assign(this.element.style, value);
			}
			// Xử lý class
			else if (key === 'className' || key === 'class') {
				this.element.className = value;
			}
			// Xử lý các thuộc tính HTML thông thường và data-*
			else {
				this.element.setAttribute(key, value);
			}
		});
		return this;
	}

	/**
	* Trả về kết quả cuối cùng là một DOM Element
	*/
	build() {
		return this.element;
	}
}

export default TagBuilder;
// export default buildTag;