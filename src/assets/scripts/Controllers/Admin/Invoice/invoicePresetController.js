import PresetBaseController from '../presetBaseController';
import InvoicePresetViewer from '../../../Views/Admin/Invoice/invoicePresetViewer.js';
import InvoicePresetModel from "../../../Models/Admin/Invoice/invoicePresetModel.js";

export default class InvoicePresetController extends PresetBaseController {
   constructor() {
      super()
      this.model = new InvoicePresetModel()
      this.viewer = new InvoicePresetViewer()
      
     
   }
}
