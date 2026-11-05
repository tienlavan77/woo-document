/* Provides module implementation and exported declarations for httpClient.js. */
// Defines HttpClient class behavior for httpClient.js.
export default class HttpClient {
// Executes documented symbol logic in httpClient.js.
	static wpNonce = window.DocumentPluginConfig?.nonce || '';
	static defaultOptions = {
		mode: "cors",
		cache: "no-cache",
		credentials: "same-origin",
		headers: {
			"Content-Type": "application/json",
			'X-WP-Nonce': this.wpNonce , // Sử dụng nonce từ meta tag nếu có
			'X-TSP-Plugin-Request': 'document',
		},
		redirect: "follow",
		referrerPolicy: "no-referrer",
	};

	/* Executes documented symbol logic in httpClient.js. */
	static async request(url, customOptions = {}) {
		// Executes documented symbol logic in httpClient.js.
		const options = {
			...this.defaultOptions,
			...customOptions,
			headers: {
				...this.defaultOptions.headers,
				...(customOptions.headers || {}),
			},
		};

		// Executes documented symbol logic in httpClient.js.
		if (options.body instanceof FormData) {
			delete options.headers['Content-Type'];
		}

		try { 
			
			const response = await fetch(url, options);

			// Executes documented symbol logic in httpClient.js.
			const responseText = await response.text();
			let data;
			try {
				data = responseText ? JSON.parse(responseText) : {};
			} catch (parseError) {
				const serverMessage = responseText
					.replace(/<[^>]*>/g, ' ')
					.replace(/&(?:lt|gt|amp|quot|#039);/g, (entity) => ({
						'&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#039;': "'",
					}[entity] || entity))
					.replace(/\s+/g, ' ')
					.trim();
				throw new Error(serverMessage || `Máy chủ trả về dữ liệu không hợp lệ (${response.status}).`);
			}

			// Executes documented symbol logic in httpClient.js.
			if (!response.ok) {
				throw {
					status: {
					code: response.status,
					message: data.message || "Lỗi hệ thống",
					data: data
					}
				};
			}

			// Executes documented symbol logic in httpClient.js.
			return data;

		} catch (error) {
			if (import.meta.env.DEV) console.error(`[HttpClient Error] URL: ${url}`, error);
		
		// Executes documented symbol logic in httpClient.js.
			return (error.status) ? error : {
				status: {
					code: 500,
					message: error.message || "Không thể kết nối đến máy chủ",
					data: null
				}
			};
		}
	}

	/* Executes documented symbol logic in httpClient.js. */
	static get(url, headers = {}) {
		return this.request(url, { method: "GET", headers });
	}

	/* Executes documented symbol logic in httpClient.js. */
	static post(url, body, headers = {}) {
		const isFormData = body instanceof FormData;
		const options = {
			method: 'POST',
			headers: isFormData ? { ...headers } : { 'Content-Type': 'application/json', ...headers },
			body: isFormData ? body : JSON.stringify(body) // KHÔNG stringify FormData
    };
		return this.request(url, options);
	}

	// Defines put method behavior for httpClient.js.
	static put(url, body, headers = {}) {
		return this.request(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify(body),
		});
	}

	/* Executes documented symbol logic in httpClient.js. */
	static delete(url, body, headers = {}) {
		const options = {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify(body)
		};
		return this.request(url, options);
	}
}
