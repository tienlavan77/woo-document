import WooCommerceModel from '../wooCommerceModel';
import DataChecker from '../../../Vendor/helpers/dataChecker';

export default class ProductModel extends WooCommerceModel {
   constructor(storageKey = 'products_quotation') {
      super();
      this.api = '/wp-json/wc/v3/products';
      this.storageName = storageKey;
      this.data = {};
      this.onlyLocal = true;
   }

   async get(params) {
      let data = await super.get(params);
      data = DataChecker.isArray(data) ? data : [data];
      let response = data.reduce((acc, item) => {
         return { ...acc, ...item };
      }, {});
      let { _links, brands, ...res } = response;
      return res;
   }

   checkExistSingle(item) {
      // 1. Guard clause: Kiểm tra Object rỗng
      if (!this.data || Object.keys(this.data).length === 0) {
         return { parent: undefined, variation: undefined };
      }

      // 2. Xác định nhanh ID cha
      const parentId = item.parent_id || item.id;

      // 3. Tìm cha: Truy xuất trực tiếp bằng Key (Tốc độ O(1) - cực nhanh)
      const parent = this.data[parentId];

      // 4. Trả về ngay nếu không thấy cha hoặc item chính là sản phẩm cha
      // (Sản phẩm đơn giản thường có parent_id = 0 hoặc undefined)
      if (!parent || !item.parent_id || item.parent_id === 0) {
         return { parent, variation: undefined };
      }

      // 5. Tìm biến thể: Truy xuất trực tiếp O(1) từ Object variations
      // Không dùng .find() nữa vì variations lúc này là Object { id: { ... } }
      const variation = parent.variations ? parent.variations[item.id] : undefined;

      return { parent, variation };
   }

   checkExistList(products) {
      // 1. Kiểm tra nếu this.data chưa có dữ liệu (Object rỗng)
      if (!this.data || Object.keys(this.data).length === 0) return false;

      // 2. products là mảng ID, dùng .some() để kiểm tra
      // id in this.data có tốc độ cực nhanh (O(1) cho mỗi lần check)
      return products.some(id => id in this.data);
   }
}
