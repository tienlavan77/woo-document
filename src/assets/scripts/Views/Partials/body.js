import TagBuilder from '../../Vendor/helpers/tagBuilder'
import DOMValidator from '../../Vendor/helpers/isNodeDom';

/**
 * Lớp Body - Tạo thành phần thân (Content Area) cho giao diện
 */
class Body {
	/**
	* @param {Array|HTMLElement} children - Danh sách các phần tử con ban đầu
	*/
	constructor() {
		// Đảm bảo children luôn là mảng
		this.children = [];
		this.element = this.build();
	}

	/**
	* Thêm các phần tử con vào danh sách hiện có
	* @param {Array|HTMLElement} nodes 
	*/
	appendChildren(nodes) {
		const newNodes = Array.isArray(nodes) ? nodes : [nodes];
		// this.children.push(...newNodes);
		
		// Nếu element đã được build, append trực tiếp vào DOM luôn
		if (this.element) {
			this.element.append(...newNodes);
		}
		return this;
	}

	/**
	* Xóa sạch nội dung trong Body
	*/
	clear() {
		this.children = [];
		if (this.element) {
			this.element.innerHTML = '';
		}
		return this;
	}

	/**
	* Tạo cấu trúc DOM cho Body
	* @returns {HTMLElement}
	*/
	build() {
		return TagBuilder.create('div')
			.setAttributes({class: 'body__cover'})
			.append([
				TagBuilder.create('div')
					.setAttributes({class: 'body__content'})
					.append(this.children)
					.build()
				])
			.build(); 
	}

	/**
	* Render Body vào một container cụ thể
	* @param {string} selector - Selector của vùng chứa (ví dụ: .tsp__content)
	*/
	render(selector) {
		const container = DOMValidator.isElement(selector) ? selector :  document.querySelector(selector);
		if (container) {
			// Append vào thay vì thay thế hoàn toàn (vì Header thường nằm trên Body)
			// container.innerHTML = ''
			container.append(this.build());
		} else {
			console.warn(`Body: Không tìm thấy container "${selector}"`);
		}
}
}

export default Body;

