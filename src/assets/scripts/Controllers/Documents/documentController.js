// Provides module declarations and business logic for documentController.js.

import Controller from '../controller.js'
import DocumentModel from '../../Models/Documents/documentModel.js';
import DocumentViewer from '../../Views/Documents/documentViewer.js';
import TextHelper from '../../Vendor/helpers/textHelper.js';
import TagBuilder from '../../Vendor/helpers/tagBuilder.js';
import { FILE_PDF_ICON } from '../../Vendor/dragdropfile/filesSVGIcon.js';

// Defines DocumentController class behavior for documentController.js.
export default class DocumentController extends Controller {
   // Defines constructor method behavior for documentController.js.
   constructor() {
      super();
      this.viewer = new DocumentViewer();
      this.model = new DocumentModel();
      this.filesLoaded = false;
      this.currentPage = 1;
      this.documentPreviewCache = new Map();
      this.documentPreviewRequests = new Map();
      this.init();
   }

   /* Executes documented symbol logic in documentController.js. */
   async init() {
      await this.model.init();
      const { page, type } = window.DocumentPluginConfig || {};
      if (!page || !type) return;
      const controllerKey = `${page}${TextHelper.capitalize(type)}Init`;
      if (typeof this[controllerKey] === 'function') await this[controllerKey]();
   }

   // Defines editOrderInit method behavior for documentController.js.
   editOrderInit() {
      const thelist = document.querySelector('#the-list');
      if (thelist) this._addEventListenerToDocumentActions(thelist);
   }

   // Defines postOrderInit method behavior for documentController.js.
   async postOrderInit() {
      this.orderId = this._getCurrentOrderId();
      if (!this.orderId) return;
      const response = await this.model.getOrderDocuments(this.orderId);
      if (response?.status?.code !== 200) return;
      this.orderDocuments = response.status.data.documents || {};
      this._renderOrderDocumentCards();
   }

   // Defines _getCurrentOrderId method behavior for documentController.js.
   _getCurrentOrderId() {
      const orderId = parseInt(document.querySelector('#post_ID')?.value || new URLSearchParams(window.location.search).get('post') || '', 10);
      return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
   }

   /* Executes documented symbol logic in documentController.js. */
   _getNormalizedFiles(documentData) {
      return Array.isArray(documentData?.files) ? documentData.files.filter(Boolean) : (documentData?.file ? [documentData.file] : []);
   }

   // Defines _renderOrderDocumentCards method behavior for documentController.js.
   _renderOrderDocumentCards() {
      const mount = this._getOrderDocumentMount();
      if (!mount) return;
      const { host, anchor } = mount;
      host.classList.add('tsp-order-data-host');
      let cards = host.querySelector('.tsp-order-document-cards');
      if (!cards) {
         cards = TagBuilder.create('div').setAttributes({ className: 'tsp-order-document-cards' }).build();
         cards.addEventListener('click', (event) => this._handleOrderDocumentClick(event));
         if (anchor) anchor.insertAdjacentElement('afterend', cards); else host.appendChild(cards);
      }

      cards.innerHTML = '';
      Object.entries(this.orderDocuments || {}).forEach(([type, documentData]) => {
         const files = this._getNormalizedFiles(documentData);
         documentData.files = files;
         documentData.file = files[0] || '';
         const isMulti = Boolean(documentData.multiple || type === 'delivery' || documentData.name === 'deliveryDocument');
         cards.appendChild(this.viewer.renderDocumentSingle(type, documentData, files, isMulti));
      });
   }

   // Defines _getOrderDocumentMount method behavior for documentController.js.
   _getOrderDocumentMount() {
      const orderData = document.querySelector('#order_data.woocommerce-order-data, #woocommerce-order-data, .woocommerce-order-data');
      const customerField = orderData?.querySelector('#customer_user')?.closest('.wc-customer-user, .form-field') || document.querySelector('#customer_user')?.closest('.wc-customer-user, .form-field');
      if (customerField) return { host: customerField.closest('.order_data_column') || customerField.parentElement, anchor: customerField };
      const totalsTable = document.querySelector('.wc-order-totals');
      return totalsTable ? { host: totalsTable.closest('.wc-order-data-row') || totalsTable.parentElement, anchor: null } : null;
   }

   // Defines _handleOrderDocumentClick method behavior for documentController.js.
   _handleOrderDocumentClick(event) {
      const navBtn = event.target.closest('[data-slide-dir]');
      if (navBtn) {
         event.preventDefault();
         event.stopPropagation();
         const card = navBtn.closest('.tsp-order-document-card');
         if (card) this.viewer.moveOrderDocumentSlide(card, parseInt(navBtn.dataset.slideDir, 10) || 0);
         return;
      }
      const target = event.target.closest('[data-action]');
      const type = target?.closest('.tsp-order-document-card')?.dataset.documentType;
      const documentData = this.orderDocuments?.[type];
      if (!target || !documentData) return;
      event.preventDefault();
      event.stopPropagation();
      const targetFile = target.dataset.file || documentData.file || '';
      this.handleDocumentLinks(target, { ID: this.orderId, name: documentData.name, title: documentData.title, file: targetFile, files: this._getNormalizedFiles(documentData), multiple: Boolean(documentData.multiple || type === 'delivery'), type });
   }

   // Defines _addEventListenerToDocumentActions method behavior for documentController.js.
   _addEventListenerToDocumentActions(thelist) {
      thelist.addEventListener('click', (e) => {
         const actionTarget = e.target.closest('.uploadToDocument') || e.target.closest('.delete__button');
         if (!actionTarget) return;
         e.preventDefault();
         const parent = actionTarget.closest('.order--document');
         const dataDocument = parent.document || JSON.parse(parent.dataset.document);
         if (!parent.document) { parent.document = dataDocument; delete parent.dataset.document; }
         this.handleDocumentLinks(actionTarget, { ...dataDocument, file: actionTarget.dataset.file || dataDocument.file || '' });
      });
   }

   // Defines handleDocumentLinks method behavior for documentController.js.
   handleDocumentLinks(target, documentData) {
      const action = target.dataset.action;
      if (this[action]) this[action](target, documentData);
   }

   // Defines deleteDocument method behavior for documentController.js.
   async deleteDocument(target, documentData, options = {}) {
      const typeMap = { vatDocument: 'invoice', orderDocument: 'quotation', deliveryDocument: 'delivery' };
      const targetFile = target?.dataset?.file || documentData.file || '';
      this.viewer.showNotice('Đang gỡ tài liệu...', 'info');
      const res = await this.model.unassignDocument({ order_ids: [documentData.ID], doc_type: typeMap[documentData.name] || documentData.name, relative_path: targetFile });

      if (res?.status?.code === 200) {
         this.viewer.showNotice('Đã gỡ tài liệu thành công!', 'success');
         if (targetFile) this._clearDocumentPreviewCache(targetFile);
         this.viewer.modal?.close?.();
         this.viewer.resetOrderRow(documentData.ID, documentData.name, targetFile);
         this._resetOrderDocumentCard(documentData.name, targetFile);
         if (options.openUpload) await this.uploadDocument(null, { ...documentData, file: '' });
      } else {
         this.viewer.showNotice(res?.status?.message || 'Không thể gỡ tài liệu lúc này.', 'error');
      }
   }

   // Defines uploadDocument method behavior for documentController.js.
   async uploadDocument(target, documentData) {
      const listOrders = this._getOrdersNoDocument(documentData);
      const isMulti = Boolean(documentData.multiple || documentData.name === 'deliveryDocument' || documentData.type === 'delivery');

      this.viewer.showUploadModal(documentData, listOrders.list, {
         onConfirm: async (orderIds) => {
            const selected = isMulti ? (this.viewer.selectedFilePaths?.length ? this.viewer.selectedFilePaths : [this.viewer.selectedFilePath].filter(Boolean)) : this.viewer.selectedFilePath;
            await this._handleAssign(selected, orderIds, documentData.name);
         },
         onLoadMore: async () => { this.currentPage++; await this._loadFilesToManager(true); },
         onAutoUpload: async (file) => {
            this.viewer.showNotice('Đang tự động tải file lên...', 'info');
            const res = await this.model.uploadFile(file);
            if (res?.status?.code === 200) { this.viewer.showNotice('Tải lên thành công!', 'success'); this.viewer.prependFile(res.status.data); }
            else this.viewer.showNotice(res?.status?.message || 'Lỗi tải file', 'error');
         },
         deleteFile: async (path, file, selectedFile) => {
            this.viewer.showNotice(`Xoá file ${file}`, 'info');
            const res = await this.model.deleteFile(path);
            if (res?.status?.code === 200) { this.viewer.showNotice('Xoá file thành công!', 'success'); this._clearDocumentPreviewCache(path); selectedFile.remove(); }
            else this.viewer.showNotice(res?.status?.message || 'Lỗi tải file', 'error');
         }
      }, { singleOrder: Boolean(this.orderId), multiple: isMulti });

      this.currentPage = 1;
      this.filesLoaded = false;
      await this._loadFilesToManager();
   }

   // Defines _loadFilesToManager method behavior for documentController.js.
   async _loadFilesToManager(append = false) {
      const res = await this.model.getFiles(this.currentPage, 12);
      if (res?.status?.code === 200) {
         this.viewer.renderFileList(res.status.data.files, append);
         this.viewer.toggleLoadMore(res.status.data.has_more);
         this.filesLoaded = true;
      }
   }

   // Defines _handleAssign method behavior for documentController.js.
   async _handleAssign(relativePath, orderIds, docName) {
      const typeMap = { vatDocument: 'invoice', orderDocument: 'quotation', deliveryDocument: 'delivery' };
      this.viewer.showNotice('Đang gán tài liệu...', 'info');
      const res = await this.model.assignDocument({ relative_path: relativePath, order_ids: orderIds, doc_type: typeMap[docName] || docName });

      if (res?.status?.code === 200) {
         this.viewer.showNotice('Gán tài liệu thành công!', 'success');
         this.viewer.modal.close();
         this.viewer.updateOrderRows(orderIds, relativePath, docName);
         this._updateOrderDocumentCard(relativePath, docName);
      } else {
         this.viewer.showNotice(res?.status?.message || 'Lỗi gán tài liệu', 'error');
      }
   }

   // Defines previewDocument method behavior for documentController.js.
   async previewDocument(target, documentData) {
      const targetFile = target?.dataset?.file || documentData.file;
      if (!targetFile) return;
      Object.assign(target.style, { opacity: '0.5', pointerEvents: 'none' });
      target.classList.add('is-loading');

      const response = await this.model.getFileDetail(targetFile);
      Object.assign(target.style, { opacity: '1', pointerEvents: 'auto' });
      target.classList.remove('is-loading');

      if (response?.status?.code === 200) {
         try {
            const securedUrl = await this._getDocumentPreviewUrl(response.status.data);
            this.viewer.showPreviewModal({ ...documentData, file: targetFile }, securedUrl, {
               onRemove: () => this.deleteDocument(null, { ...documentData, file: targetFile }, { openUpload: true })
            });
         } catch (error) {
            this.viewer.showNotice(error.message || 'Không thể tải tài liệu.', 'error');
         }
      }
   }

   // Defines _getDocumentPreviewUrl method behavior for documentController.js.
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
      }).catch((error) => { this.documentPreviewRequests.delete(cacheKey); throw error; });
      this.documentPreviewRequests.set(cacheKey, request);
      return request;
   }

   // Defines _clearDocumentPreviewCache method behavior for documentController.js.
   _clearDocumentPreviewCache(path) {
      [...this.documentPreviewCache.entries()].filter(([key]) => key.startsWith(`${path}|`)).forEach(([key, url]) => {
         URL.revokeObjectURL(url);
         this.documentPreviewCache.delete(key);
      });
      this.model.clearFileCache(path);
   }

   // Defines _updateOrderDocumentCard method behavior for documentController.js.
   _updateOrderDocumentCard(relativePath, docName) {
      if (!this.orderDocuments || !this.orderId) return;
      const type = Object.keys(this.orderDocuments).find((key) => this.orderDocuments[key].name === docName);
      if (!type) return;
      const incoming = (Array.isArray(relativePath) ? relativePath : [relativePath]).filter(Boolean);
      const isMulti = Boolean(this.orderDocuments[type].multiple || type === 'delivery' || docName === 'deliveryDocument');
      const current = this._getNormalizedFiles(this.orderDocuments[type]);
      const nextFiles = isMulti ? [...new Set([...current, ...incoming])] : [incoming[0] || ''].filter(Boolean);
      this.orderDocuments[type].files = nextFiles;
      this.orderDocuments[type].file = nextFiles[0] || '';
      this._renderOrderDocumentCards();
   }

   // Defines _resetOrderDocumentCard method behavior for documentController.js.
   _resetOrderDocumentCard(docName, removedPath = '') {
      if (!this.orderDocuments || !this.orderId) return;
      const type = Object.keys(this.orderDocuments).find((key) => this.orderDocuments[key].name === docName);
      if (!type) return;
      const current = this._getNormalizedFiles(this.orderDocuments[type]);
      const nextFiles = removedPath ? current.filter((f) => f !== removedPath) : [];
      this.orderDocuments[type].files = nextFiles;
      this.orderDocuments[type].file = nextFiles[0] || '';
      this._renderOrderDocumentCards();
   }

   // Defines _getOrdersNoDocument method behavior for documentController.js.
   _getOrdersNoDocument(documentData) {
      const idClick = documentData.ID;
      const key = documentData.name;
      const list = [...document.querySelectorAll('.order--document')].reduce((acc, order) => {
         const data = order.document || JSON.parse(order.dataset.document);
         if (data.name === key && data.ID !== idClick && !data.file) acc.push(data.ID);
         return acc;
      }, []);
      return { idClick, list };
   }
}
