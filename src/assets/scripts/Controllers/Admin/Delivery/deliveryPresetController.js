import PresetBaseController from '../presetBaseController'
import DeliveryPresetModel from '../../../Models/Admin/Delivery/deliveryPresetModel';
import DeliveryPresetViewer from '../../../Views/Admin/Delivery/deliveryPresetViewer';

/**
 * bộ điểu khiển template của Delivery
 */
export default class DeliveryPresetController extends PresetBaseController {
   constructor() {       
      super()    
      this.model = new DeliveryPresetModel();
      this.viewer = new DeliveryPresetViewer();
   }
   
}
