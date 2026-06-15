import Model from "../../model";

export default class InvoicePresetModel extends Model {
   constructor() {
      super()
      this.slug = 'vatinvoice'
      this.api = `/wp-json/tinsinhphat/v1/template/invoice/${this.slug}`;
      this.storageName = 'template_invoice';	
   }
}
