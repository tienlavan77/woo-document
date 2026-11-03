import WooCommerceModel from '../wooCommerceModel';

export default class CustomersModel extends WooCommerceModel {
   constructor(storageKey = 'cs_quotation') {
      super();
      this.api = '/wp-json/wc/v3/customers';
      this.storageName = storageKey;
      this.onlyLocal = true;
   }

   async get(id) {
      let params = id ? `/${id}` : '';
      let data = await super.get(params);
      let { _links, ...rest } = data;
      return rest;
   }
}
