// Provides module declarations and business logic for documentViewer.js.

import Viewer from '../viewer.js';
import DragDrop from '../../Vendor/dragdrop/dragDrop.js';
import UploadFiles from '../../Vendor/dragdropfile/dragDropUpload.js'
import TagBuilder from '../../Vendor/helpers/tagBuilder.js';
import pdfobject from 'pdfobject';

import { FILE_PDF_ICON, AI_FILE_ICON, DOC_FILE_ICON } from '../../Vendor/dragdropfile/filesSVGIcon.js';

// Defines DocumentViewer class behavior for documentViewer.js.
export default class DocumentViewer extends Viewer {
   // Defines constructor method behavior for documentViewer.js.
   constructor() {
      super();
      this.dragDrop = new DragDrop();
      this.uploadFiles = new UploadFiles();
      this.init();
   }

   /* Executes documented symbol logic in documentViewer.js. */
   init() {
      this.dragDrop.init({ id: 'orders-drag-drop' });
      this.btnConfirm = TagBuilder.create('button').setAttributes({ className: 'button button-primary', type: 'button', disabled: true }).html('Xác nhận').build();
      this.delFile = TagBuilder.create('button').setAttributes({ className: 'button button-primary', type: 'button', disabled: true }).html('Delete file').build();
      this.btnLoadMore = TagBuilder.create('a').setAttributes({ href: '#', className: 'load-more-link' }).html('Tải thêm file...').build();
      this._uploadFilesRebuilder();
      this.form = this._documentFormBuilder();
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _uploadFilesRebuilder() {
      this.uploadFiles.init({ id: 'document-upload-files' }); // Khởi tạo UploadFiles với ID của container
      this.uploadFiles.accept('.pdf');
      this.uploadFiles.multiple(false);

      // Executes documented symbol logic in documentViewer.js.
      const { main, dropList, input, label, dragArea, message } = this.uploadFiles.data;
      const instruction = TagBuilder.create('p').setAttributes({ className: 'file-manager-instruction' })
         .html('Bạn có thể kéo thả file vào đây để tải lên server').build();
      const headerInfo = TagBuilder.create('div').setAttributes({ className: 'file-manager-header-info' })
         .append([instruction, this.btnLoadMore]).build();
      main.classList.add('document-upload-form');
      main.prepend(headerInfo);

      if (input && label && dragArea && message) {
         input.remove();
         label.remove();
         message.remove();
         dragArea.remove();
      }
      this.uploadFiles.data.dragArea = dropList;

      if (dropList) {
         dropList.classList.add('file-manager-grid', 'drop-zone__wrapper');
         dropList.addEventListener('click', (e) => {
            const item = e.target.closest('.file-grid-item');
            if (!item) return;
            if (this.allowMultiSelect) {
               item.classList.toggle('selected');
            } else {
               dropList.querySelectorAll('.file-grid-item').forEach(el => el.classList.remove('selected'));
               item.classList.add('selected');
            }
            const selectedNodes = [...dropList.querySelectorAll('.file-grid-item.selected')];
            this.selectedFilePaths = selectedNodes.map(el => el.dataset.path).filter(Boolean);
            this.selectedFilePath = this.selectedFilePaths[0] || null;
            this.btnConfirm.disabled = this.selectedFilePaths.length === 0;
            this.delFile.disabled = this.selectedFilePaths.length === 0;
         });
      }
   }

   /* Executes documented symbol logic in documentViewer.js. */
   showUploadModal(documentData, listOrders, callbacks, options = {}) {
      const { onConfirm, onLoadMore, onAutoUpload, deleteFile } = callbacks;
      const { singleOrder = false, multiple = false } = options;

      this.allowMultiSelect = Boolean(multiple || documentData?.name === 'deliveryDocument' || documentData?.type === 'delivery');
      this.uploadFiles.multiple(this.allowMultiSelect);
      this.dragDrop.resetDragDrop();
      this.uploadFiles.resetDragDrop();
      this.selectedFilePath = null;
      this.selectedFilePaths = [];
      if (!this.uploadFiles.data.dropList.querySelector('.file-grid-item.selected')) {
         this.btnConfirm.disabled = true;
         this.delFile.disabled = true;
      }

      if (!singleOrder) {
         const currentOrderNode = TagBuilder.create('li').setAttributes({ className: 'drag__item', draggable: 'true' }).html(`#${documentData.ID}`).build();
         this.dragDrop.setDragItems([currentOrderNode]);
         this.dragDrop.data.dropList.append(currentOrderNode);
         this.dragDrop.data.result.push(parseInt(documentData.ID));
         const dragItems = this._dragListOrders(listOrders);
         this.dragDrop.setDragItems(dragItems);
         this.dragDrop.data.dragZone.append(...dragItems);
      }

      this.uploadFiles.processIncomingFiles = async (fileList) => {
         const files = this.allowMultiSelect ? [...fileList] : [fileList[0]].filter(Boolean);
         for (const file of files) await onAutoUpload(file);
      };

      this.btnConfirm.onclick = () => {
         const selectedOrders = singleOrder ? [parseInt(documentData.ID)] : this._getAcceptedOrderIds();
         if (selectedOrders.length === 0) return this.showNotice('Vui lòng kéo đơn hàng vào vùng nhận.', 'warning');
         onConfirm(selectedOrders);
      };
      this.btnLoadMore.onclick = (e) => { e.preventDefault(); onLoadMore(); };
      this.delFile.onclick = () => {
         const selectedFile = this.uploadFiles.data.dropList.querySelector('.file-grid-item.selected');
         if (!selectedFile) return;
         deleteFile(selectedFile.dataset.path, selectedFile.querySelector('.file-name').innerText, selectedFile);
      };

      const content = singleOrder ? this.uploadFiles.data.main : this.form;
      return this.modal.title(`Upload tài liệu cho đơn hàng #${documentData.ID}`).width('90%').maxWidth('820px')
         .footer(true).content([content]).footerContent([this.delFile, this.btnConfirm]).open();
   }

   /* Executes documented symbol logic in documentViewer.js. */
   renderFileList(files, append = false) {
      const grid = this.uploadFiles.data.dropList;
      if (!append) grid.innerHTML = '';

      const pdfFiles = files.filter(file => {
         const fileName = typeof file?.name === 'string' ? file.name : '';
         const ext = typeof file?.ext === 'string' && file.ext ? file.ext : fileName.split('.').pop();
         return ext.toLowerCase() === 'pdf';
      }).sort((a, b) => {
         const diff = Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
         return diff !== 0 ? diff : String(b?.relative_path || '').localeCompare(String(a?.relative_path || ''), undefined, { numeric: true, sensitivity: 'base' });
      });
      grid.append(...pdfFiles.map(file => this._createFileNode(file, grid)));
   }

   /* Executes documented symbol logic in documentViewer.js. */
   prependFile(file) {
      const grid = this.uploadFiles.data.dropList;
      if (grid) grid.prepend(this._createFileNode(file, grid));
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _createFileNode(file) {
      const ext = file.ext || file.name.split('.').pop().toLowerCase();
      const iconMap = { pdf: FILE_PDF_ICON, ai: AI_FILE_ICON, doc: DOC_FILE_ICON, docx: DOC_FILE_ICON };
      const icon = iconMap[ext] || (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? '🖼️' : '📄');
      return TagBuilder.create('li').setAttributes({ className: 'file-grid-item', 'data-path': file.relative_path, title: `${file.name} (${file.size || ''})` }).append([
         TagBuilder.create('div').setAttributes({ className: 'file-icon' }).html(icon).build(),
         TagBuilder.create('span').setAttributes({ className: 'file-name' }).html(file.name).build()
      ]).build();
   }

   /* Executes documented symbol logic in documentViewer.js. */
   toggleLoadMore(show) {
      this.btnLoadMore.style.display = show ? 'block' : 'none';
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _getAcceptedOrderIds() {
      return [...this.dragDrop.data.dropList.querySelectorAll('.drag__item')].map(item => parseInt(item.innerText.replace('#', '')));
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _dragListOrders(listOrders) {
      return listOrders.map(order => TagBuilder.create('li').setAttributes({ className: 'drag__item', draggable: 'true' }).html(`#${order}`).build());
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _documentFormBuilder() {
      const orders = TagBuilder.create('div').setAttributes({ className: 'upload-form-column orders-selection-column' }).append([
         TagBuilder.create('h3').setAttributes({ className: 'section-title' }).html('1. Đơn hàng').build(),
         TagBuilder.create('p').setAttributes({ style: 'font-size: 12px; color: #666; margin-bottom: 10px; font-style: italic;', className: 'file-manager-instruction' }).html('Bạn có thể kéo thả đơn hàng vào đây để gán hàng loạt').build(),
         this.dragDrop.data.main
      ]).build();
      return TagBuilder.create('div').setAttributes({ className: 'document-upload-form unified-layout', id: 'document-upload-form' }).append([orders, this.uploadFiles.data.main]).build();
   }

   // Defines showPreviewModal method behavior for documentViewer.js.
   showPreviewModal(documentData, link, options = {}) {
      const titles = { vatDocument: 'Hóa đơn VAT', orderDocument: 'Tài liệu đối ứng', deliveryDocument: 'Phiếu giao hàng' };
      const displayTitle = titles[documentData.name] || 'Tài liệu';
      const pdfContainer = TagBuilder.create('div').setAttributes({ style: 'width: 100%; height: 70vh; border: 1px solid #ddd; background: #fff;' }).build();

      let removeButton = null;
      if (typeof options.onRemove === 'function') {
         removeButton = TagBuilder.create('button').setAttributes({ className: 'button button-secondary tsp-document-remove', type: 'button' }).append([
            TagBuilder.create('span').setAttributes({ className: 'dashicons dashicons-trash' }).build(),
            document.createTextNode(' Gỡ tài liệu')
         ]).build();
         removeButton.onclick = options.onRemove;
      }

      this.modal.title(`${displayTitle} - Đơn hàng #${documentData.ID}`).width('95%').maxWidth('870px').footer(Boolean(removeButton)).content([pdfContainer]);
      if (removeButton) this.modal.footerContent([removeButton]);
      this.modal.open();

      if (pdfobject.supportsPDFs) pdfobject.embed(link, pdfContainer, { pdfOpenParams: { toolbar: 1, view: 'FitH', pagemode: 'thumbs' } });
      else pdfContainer.innerHTML = `<div style="padding: 20px; text-align: center;"><p>Trình duyệt của bạn không hỗ trợ xem PDF trực tiếp.</p><a href="${link}" target="_blank" class="button button-primary">Tải xuống để xem tài liệu</a></div>`;
      return this.modal;
   }

   /* Executes documented symbol logic in documentViewer.js. */
   _syncOrderRowElement(orderEl, data) {
      const files = Array.isArray(data.files) ? data.files.filter(Boolean) : (data.file ? [data.file] : []);
      data.files = files;
      data.file = files[0] || '';
      orderEl.document = data;
      orderEl.innerHTML = '';

      if (files.length === 0) {
         orderEl.appendChild(TagBuilder.create('a').setAttributes({ href: '#', className: 'uploadToDocument title', 'data-action': 'uploadDocument' }).text(data.title || 'Tải lên').build());
         return;
      }

      files.forEach((filePath) => {
         const link = TagBuilder.create('a').setAttributes({ href: '#', className: 'uploadToDocument title', 'data-action': 'previewDocument', 'data-file': filePath }).text(filePath.split('/').pop()).build();
         const del = TagBuilder.create('a').setAttributes({ href: '#', className: 'delete__button', 'data-action': 'deleteDocument', 'data-file': filePath, title: 'Gỡ tài liệu' }).html('<span class="dashicons dashicons-no-alt"></span>').build();
         orderEl.appendChild(TagBuilder.create('span').setAttributes({ className: 'order--document-file-item' }).append([link, del]).build());
      });

      if (data.name === 'deliveryDocument') {
         orderEl.appendChild(TagBuilder.create('a').setAttributes({ href: '#', className: 'uploadToDocument add-more__button', 'data-action': 'uploadDocument', title: 'Thêm Phiếu giao hàng' }).html('<span class="dashicons dashicons-plus-alt2"></span>').build());
      }
   }

   /* Executes documented symbol logic in documentViewer.js. */
   updateOrderRows(orderIds, relativePath, docName) {
      const incoming = (Array.isArray(relativePath) ? relativePath : [relativePath]).filter(Boolean);
      const isMulti = docName === 'deliveryDocument';
      document.querySelectorAll('.order--document').forEach(orderEl => {
         const rawData = orderEl.document || orderEl.dataset.document;
         if (!rawData) return;
         const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
         if (data && orderIds.includes(parseInt(data.ID)) && data.name === docName) {
            const current = Array.isArray(data.files) ? data.files.filter(Boolean) : (data.file ? [data.file] : []);
            data.files = isMulti ? [...new Set([...current, ...incoming])] : [incoming[0] || ''].filter(Boolean);
            this._syncOrderRowElement(orderEl, data);
         }
      });
   }

   /* Executes documented symbol logic in documentViewer.js. */
   resetOrderRow(orderId, docName, removedPath = '') {
      document.querySelectorAll('.order--document').forEach(orderEl => {
         const rawData = orderEl.document || orderEl.dataset.document;
         if (!rawData) return;
         const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
         if (data && parseInt(data.ID) === parseInt(orderId) && data.name === docName) {
            const current = Array.isArray(data.files) ? data.files.filter(Boolean) : (data.file ? [data.file] : []);
            data.files = removedPath ? current.filter(f => f !== removedPath) : [];
            this._syncOrderRowElement(orderEl, data);
         }
      });
   }

   // Defines renderDocumentSingle method behavior for documentViewer.js.
   renderDocumentSingle(type, documentData, files = [], isMulti = false) {
      const hasSlider = isMulti && files.length > 0;
      const card = TagBuilder.create('div').setAttributes({ className: `tsp-order-document-card ${files.length ? 'has-file' : 'is-empty'} ${isMulti ? 'is-multi' : ''} ${hasSlider ? 'has-slider' : ''}`.trim(), 'data-document-type': type, 'data-slide-index': '0' }).build();
      const title = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-title' }).text(documentData.title).build();
      const viewport = TagBuilder.create('div').setAttributes({ className: 'tsp-order-document-viewport' }).build();
      const track = TagBuilder.create('div').setAttributes({ className: 'tsp-order-document-items' }).build();

      files.forEach((filePath) => {
         const name = filePath.split('/').pop();
         const icon = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-icon is-pdf', 'aria-hidden': 'true' }).html(FILE_PDF_ICON).build();
         const label = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-file' }).text(name).build();
         const trigger = TagBuilder.create('button').setAttributes({ type: 'button', className: 'tsp-order-document-trigger', 'data-action': 'previewDocument', 'data-file': filePath, 'aria-label': `Mở ${documentData.title}` }).append([icon, label]).build();
         const removeBtn = TagBuilder.create('button').setAttributes({ type: 'button', className: 'tsp-order-document-remove', 'data-action': 'deleteDocument', 'data-file': filePath, title: 'Gỡ tài liệu', 'aria-label': `Gỡ ${name}` }).text('×').build();
         track.appendChild(TagBuilder.create('div').setAttributes({ className: 'tsp-order-document-item tsp-order-document-slide' }).append([trigger, removeBtn]).build());
      });

      if (files.length === 0 || isMulti) {
         const plusBox = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-plus-box', 'aria-hidden': 'true' }).append([TagBuilder.create('span').setAttributes({ className: 'dashicons dashicons-plus-alt2' }).build()]).build();
         const uploadBtn = TagBuilder.create('button').setAttributes({ type: 'button', className: `tsp-order-document-trigger ${hasSlider ? 'is-add-slide' : ''}`.trim(), 'data-action': 'uploadDocument', 'aria-label': `Tải ${documentData.title}`, title: files.length ? `Thêm ${documentData.title}` : `Tải ${documentData.title}` }).append([plusBox]).build();
         track.appendChild(TagBuilder.create('div').setAttributes({ className: 'tsp-order-document-item tsp-order-document-slide is-upload-slide' }).append([uploadBtn]).build());
      }

      viewport.appendChild(track);
      if (hasSlider) {
         const prevBtn = TagBuilder.create('button').setAttributes({ type: 'button', className: 'tsp-order-document-nav is-prev', 'data-slide-dir': '-1', 'aria-label': 'Slide trước', disabled: true }).text('‹').build();
         const nextBtn = TagBuilder.create('button').setAttributes({ type: 'button', className: 'tsp-order-document-nav is-next', 'data-slide-dir': '1', 'aria-label': 'Slide tiếp' }).text('›').build();
         const badge = TagBuilder.create('span').setAttributes({ className: 'tsp-order-document-slide-count' }).text(`1/${files.length + 1}`).build();
         viewport.append(prevBtn, nextBtn, badge);
      }
      card.append(title, viewport);
      return card;
   }

   /* Executes documented symbol logic in documentViewer.js. */
   moveOrderDocumentSlide(card, delta) {
      const slides = card.querySelectorAll('.tsp-order-document-slide');
      const track = card.querySelector('.tsp-order-document-items');
      if (!track || slides.length <= 1) return;
      const next = Math.max(0, Math.min(slides.length - 1, (parseInt(card.dataset.slideIndex || '0', 10) || 0) + delta));
      card.dataset.slideIndex = String(next);
      track.style.transform = `translateX(-${next * 100}%)`;
      const prevBtn = card.querySelector('.tsp-order-document-nav.is-prev');
      const nextBtn = card.querySelector('.tsp-order-document-nav.is-next');
      const badge = card.querySelector('.tsp-order-document-slide-count');
      if (prevBtn) prevBtn.disabled = next <= 0;
      if (nextBtn) nextBtn.disabled = next >= slides.length - 1;
      if (badge) badge.textContent = `${next + 1}/${slides.length}`;
   }
}
