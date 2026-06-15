import WooCommerceModel from "../wooCommerceModel";

export default class CustomersModel extends WooCommerceModel {
   constructor() {
      super();
      this.api = '/wp-json/wc/v3/customers';
      this.storageName = 'cs_quotation';
      this.onlyLocal = true

   }
  
   async get( id ) {
      let params = id ? `/${id}` : '';
      let data = await super.get(params);
      let { _links, ...rest} = data;
      return rest;
   }
 
}

