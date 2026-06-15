/**
 * Lớp tiện ích xử lý chuỗi văn bản.
 */
export default class TextHelper {
	/**
		* Viết hoa chữ cái đầu tiên của một chuỗi.
		* * @param {any} str - Chuỗi đầu vào cần xử lý.
		* @returns {string} - Chuỗi đã được viết hoa chữ cái đầu, hoặc chuỗi rỗng nếu đầu vào không hợp lệ.
		*/
	static capitalize(str) {
			// 1. Kiểm tra kiểu dữ liệu: Nếu không phải string hoặc là chuỗi chỉ có khoảng trắng
			if (typeof str !== 'string' || !str.trim()) {
				return "";
			}

			// 2. Tối ưu: Loại bỏ khoảng trắng thừa ở hai đầu (trim) trước khi xử lý
			const trimmed = str.trim();

			/**
			 * 3. Xử lý chính:
			 * - charAt(0): Lấy ký tự đầu tiên.
			 * - toUpperCase(): Chuyển ký tự đó sang chữ hoa.
			 * - slice(1): Lấy toàn bộ phần còn lại từ vị trí thứ 2 (index 1).
			 */
			return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	}
	static randomString(length = 8) {
      return [...Array(length)]
        .map(() => Math.random().toString(36)[2])
        .join('');
   }
}