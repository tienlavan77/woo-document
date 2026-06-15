import AdminViewer from '../adminViewer.js';

export default class QuotationAdminViewer extends AdminViewer {
   constructor() {
      super();

      // 1. Cấu hình thông tin cơ bản cho Viewer
      this.id = 'tsp_quotation';
      this.header.title = 'Quotation';
     
      /**
       * Lưu trữ các element để Controller có thể truy cập.
       * Khởi tạo object rỗng để tránh lỗi undefined trước khi init.
       */
      this.children = [];
   }

   
}
