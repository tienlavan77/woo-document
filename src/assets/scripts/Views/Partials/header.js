import TagBuilder from '../../Vendor/helpers/tagBuilder' 
import DOMValidator from '../../Vendor/helpers/isNodeDom'

/**
 * Lớp Header - Tạo thành phần tiêu đề và các nút điều hướng/thao tác
 */
class Header {
   /**
      * @param {string} title - Tiêu đề của Header
      * @param {Array} children - Danh sách các phần tử (nút bấm, icon...) nằm bên phải tiêu đề
      */
   constructor(title = 'Default Title', children = []) {
      this.title = title;
      this.children = Array.isArray(children) ? children : [children];
      this.element = null; // Lưu trữ element sau khi tạo
      this.adminMenuBack = document.querySelector('#adminmenuback')     
   }

   /**
      * Tạo phần element tiêu đề (h3)
      * @returns {HTMLElement}
      */
   createTitle() {
      return TagBuilder.create('h3')
         .setAttributes({class:'header__title'})
         .html(this.title)
         .build();
   }

   /**
      * Tạo container chứa các phần tử con (nút bấm, handles)
      * @returns {HTMLElement|null}
      */
   createHandle() {
      if (this.children.length === 0) return null;
      return TagBuilder.create('div')
         .setAttributes({class:'header__handle'})
         .append(...this.children)
         .build()   
   }

   /**
      * Xây dựng cấu trúc hoàn chỉnh của Header
      * @returns {HTMLElement} - Trả về DOM element của Header
      */
   build() {
      // Tạo container bao ngoài cùng
      let collapse = this.adminMenuBack.clientWidth <= 36? 'collapse' : '';

      this.element = TagBuilder.create('div')
         .setAttributes({class: `header__cover ${collapse}`})
         .build();  

      // Thêm tiêu đề
      this.element.append(this.createTitle());

      // Thêm các handle nếu có children
      const handle = this.createHandle();
      if (handle) {
         this.element.append(handle);
      }

      return this.element;
   }

   /**
      * Gắn Header vào một vị trí cụ thể trong DOM
      * @param {string} selector - CSS Selector của nơi cần gắn Header vào
      */
   render(selector) {
      const container = DOMValidator.isElement(selector) ? selector : document.querySelector(selector);
      
      if (container) {
         // container.innerHTML = ''; // Xóa nội dung cũ trước khi render mới (tránh bị lặp)
         container.append(this.build());
      } else {
         console.warn(`Header: Không tìm thấy container với selector "${selector}"`);
      }
   }
   /**
    * Khởi tạo và gắn các thành phần vào DOM
    */
   init() {
      
      this.collapseBtn = document.querySelector('#collapse-button')   
   }
}

export default Header;

