import AdminController from "../adminController";
import InvoiceAdminModel from "../../../Models/Admin/Invoice/invoiceModel";
import InvoiceAdminViewer from "../../../Views/Admin/Invoice/invoiceAdminViewer";
import InvoicePresetController from "./invoicePresetController";
import ExcelExporter from "../../../Vendor/helpers/excelExporter";

export default class InvoiceAdminController extends AdminController {
   constructor() {
      super()
      this.model = new InvoiceAdminModel()
      this.viewer = new InvoiceAdminViewer()
      this.preset = new InvoicePresetController()
      this.model.data = this._vatCalculating();
      this.type = 'invoice';
      this.excel = new ExcelExporter({
         defaultFilename: 'vatInvoice.xlsx',
         defaultSheetName: 'Hóa đơn'
      })      
      this.init()
   }
   init() {
      this.setupPanel()
      super.init()
      this._setPanelButton()
   }
   _setPanelButton() {
      if(! this.panel.viewer) return
      this.panel.viewer.btnPrint.innerText = 'Export excel'
      this.panel.viewer.btnPrint.setAttribute('data-action','exportExcel')
   }
   /**
    * Override hàm từ lớp cha: Tự động chạy khi có tín hiệu 'invoice' từ tab khác
    * @param {Object} payload Dữ liệu nhận được từ tab khác
    */
   onSyncInvoice({ type, action }) { 
      if (type === 'customer') {
         // Cập nhật khách hàng từ Storage và vẽ lại
         this.model.customer.data = this.model.customer._getStorage();
         this.preset.viewer._renderCustomer(this.model.customer.data);
      } else if (type === 'product') {
         // Cập nhật sản phẩm từ Storage và vẽ lại danh sách
         this.model.products.data = this.model.products._getStorage();
         this._refreshProductListPreset();
      } else if (type === 'order') {
         this.model.customer.data = this.model.customer._getStorage();
         this.model.products.data = this.model.products._getStorage();
         this.preset.viewer._renderCustomer(this.model.customer.data);
         this._refreshProductListPreset();
      }
   }
   exportExcel() {
      try {
         this.excel.fromTable('vatinvoice', 'vatinvoice');
      } catch (error) {
         console.error('Error exporting Excel:', error);
      }
   }  
}
