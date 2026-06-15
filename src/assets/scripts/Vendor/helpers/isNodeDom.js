/**
 * Lớp tiện ích cung cấp các phương thức kiểm tra kiểu dữ liệu DOM.
 */
class DOMValidator {
  /**
   * Kiểm tra một đối tượng có phải là một Element DOM hay không.
   * @param {*} element - Đối tượng cần kiểm tra.
   * @returns {boolean} - Trả về true nếu là Element, ngược lại là false.
   */
  static isElement(element) {
      // Kiểm tra xem element có tồn tại và có phải là một instance của Element không.
      // typeof Element !== 'undefined' giúp tránh lỗi trong môi trường không phải trình duyệt (như Node.js).
      return (
          element !== null &&
          typeof Element !== 'undefined' &&
          element instanceof Element
      );
  }

  /**
   * Ví dụ mở rộng: Kiểm tra xem có phải là Text Node không
   */
  static isTextNode(node) {
      return node && node.nodeType === Node.TEXT_NODE;
  }
}

export default DOMValidator;