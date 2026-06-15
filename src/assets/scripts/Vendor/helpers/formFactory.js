import TagBuilder from './tagBuilder';
import DOMValidator from "./domValidator";

/**
 * Lớp tiện ích hỗ trợ tạo các thành phần giao diện (UI Components).
 */
export default class FormFactory {

    static tagBuilder = TagBuilder;

    static domValidator = DOMValidator;


    /**
     * Tạo một phần tử HTML dựa trên cấu hình truyền vào.
     * @param {Object} config - Cấu hình của element.
     * @param {string} config.tag - Tên thẻ (div, section, span...).
     * @param {string} [config.innerHTML] - Nội dung bên trong thẻ.
     * @param {Array} [config.children] - Danh sách các node con hoặc object cấu hình.
     * @param {Object} [attributes] - Các thuộc tính HTML khác (class, id, style...).
     * @returns {HTMLElement} Phần tử DOM hoàn chỉnh.
     */
    static create({ tag, innerHTML, children = [], ...attributes }) {
        // 1. Xử lý danh sách con: 
        // Nếu đã là Node DOM thì giữ nguyên, nếu là Object cấu hình thì TagBuilder.
        const processedChildren = children.map((child) => {
            // 1. Nếu đã là DOM Node thì trả về luôn
            if (this.domValidator.isElement(child)) return child;
         
            // 2. Nếu là Object cấu hình, dùng TagBuilder để xây dựng nó
            // Lưu ý: Cần truyền các thuộc tính từ child vào builder 
            return this.tagBuilder.create(child.tag)
               .setAttributes(child.attributes || {})
               .html(child.innerHTML || "") 
               .append(...(child.children || [])) // Đệ quy xử lý con của nó nếu cần
               .build();
            });
        // 2. Sử dụng buildTag để tạo element cha và gắn các node con vào
        const container = this.tagBuilder.create(tag)
            .setAttributes(attributes)
            .html(innerHTML)
            .append(processedChildren)
            .build();

            return container;
    }
    
    // Bạn có thể mở rộng thêm các method khác ở đây trong tương lai
    // static createButton(...) { ... }
}


