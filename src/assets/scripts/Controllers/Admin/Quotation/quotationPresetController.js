import PresetBaseController from '../presetBaseController';
import QuotationPresetModel from '../../../Models/Admin/Quotation/quotationPresetModel';
import QuotationPresetViewer from '../../../Views/Admin/Quotation/quotationPresetViewer';

/**
 * Bõ điều khiển template của Quotation
 */
export default class QuotationPresetController extends PresetBaseController {
   constructor() {       
      super()    
      this.model = new QuotationPresetModel();
      this.viewer = new QuotationPresetViewer();
   }
   
}
