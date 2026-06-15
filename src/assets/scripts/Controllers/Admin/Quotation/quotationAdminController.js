import AdminController from '../adminController';
import QuotationAdminModel from '../../../Models/Admin/Quotation/quotationModel';
import QuotationAdminViewer from '../../../Views/Admin/Quotation/quotationAdminViewer';
import QuotationPresetController from './quotationPresetController'

/**
 * QuotationController: Quản lý logic nghiệp vụ chính của trang báo giá.
 * Xử lý tương tác người dùng, tính toán thuế/tổng tiền, và đồng bộ dữ liệu giữa các tab.
 */
export default class QuotationAdminController extends AdminController {
   constructor() {
      super()
      this.model = new QuotationAdminModel()
      this.viewer = new QuotationAdminViewer()
      this.preset = new QuotationPresetController()
      this.model.data = this._vatCalculating();
      this.type = 'quotation';
      this.init()
   }
   
   // =====================================================================
   // 1. ĐỒNG BỘ DỮ LIỆU (BROADCAST CHANNEL)
   // =====================================================================

   /**
    * Override hàm từ lớp cha: Tự động chạy khi có tín hiệu 'quotation' từ tab khác
    * @param {Object} payload Dữ liệu nhận được từ tab khác
    */
   onSyncQuotation({ type, action }) { 
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

}
