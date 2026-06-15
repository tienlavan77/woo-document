import AdminViewer from '../adminViewer.js';

export default class DeliveryAdminViewer extends AdminViewer {
   constructor() {
      super()
      // 1. Cấu hình thông tin cơ bản cho Viewer
      this.id = 'tsp_delivery';
      this.header.title = 'Delivery';
   }
   updateVatSummaryPreset(data) {
      return 
   }
}
