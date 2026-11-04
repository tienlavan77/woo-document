// Provides module declarations and business logic for productModel.js.

import WooCommerceModel from '../wooCommerceModel';
import DataChecker from '../../../Vendor/helpers/dataChecker';

// Defines ProductModel class behavior for productModel.js.
export default class ProductModel extends WooCommerceModel {
   // Defines constructor method behavior for productModel.js.
   constructor(storageKey = 'products_quotation') {
      super();
      this.api = '/wp-json/wc/v3/products';
      this.storageName = storageKey;
      this.data = {};
      this.onlyLocal = true;
   }

   // Defines get method behavior for productModel.js.
   async get(params) {
      let data = await super.get(params);
      data = DataChecker.isArray(data) ? data : [data];
      let response = data.reduce((acc, item) => {
         return { ...acc, ...item };
      }, {});
      let { _links, brands, ...res } = response;
      return res;
   }

   // Defines checkExistSingle method behavior for productModel.js.
   checkExistSingle(item) {
      // Executes documented symbol logic in productModel.js.
      if (!this.data || Object.keys(this.data).length === 0) {
         return { parent: undefined, variation: undefined };
      }

      // Executes documented symbol logic in productModel.js.
      const parentId = item.parent_id || item.id;

      // Executes documented symbol logic in productModel.js.
      const parent = this.data[parentId];

      // Executes documented symbol logic in productModel.js.
      if (!parent || !item.parent_id || item.parent_id === 0) {
         return { parent, variation: undefined };
      }

      // Executes documented symbol logic in productModel.js.
      const variation = parent.variations ? parent.variations[item.id] : undefined;

      return { parent, variation };
   }

   // Defines checkExistList method behavior for productModel.js.
   checkExistList(products) {
      // Executes documented symbol logic in productModel.js.
      if (!this.data || Object.keys(this.data).length === 0) return false;

      // Executes documented symbol logic in productModel.js.
      return products.some(id => id in this.data);
   }
}
