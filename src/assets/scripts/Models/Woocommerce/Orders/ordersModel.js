import WooCommerceModel from "../wooCommerceModel";

export default class OrdersModel extends WooCommerceModel {
	constructor() {
		super();
      this.api = '/wp-json/wc/v3/orders';
      this.storageName = '';
		this.onlyLocal = true		
	}

}