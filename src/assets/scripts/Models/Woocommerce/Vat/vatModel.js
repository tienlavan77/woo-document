// import WooCommerceModel from "../wooCommerceModel";
import Model from "../../model";

export default class VatModel extends Model {
   constructor() {
      super()
      this.api = '/wp-json/wc/v3/taxes';
      this.storageName = 'tax_vat';
      this.data = {};
   }   
}
