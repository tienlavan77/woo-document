import Model from '../../model';

export default class DeliveryPresetModel extends Model {
   constructor() {
      super()
      this.slug = 'delivery'
      this.api = `/wp-json/tinsinhphat/v1/template/deliveries/${this.slug}`;
      console.log(this.api)
      this.storageName = 'template_delivery';	
   }
}
 