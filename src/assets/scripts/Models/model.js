import StorageManager from '../Vendor/helpers/storageManager';
import HttpClient from '../Vendor/helpers/httpClient';

export default class Model {
   constructor() {
      this.api = '';
      this.data = {};
      this.storageName = '';
		this.onlyLocal = false;
		this._token = ''		
   }

   /**
	 * Khởi tạo dữ liệu ban đầu
	 * Ưu tiên lấy từ LocalStorage, nếu không có mới gọi API từ Server.
	 */
	async init() {
		try {
			// 1. Thử đọc dữ liệu từ bộ nhớ cục bộ
			if (! this.storageName) return;
			const localData = this._getStorage();
			
			// đọc token từ localStorage
			this._token = StorageManager.get('_token')

			if (localData) {
				this.data = localData;				
				if (import.meta.env.DEV) console.log(`[Model] Loaded from LocalStorage: ${this.storageName}`);
			} else {
				// 2. Nếu không có, tải từ Server
				
				if (! this.onlyLocal ) await this.get();
			} 
		} catch (error) {
			if (import.meta.env.DEV) console.error("[Model] Lỗi khởi tạo dữ liệu:", error); 
		}
	}

	/**
	 * Tải dữ liệu từ Server (GET)
	 */
	async get() {
		try {
			// Giả định fchRequest trả về { status: { data: ... } }
			
			const response = await this._httpGet(this.api, {'Authorization': `Bearer ${this._token}`});			
			
			if (response && response.status && response.status.data) {
				this.data = response.status.data;
				// Lưu lại vào LocalStorage để sử dụng nhanh cho lần sau (Cache)
				
				this.saveLocal();
				//.set(this.storageName, this.data);
			}

			return response;
		} catch (error) {
			if (import.meta.env.DEV) console.error("[Model] Không thể tải dữ liệu từ API:", error);
		}
	}

	/**
	 * Lưu dữ liệu vào cả LocalStorage và Server
	 * @returns {Object} Kết quả phản hồi từ Server
	 */
	async save() {
		try {
			// 1. Lưu vào LocalStorage ngay lập tức để đảm bảo trải nghiệm người dùng nhanh
			this.saveLocal();

			// 2. Gửi dữ liệu lên Server
			const response = await this._saveToServer(this.data);
			return response;
		} catch (error) {
			if (import.meta.env.DEV) console.error("[Model] Lỗi khi lưu dữ liệu:", error);
			return { status: { code: 500, message: "Lỗi kết nối Server" } };
		}
	}

	/**
	 * Helper gửi yêu cầu POST lên Server (Private method)
	 */
	async _saveToServer(data) {
		return await this._httpPost(this.api, data, {'Authorization': `Bearer ${this._token}`});
	}

	_getStorage() {
		if (! this.storageName) return
		return StorageManager.get(this.storageName);
	}

	_setStorage(data) {	
		if (! this.storageName) return	
		return StorageManager.set(this.storageName, data);
	}
	_deleteStorage() {
		if (! this.storageName) return
		return StorageManager.remove(this.storageName);
	}

	_httpGet(url, headers = {}) {	
		return HttpClient.get(url, headers);
	}

	_httpPost(url, data, headers = {}) {
		return HttpClient.post(url, data, headers);
	}

	_httpDelete(url, data, headers = {}) {
		return HttpClient.delete(url, data, headers);
	}

	saveLocal() {
      return this._setStorage(this.data);
   }
}
