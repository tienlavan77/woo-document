import Controller from '../controller.js'
import DocumentModel from '../../Models/Documents/documentModel.js';
import DocumentViewer from '../../Views/Documents/documentViewer.js';
import TextHelper from '../../Vendor/helpers/textHelper.js';
import TagBuilder from '../../Vendor/helpers/tagBuilder.js';
import { FILE_PDF_ICON } from '../../Vendor/dragdropfile/filesSVGIcon.js';

export default class DocumentController extends Controller {
   constructor() {
      super();
      this.viewer = new DocumentViewer();
      this.model = new DocumentModel();
      this.filesLoaded = false; // Tránh gọi API lấy danh sách file nhiều lần khi đóng/mở modal
      this.currentPage = 1;      // Theo dõi vị trí phân trang của trình quản lý file
      this.documentPreviewCache = new Map();
      this.documentPreviewRequests = new Map();
      this.init();
   }

   /**
    * Khởi tạo các sự kiện và dữ liệu ban đầu
    */
   async init() {
       await this.model.init()
      // xác định phần từ #pagenow để quyết định phương án xử lý
      const pagenow = document.querySelector('#pagenow');
      if (!pagenow) {
         if (import.meta.env.DEV) console.warn("DocumentController: Không tìm thấy phần tử #pagenow để xác định trang hiện tại.");
         return;
      }

      const { page, type } = JSON.parse(pagenow.dataset.page);

      // 2. Tạo key để định danh controller (Ví dụ: "edit" + "Product" = "editProduct")
      // Lưu ý: Sử dụng TextHelper để chuẩn hóa string nếu cần
      const controllerKey = `${page}${TextHelper.capitalize(type)}Init`;
      console.log(`DocumentController: Xác định controller key là "${controllerKey}"`);
      // 3. Gọi hàm khởi tạo tương ứng nếu tồn tại
      if (typeof this[controllerKey] === 'function') {
         await this[controllerKey]();
      } else {
         if (import.meta.env.DEV) console.warn(`DocumentController: Không tìm thấy phương thức khởi tạo cho key "${controllerKey}".`);
      }

   }

   editOrderInit() {
      // Logic khởi tạo cho trang postOrder
      let thelist = document.querySelector('#the-list');
      if (!thelist) {
         if (import.meta.env.DEV) console.warn("DocumentController: Không tìm thấy phần tử #the-list để gắn sự kiện.");
         return;
      }
      this._addEventListenerToDocumentActions(thelist); // Gắn sự kiện click cho các hành động liên quan đến tài liệu
   }

   async postOrderInit() {
      this.orderId = this._getCurrentOrderId();
      if (!this.orderId) return;

      const response = await this.model.getOrderDocuments(this.orderId);
      if (response?.status?.code !== 200) return;

      this.orderDocuments = response.status.data.documents || {};
      this._renderOrderDocumentCards();
   }

   _getCurrentOrderId() {
      const postId = document.querySelector('#post_ID')?.value;
      const queryId = new URLSearchParams(window.location.search).get('post');
      const orderId = parseInt(postId || queryId || '', 10);
      return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
   }

   _renderOrderDocumentCards() {
      const mount = this._getOrderDocumentMount();
      if (!mount) return;

      const { host, anchor } = mount;
      host.classList.add('tsp-order-data-host');

      let cards = host.querySelector('.tsp-order-document-cards');
      if (!cards) {
         cards = document.createElement('div');
         cards.className = 'tsp-order-document-cards';
         cards.addEventListener('click', (event) => this._handleOrderDocumentClick(event));

         if (anchor) {
            anchor.insertAdjacentElement('afterend', cards);
         } else {
            host.appendChild(cards);
         }
      }

      cards.innerHTML = '';
      Object.entries(this.orderDocuments || {}).forEach(([type, documentData]) => {
         const file = documentData.file || '';
         const card = TagBuilder.create('div').setAttributes({
            className: `tsp-order-document-card ${file ? 'has-file' : 'is-empty'}`,
            'data-document-type': type,
         }).build();
         const title = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-title' })
            .text(documentData.title).build();
         const trigger = TagBuilder.create('button').setAttributes({
            type: 'button',
            className: 'tsp-order-document-trigger',
            'data-action': file ? 'previewDocument' : 'uploadDocument',
            'aria-label': `${file ? 'Mở' : 'Tải'} ${documentData.title}`,
         }).build();

         if (file) {
            const icon = TagBuilder.create('span').setAttributes({
               className: 'tsp-order-document-icon is-pdf',
               'aria-hidden': 'true',
            }).html(FILE_PDF_ICON).build();
            const filename = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-file' })
               .text(file.split('/').pop()).build();
            trigger.append(icon, filename);
         } else {
            const plusBox = TagBuilder.create('span').setAttributes({
               className: 'tsp-order-document-plus-box',
               'aria-hidden': 'true',
            }).append([
               TagBuilder.create('span').setAttributes({ className: 'dashicons dashicons-plus-alt2' }).build()
            ]).build();
            trigger.append(plusBox);
         }

         card.append(title, trigger);
         cards.appendChild(card);
      });
   }

   _getOrderDocumentMount() {
      const orderData = document.querySelector('#order_data.woocommerce-order-data, #woocommerce-order-data, .woocommerce-order-data');
      const customerField = orderData?.querySelector('#customer_user')?.closest('.wc-customer-user, .form-field')
         || document.querySelector('#customer_user')?.closest('.wc-customer-user, .form-field');

      if (customerField) {
         return {
            host: customerField.closest('.order_data_column') || customerField.parentElement,
            anchor: customerField,
         };
      }

      // Fallback cho markup WooCommerce cũ hoặc custom order screen.
      const totalsTable = document.querySelector('.wc-order-totals');
      if (!totalsTable) return null;

      return {
         host: totalsTable.closest('.wc-order-data-row') || totalsTable.parentElement,
         anchor: null,
      };
   }

   _handleOrderDocumentClick(event) {
      const target = event.target.closest('.tsp-order-document-trigger');
      if (!target) return;

      const type = target.closest('.tsp-order-document-card')?.dataset.documentType;
      const documentData = this.orderDocuments?.[type];
      if (!documentData) return;

      event.preventDefault();
      this.handleDocumentLinks(target, {
         ID: this.orderId,
         name: documentData.name,
         title: documentData.title,
         file: documentData.file || '',
         type,
      });
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
      // Logic để hiển thị tài liệu dựa trên documentData
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
   async deleteDocument(target, documentData, options = {}) { // Đồng bộ tên hàm với data-action="deleteDocument"
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
         this._clearDocumentPreviewCache(documentData.file);
         this.viewer.modal.close();
         this.viewer.resetOrderRow(documentData.ID, documentData.name);
         this._resetOrderDocumentCard(documentData.name);
         if (options.openUpload) {
            await this.uploadDocument(null, { ...documentData, file: '' });
         }
      } else {
         this.viewer.showNotice(res?.status?.message || 'Không thể gỡ tài liệu lúc này.', 'error');
      }
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
         },
         deleteFile: async (path, file, selectedFile) => {
            this.viewer.showNotice(`Xoá file ${file}`, 'info')
            const res = await this.model.deleteFile(path);
             if (res?.status?.code === 200) {
               this.viewer.showNotice('Xoá file thành công!', 'success');
               this._clearDocumentPreviewCache(path);
               selectedFile.remove()
            } else {
               this.viewer.showNotice(res?.status?.message || 'Lỗi tải file', 'error');
            }
         }
      }, {
         singleOrder: Boolean(this.orderId)
      });

      // Mỗi lần mở modal tải lại trang đầu để nhận file mới nhất từ cả hai thư mục.
      this.currentPage = 1;
      this.filesLoaded = false;
      await this._loadFilesToManager();
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
         this._updateOrderDocumentCard(relativePath, docName);
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

      // Lấy metadata trước để server chuẩn hóa đường dẫn file.
      const response = await this.model.getFileDetail(documentData.file);

      target.classList.remove('is-loading');
      target.style.opacity = '1';
      target.style.pointerEvents = 'auto';

      if (response && response.status && response.status.code === 200) {
         const fileInfo = response.status.data;
         // Fetch có Authorization rồi nhúng Blob URL vì PDFObject không gửi custom header.
         try {
            const securedUrl = await this._getDocumentPreviewUrl(fileInfo);
            this.viewer.showPreviewModal(documentData, securedUrl, {
               onRemove: () => this.deleteDocument(null, documentData, { openUpload: true })
            });
         } catch (error) {
            if (import.meta.env.DEV) console.error('Không thể tải nội dung PDF:', error);
            this.viewer.showNotice(error.message || 'Không thể tải tài liệu.', 'error');
         }
      } else {
         if (import.meta.env.DEV) console.error("Không thể lấy thông tin file:", response?.status?.message || "Lỗi không xác định");
      }
   }

   async _getDocumentPreviewUrl(fileInfo) {
      const path = fileInfo.relative_path;
      const cacheKey = `${path}|${fileInfo.timestamp || ''}`;
      if (this.documentPreviewCache.has(cacheKey)) return this.documentPreviewCache.get(cacheKey);
      if (this.documentPreviewRequests.has(cacheKey)) return this.documentPreviewRequests.get(cacheKey);

      const request = this.model.getFileBlob(path, fileInfo.timestamp || '').then((blob) => {
         const url = URL.createObjectURL(blob);
         this.documentPreviewCache.set(cacheKey, url);
         this.documentPreviewRequests.delete(cacheKey);
         return url;
      }).catch((error) => {
         this.documentPreviewRequests.delete(cacheKey);
         throw error;
      });
      this.documentPreviewRequests.set(cacheKey, request);
      return request;
   }

   _clearDocumentPreviewCache(path) {
      [...this.documentPreviewCache.entries()]
         .filter(([key]) => key.startsWith(`${path}|`))
         .forEach(([key, url]) => {
            URL.revokeObjectURL(url);
            this.documentPreviewCache.delete(key);
         });
      this.model.clearFileCache(path);
   }

   _updateOrderDocumentCard(relativePath, docName) {
      if (!this.orderDocuments || !this.orderId) return;
      const type = Object.keys(this.orderDocuments).find((key) => this.orderDocuments[key].name === docName);
      if (!type) return;
      this.orderDocuments[type].file = relativePath;
      this._renderOrderDocumentCards();
   }

   _resetOrderDocumentCard(docName) {
      if (!this.orderDocuments || !this.orderId) return;
      const type = Object.keys(this.orderDocuments).find((key) => this.orderDocuments[key].name === docName);
      if (!type) return;
      this.orderDocuments[type].file = '';
      this._renderOrderDocumentCards();
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
