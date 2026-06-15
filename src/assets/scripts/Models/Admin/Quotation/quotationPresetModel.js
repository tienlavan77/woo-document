import Model from '../../model';

export default class QuotationPresetModel extends Model {
   constructor() {
      super()
      this.slug = 'templateone'
      this.api = `/wp-json/tinsinhphat/v1/template/quotations/${this.slug}`;
      this.storageName = 'template_quotation';	
   }
}
