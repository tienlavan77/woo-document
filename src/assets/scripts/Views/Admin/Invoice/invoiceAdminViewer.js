import AdminViewer from '../adminViewer.js';

/**
 * hiển thị giao tiên trên trang invoice
 */
export default class InvoiceAdminViewer extends AdminViewer{
   constructor() {
      super()
      this.id = 'tsp_invoice';
      this.header.title = 'VAT invoice';
   }
}
