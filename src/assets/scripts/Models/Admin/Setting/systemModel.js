import Model from '../../model';
import StorageManager from '../../../Vendor/helpers/storageManager';

export default class SystemModel extends Model {
   constructor() {
      super();
      this.api = '/wp-json/tinsinhphat/v1/settings/system';
      this.onlyLocal = true;
   }

   async init() {
      this._token = StorageManager.get('_token');
      const response = await this.get();
      if (response?.status?.code === 200) {
         this.data = response.status.data || {};
      }
      return response;
   }

   async get() {
      return await this._httpGet(this.api, {
         'Authorization': `Bearer ${this._token}`
      });
   }

   async save() {
      const response = await this._httpPost(this.api, this.data, {
         'Authorization': `Bearer ${this._token}`
      });
      if (response?.status?.code === 200) {
         this.data = response.status.data || this.data;
      }
      return response;
   }

   async browse(path = '') {
      const query = path ? `?path=${encodeURIComponent(path)}` : '';
      return await this._httpGet(`${this.api}/browse${query}`, {
         'Authorization': `Bearer ${this._token}`
      });
   }
}
