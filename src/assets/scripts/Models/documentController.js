import Controller from '../controller'
import DocumentModel from '../../Models/Documents/documentModel';
import DocumentViewer from '../../Views/Documents/documentViewer';

export default class DocumentController extends Controller {
   constructor() {
      super();
      this.viewer = new DocumentViewer();
      this.model = new DocumentModel();
      this.filesLoaded = false; // Tránh gọi API lấy danh sách file nhiều lần khi đóng/mở modal
      this.currentPage = 1;      // Theo dõi vị trí phân trang của trình quản lý file
      this.init();
   }

   /**
    * Khởi tạo các sự kiện và dữ liệu ban đầu
    */
   async init() {
      const thelist = document.querySelector('#the-list'); 
      if (!thelist) {
         if (import.meta.env.DEV) console.warn("DocumentController: Không tìm thấy phần tử #the-list để gắn sự kiện.");
         return;
      }

      this._addEventListenerToDocumentActions(thelist); // Gắn sự kiện click cho các hành động liên quan đến tài liệu
      await this.model.init()
   }
    
   /**
    * Sử dụng Event Delegation để lắng nghe các hành động trên danh sách đơn hàng
    * @param {HTMLElement} thelist - Phần tử cha chứa danh sách đơn hàng
    * @private
    */
   _addEventListenerToDocumentActions(thelist) {      
         thelist.addEventListener('click', (e) => {
         // Sử dụng Event Delegation để bắt các hành động sinh ra động (nút xóa, tên file mới)
         const actionTarget = e.target.closest('.uploadToDocument') || e.target.closest('.delete__button');
      
         if (actionTarget) {               
            e.preventDefault();
            const parent = actionTarget.closest('.order--document');
            let dataDocument = parent.document || JSON.parse(parent.dataset.document);    
            if (! parent.document) {
               parent.document = dataDocument; // Lưu dữ liệu vào thuộc tính tùy chỉnh của phần tử
               delete parent.dataset.document; // Xóa dataset sau khi đã lưu dữ liệu vào thuộc tính tùy chỉnh
            }                      
            this.handleDocumentLinks(actionTarget, dataDocument);
         }
      });
   }

   /**
    * Dispatcher: Điều phối hành động dựa trên thuộc tính data-action của phần tử HTML
    * @param {HTMLElement} target - Phần tử HTML kích hoạt sự kiện
    * @param {Object} documentData - Dữ liệu tài liệu gắn liền với dòng đơn hàng
    */
   handleDocumentLinks( target, documentData) {
      // Ánh xạ chuỗi action (vd: previewDocument) thành việc gọi phương thức tương ứng trong class
      let action = target.dataset.action;
      if (this[action]) {
         this[action](target, documentData);
      } else {
         if (import.meta.env.DEV) console.warn(`[DocumentController] Action "${action}" not found.`);
      }
   }

   /**
    * Xử lý xóa tài liệu gắn liền với đơn hàng
    */
   async deleteDocument(target, documentData) { // Đồng bộ tên hàm với data-action="deleteDocument"
      this.viewer.yesNoQuestionModal({
         title: 'Xác nhận gỡ bỏ',
         message: `Bạn có chắc chắn muốn gỡ bỏ tài liệu này khỏi đơn hàng #${documentData.ID}?`,
         yes: async () => {
            const typeMap = {
               vatDocument: 'invoice',
               orderDocument: 'quotation',
               deliveryDocument: 'delivery'
            };

            this.viewer.showNotice('Đang gỡ tài liệu...', 'info');
            const res = await this.model.unassignDocument({
               order_ids: [documentData.ID],
               doc_type: typeMap[documentData.name] || documentData.name
            });

            if (res?.status?.code === 200) {
               this.viewer.showNotice('Đã gỡ tài liệu thành công!', 'success');
               this.viewer.modal.close();
               this.viewer.resetOrderRow(documentData.ID, documentData.name);
            } else {
               this.viewer.showNotice(res?.status?.message || 'Không thể gỡ tài liệu lúc này.', 'error');
            }
         }
      });
   }

   /**
    * Xử lý hiển thị Modal Upload và Quản lý file
    * @param {HTMLElement} target - Nút bấm kích hoạt
    * @param {Object} documentData - Thông tin đơn hàng mục tiêu
    */
   async uploadDocument(target, documentData) {      
      let listOrders = this._getOrdersNoDocument(documentData);

      // Đăng ký các "lời hứa" (callbacks) để Viewer thực thi khi có sự kiện từ phía người dùng
      // Điều này giữ cho Viewer hoàn toàn "ngu ngơ" về logic nghiệp vụ, chỉ biết báo cáo sự kiện lên Controller
      this.viewer.showUploadModal(documentData, listOrders.list, {
         onConfirm: async (orderIds) => {
            await this._handleAssign(this.viewer.selectedFilePath, orderIds, documentData.name);
         },
         onLoadMore: async () => {
            this.currentPage++;
            await this._loadFilesToManager(true);
         },
         onAutoUpload: async (file) => {
            this.viewer.showNotice('Đang tự động tải file lên...', 'info');
            const res = await this.model.uploadFile(file);
            if (res?.status?.code === 200) {
               this.viewer.showNotice('Tải lên thành công!', 'success');
               this.viewer.prependFile(res.status.data);
            } else {
               this.viewer.showNotice(res?.status?.message || 'Lỗi tải file', 'error');
            }
         }
      });

      // Chỉ load danh sách file từ server nếu chưa có dữ liệu trong phiên làm việc này
      if (!this.filesLoaded) {
         this.currentPage = 1;
         await this._loadFilesToManager();
      }
   }

   /**
    * Tải danh sách file từ server và yêu cầu Viewer hiển thị lên Grid
    * @param {boolean} append - Nếu true sẽ nối thêm dữ liệu, false sẽ làm mới Grid
    * @private
    */
   async _loadFilesToManager(append = false) {
      const res = await this.model.getFiles(this.currentPage, 12);
      if (res?.status?.code === 200) {
         this.viewer.renderFileList(res.status.data.files, append);
         this.viewer.toggleLoadMore(res.status.data.has_more);
         this.filesLoaded = true;
      }
   }

   /**
    * Thực hiện yêu cầu gán tài liệu cho các đơn hàng qua API
    * @param {string} relativePath - Đường dẫn tương đối của file
    * @param {number[]} orderIds - Danh sách ID đơn hàng cần gán
    * @param {string} docName - Loại tài liệu (orderDocument, vatDocument...)
    * @private
    */
   async _handleAssign(relativePath, orderIds, docName) {
      // Ánh xạ tên thuộc tính từ UI sang định dạng DocType mà API yêu cầu
      const typeMap = { 
         vatDocument: 'invoice',
         orderDocument: 'quotation',
         deliveryDocument: 'delivery'
      };

      this.viewer.showNotice('Đang gán tài liệu...', 'info');
      const res = await this.model.assignDocument({
         relative_path: relativePath,
         order_ids: orderIds,
         doc_type: typeMap[docName] || docName
      });

      if (res?.status?.code === 200) {
         this.viewer.showNotice('Gán tài liệu thành công!', 'success');
         this.viewer.modal.close();
         this.viewer.updateOrderRows(orderIds, relativePath, docName);
      } else {
         this.viewer.showNotice(res?.status?.message || 'Lỗi gán tài liệu', 'error');
      }
   }

   /**
    * Xử lý xem trước tài liệu PDF trong Modal
    * @param {HTMLElement} target - Nút bấm kích hoạt
    * @param {Object} documentData - Dữ liệu chứa thông tin file
    */
   async previewDocument(target, documentData) {
      // Thêm hiệu ứng loading cho icon/button (giả sử dùng class CSS 'is-loading')
      target.classList.add('is-loading');
      target.style.opacity = '0.5';
      target.style.pointerEvents = 'none';

      // Sử dụng model để lấy thông tin file (đường dẫn tuyệt đối chính xác từ server)
      const response = await this.model.getFileDetail(documentData.file);

      target.classList.remove('is-loading');
      target.style.opacity = '1';
      target.style.pointerEvents = 'auto';

      if (response && response.status && response.status.code === 200) {
         const fileInfo = response.status.data;
         // Chỉ mở modal khi đã có URL chính xác từ API
         this.viewer.showPreviewModal(documentData, fileInfo.url);
      } else {
         if (import.meta.env.DEV) console.error("Không thể lấy thông tin file:", response?.status?.message || "Lỗi không xác định");
      }
   }
   
   /**
    * Lọc danh sách các đơn hàng chưa có tài liệu cùng loại trên giao diện hiện tại
    * @param {Object} documentData - Dữ liệu của đơn hàng đang được click
    * @returns {Object} { idClick: number, list: number[] }
    * @private
    */
   _getOrdersNoDocument(documentData) {
      // Logic để lấy tất cả các đơn hàng chưa được upload tài liệu có cùng key với documentData
      let idClick = documentData.ID; // Giả sử documentData chứa thông tin về đơn hàng hiện tại
      const key = documentData.name; 
      const allOrders = document.querySelectorAll('.order--document'); // Giả sử các đơn hàng có class 'order--document'
      
      let ordersWithDocument =[...allOrders].reduce((acc, order) => {
         let data = order.document || JSON.parse(order.dataset.document);
         if (data.name === key && data.ID !== idClick && data.file =='') { // Kiểm tra nếu đơn hàng có cùng key và khác ID của đơn hàng hiện tại
            acc.push(data.ID); // Giả sử mỗi đơn hàng có thuộc tính ID
         }
         return acc;
      }, []);
     
      return {
         idClick,
         list: ordersWithDocument
      }
   }
}
