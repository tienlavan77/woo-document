import AdminController from '../adminController'
import DeliveryAdminViewer from '../../../Views/Admin/Delivery/deliveryAdminViewer'
import DeliveryAdminModel from '../../../Models/Admin/Delivery/deliveryModel'
import DeliveryPresetController from './deliveryPresetController'

export default class DeliveryAdminController extends AdminController {
   constructor() {
      super()
      this.viewer = new DeliveryAdminViewer()
      this.model = new DeliveryAdminModel()      
      this.preset = new DeliveryPresetController() // Cần template controller nếu có
      this.type = 'delivery';
      this.init()
   }

   async init() {

      this.setupPanel()

      // 1. Khởi tạo giao diện chính
      await this.preset.init({
         customer: this.model.customer?.data || {}, 
         products: this.model.products?.data || {},
      });

      this.viewer.body.children = [
            this.preset.viewer.body,
            this.panel.viewer.body
         ];

      this.panel.init(this.preset.viewer.body);

      this.viewer.init();      
      this.initDataTracking();
      // Nếu có panel và template, gọi initDataTracking      
      // if (this.panel && this.template) {
      //    this.initDataTracking();
      // }

      console.log("DeliveryController: Initialization completed.");
  }
   _clearAllData() {
      this._clearCustomer(this.preset.viewer.body);
      this._clearProducts(this.preset.viewer.body);     
      this.channel.emit('customer', { type: this.type,  action: 'delclearete' });
      this.channel.emit('product', { type: this.type,  action: 'clear' });
   }

   /**
    * Override hàm từ lớp cha: Tự động chạy khi có tín hiệu 'delivery' từ tab khác
    * @param {Object} payload Dữ liệu nhận được từ tab khác
    */
   onSyncDelivery({ type, action }) {       
      if (type === 'order') {     
         this.model.customer.data = this.model.customer._getStorage();
         this.model.products.data = this.model.products._getStorage();
         this.preset.viewer._renderCustomer(this.model.customer.data);
         this._refreshProductListPreset();
      }
   }  
}
