/**
 * Lớp DataHelper - Cung cấp các phương thức kiểm tra dữ liệu dùng chung
 */
class DataChecker {
   /**
    * Kiểm tra xem một biến có phải là Object rỗng hay không
    * @param {any} obj - Đối tượng cần kiểm tra
    * @returns {boolean} - Trả về true nếu là {}, false nếu có dữ liệu hoặc không phải Object
    */
   static isEmpty(obj) {
      // 1. Kiểm tra nếu là null hoặc undefined
      if (obj === null || obj === undefined) return true;

      // 2. Đảm bảo đối tượng thuộc kiểu Object và không phải Array
      // (Vì trong JS, Array cũng có typeof là 'object')
      if (typeof obj !== 'object' || Array.isArray(obj)) return false;

      // 3. Kiểm tra số lượng key và constructor
      // Dùng Object.keys để lấy danh sách thuộc tính có thể liệt kê
      return (
         Object.keys(obj).length === 0 && obj.constructor === Object
      );
   }

   /**
    * Bạn có thể thêm các hàm tiện ích khác tại đây trong tương lai
    * Ví dụ: Kiểm tra một giá trị có phải là một node DOM hay không
    */
   static isDOM(el) {
      return el instanceof HTMLElement;
   }
   
   static isArray(arr) {
      return Array.isArray(arr);
   }
}

export default DataChecker;
