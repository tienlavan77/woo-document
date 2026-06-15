/**
 * HttpClient: Lớp tiện ích xử lý các yêu cầu HTTP (Fetch API)
 * Quản lý cấu hình mặc định, xử lý lỗi tập trung và chuẩn hóa dữ liệu trả về.
 */
export default class HttpClient {
// Cấu hình mặc định cho Fetch
	static wpNonce = document.querySelector('meta[name="wp-api-nonce"]')?.getAttribute('content') || '';
	static defaultOptions = {
		mode: "cors",
		cache: "no-cache",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json",
			'X-WP-Nonce': this.wpNonce , // Sử dụng nonce từ meta tag nếu có
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
	};

	/**
	* Phương thức lõi để thực thi Fetch
	* @param {string} url - Đường dẫn API
	* @param {Object} customOptions - Các tùy chỉnh như method, body, headers
	* @returns {Promise<Object>} - Dữ liệu đã được chuẩn hóa
	*/
	static async request(url, customOptions = {}) {
		// Hợp nhất cấu hình mặc định và cấu hình tùy chỉnh
		const options = {
			...this.defaultOptions,
			...customOptions,
			headers: {
				...this.defaultOptions.headers,
				...(customOptions.headers || {}),
			},
		};

		// FIX: Nếu body là FormData, ta PHẢI xóa Content-Type header.
		// Trình duyệt sẽ tự động thiết lập multipart/form-data kèm theo boundary.
		if (options.body instanceof FormData) {
			delete options.headers['Content-Type'];
		}

		try { 
			
			const response = await fetch(url, options);

			// Chuyển đổi dữ liệu sang JSON
			const data = await response.json();

			// Nếu HTTP status không nằm trong khoảng 200-299
			if (!response.ok) {
				throw {
					status: {
					code: response.status,
					message: data.message || "Lỗi hệ thống",
					data: data
					}
				};
			}

			// Trả về dữ liệu thành công theo cấu trúc Model mong đợi
			// Nếu server đã trả về đúng cấu trúc { status: { code, data } } thì trả về data luôn
			return data;

		} catch (error) {
			if (import.meta.env.DEV) console.error(`[HttpClient Error] URL: ${url}`, error);
		
		// Chuẩn hóa đối tượng lỗi để không làm hỏng logic của Model/Controller
			return (error.status) ? error : {
				status: {
					code: 500,
					message: error.message || "Không thể kết nối đến máy chủ",
					data: null
				}
			};
		}
	}

	/**
	* Phím tắt cho GET Request
	*/
	static get(url, headers = {}) {
		return this.request(url, { method: "GET", headers });
	}

	/**
	* Phím tắt cho POST Request
	*/
	static post(url, body, headers = {}) {
		const isFormData = body instanceof FormData;
		const options = {
			method: 'POST',
			headers: isFormData ? { ...headers } : { 'Content-Type': 'application/json', ...headers },
			body: isFormData ? body : JSON.stringify(body) // KHÔNG stringify FormData
    };
		return this.request(url, options);
	}

	/**
	* Phím tắt cho DELETE Request
	*/
	static delete(url, body, headers = {}) {
		const options = {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify(body)
		};
		return this.request(url, options);
	}
}
