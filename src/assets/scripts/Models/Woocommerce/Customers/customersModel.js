// Provides module declarations and business logic for customersModel.js.

import WooCommerceModel from '../wooCommerceModel';

// Defines CustomersModel class behavior for customersModel.js.
export default class CustomersModel extends WooCommerceModel {
   // Defines constructor method behavior for customersModel.js.
   constructor(storageKey = 'cs_quotation') {
      super();
      this.api = '/wp-json/wc/v3/customers';
      this.storageName = storageKey;
      this.onlyLocal = true;
   }

   // Defines get method behavior for customersModel.js.
   async get(id) {
      let params = id ? `/${id}` : '';
      let data = await super.get(params);
      let { _links, ...rest } = data;
      return rest;
   }
}
