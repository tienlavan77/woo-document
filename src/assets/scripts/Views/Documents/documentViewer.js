import Viewer from '../viewer.js';
import DragDrop from '../../Vendor/dragdrop/dragDrop.js';
import UploadFiles from '../../Vendor/dragdropfile/dragDropUpload.js'
import TagBuilder from '../../Vendor/helpers/tagBuilder.js';
import pdfobject from 'pdfobject';

import { FILE_PDF_ICON, AI_FILE_ICON, DOC_FILE_ICON } from '../../Vendor/dragdropfile/filesSVGIcon.js';

export default class DocumentViewer extends Viewer {
   constructor() {
      super();
      this.dragDrop = new DragDrop();
      this.uploadFiles = new UploadFiles();

      this.init();
   }

   /**
    * Khởi tạo cấu trúc giao diện và các nút điều khiển tĩnh
    */
   init() {
      this.dragDrop.init({ id: 'orders-drag-drop' }); // Khởi tạo DragDrop với ID của container

      // Khởi tạo các nút điều khiển cố định để tránh trùng lặp DOM khi mở lại modal
      this.btnConfirm = TagBuilder.create('button')
         .setAttributes({ className: 'button button-primary', type: 'button', disabled: true })
         .html('Xác nhận')
         .build();
      this.delFile = TagBuilder.create('button')
         .setAttributes({className: 'button button-primary', type: 'button', disabled: true })
         .html('Delete file')
         .build()
      this.btnLoadMore = TagBuilder.create('a')
         .setAttributes({ href: '#', className: 'load-more-link' })
         .html('Tải thêm file...')
         .build();

      this._uploadFilesRebuilder(); // Khởi tạo UploadFiles
      this.form = this._documentFormBuilder(); // Xây dựng form upload tài liệu
   }

   /**
    * Tái cấu trúc vùng Upload: Dời input ra ngoài và thiết lập tiêu đề/link tải thêm
    * Đảm bảo tính tương thích giữa click và drag-drop
    * @private
    */
   _uploadFilesRebuilder() {
      this.uploadFiles.init({ id: 'document-upload-files' }); // Khởi tạo UploadFiles với ID của container
      this.uploadFiles.accept('.pdf');
      this.uploadFiles.multiple(false);

      // Lấy các phần tử cần thiết từ dữ liệu của uploadFiles
      const { main, dropList, input, label, dragArea, message } = this.uploadFiles.data;

      // Thêm Tiêu đề, Dòng nhắc và Link tải thêm vào trước vùng drop-zone
      const headerInfo = TagBuilder.create('div')
         .setAttributes({ className: 'file-manager-header-info' })
         .append([
            TagBuilder.create('p')
               .setAttributes({ className: 'file-manager-instruction' })
               .html('Bạn có thể kéo thả file vào đây để tải lên server')
               .build(),
            this.btnLoadMore
         ])
         .build();
      main.classList.add('document-upload-form')
      main.prepend(headerInfo);

      if (input && label && dragArea && message) {
         input.remove(); // Chuyển input làm con trực tiếp của dragArea
         label.remove(); // Xóa labels
         message.remove(); // Xóa message
         dragArea.remove(); // Xóa dragArea
      }
      this.uploadFiles.data.dragArea = dropList;

      if (dropList) {
         dropList.classList.add('file-manager-grid','drop-zone__wrapper');
         // Thêm sự kiện click cho droplist để xử lý chọn file (Event Delegation)
         dropList.addEventListener('click', (e) => {
            const item = e.target.closest('.file-grid-item');
            if (!item) return;

            dropList.querySelectorAll('.file-grid-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            this.selectedFilePath = item.dataset.path;
            this.btnConfirm.disabled = false;
            this.delFile.disabled = false;
         });
      }

   }

   /**
    * Hiển thị Modal gán tài liệu với danh sách đơn hàng và quản lý file
    * @param {Object} documentData - Dữ liệu đơn hàng mục tiêu
    * @param {number[]} listOrders - Danh sách các ID đơn hàng gợi ý gán hàng loạt
    * @param {Object} callbacks - Các hàm xử lý sự kiện (onConfirm, onLoadMore, onAutoUpload)
    * @returns {Modal} Trả về đối tượng Modal
    */
   showUploadModal(documentData, listOrders, callbacks, options = {}) {
      const { onConfirm, onLoadMore, onAutoUpload, deleteFile } = callbacks;
      const { singleOrder = false } = options;

      this.dragDrop.resetDragDrop(); // Đặt lại trạng thái của DragDrop trước khi hiển thị modal
      this.uploadFiles.resetDragDrop(); // Đặt lại trạng thái upload file
      this.selectedFilePath = null; // Reset đường dẫn file đã chọn
      let selectedItem = this.uploadFiles.data.dropList.querySelector('.file-grid-item.selected')
      if (! selectedItem) {
         this.btnConfirm.disabled = true; // Vô hiệu hóa nút xác nhận ban đầu
         this.delFile.disabled = true

      }

      if (!singleOrder) {
         // Chỉ hiển thị vùng chọn order khi đang gán hàng loạt từ order list.
         const currentOrderNode = TagBuilder.create('li')
            .setAttributes({ className: 'drag__item', draggable: "true" })
            .html(`#${documentData.ID}`)
            .build();

         this.dragDrop.setDragItems([currentOrderNode]);
         this.dragDrop.data.dropList.append(currentOrderNode);
         this.dragDrop.data.result.push(parseInt(documentData.ID));

         const dragItems = this._dragListOrders(listOrders);
         this.dragDrop.setDragItems(dragItems);
         this.dragDrop.data.dragZone.append(...dragItems);
      }

      // Cấu hình tự động upload khi thả file vào vùng UploadFiles
      this.uploadFiles.processIncomingFiles = async (fileList) => {
         const file = fileList[0];
         if (file) await onAutoUpload(file);
      };

      this.btnConfirm.onclick = () => {
         const selectedOrders = singleOrder
            ? [parseInt(documentData.ID)]
            : this._getAcceptedOrderIds();
         if (selectedOrders.length === 0) return this.showNotice('Vui lòng kéo đơn hàng vào vùng nhận.', 'warning');
         onConfirm(selectedOrders);
      };
      this.btnLoadMore.onclick = (e) => {
         e.preventDefault();
         onLoadMore();
      };
      this.delFile.onclick = () => {
         const selectedFile = this.uploadFiles.data.dropList.querySelector('.file-grid-item.selected');
         if (! selectedFile ) return;
         let pathFile = selectedFile.dataset.path;
         const fileName = selectedFile.querySelector('.file-name').innerText;

         deleteFile(pathFile, fileName,  selectedFile)
         // selectedFile.remove()
      }

      const content = singleOrder ? this.uploadFiles.data.main : this.form;

      return this.modal
         .title(`Upload tài liệu cho đơn hàng #${documentData.ID}`)
         .width('90%')
         .maxWidth('820px') // Thu nhỏ lại một chút so với Preview (870px)
         .footer(true)
         .content([content])
         .footerContent([this.delFile, this.btnConfirm])
         .open()
   }

   /**
    * Hiển thị danh sách file theo Grid
    */
   renderFileList(files, append = false) {
      const grid = this.uploadFiles.data.dropList;
      if (!append) grid.innerHTML = '';

      const pdfFiles = files.filter(file => {
         const fileName = typeof file?.name === 'string' ? file.name : '';
         const extension = typeof file?.ext === 'string' && file.ext
            ? file.ext
            : fileName.split('.').pop();
         return extension.toLowerCase() === 'pdf';
      }).sort((fileA, fileB) => {
         const timestampA = Number(fileA?.timestamp || 0);
         const timestampB = Number(fileB?.timestamp || 0);

         if (timestampA !== timestampB) {
            return timestampB - timestampA;
         }

         return String(fileB?.relative_path || '').localeCompare(
            String(fileA?.relative_path || ''),
            undefined,
            { numeric: true, sensitivity: 'base' }
         );
      });
      const fileNodes = pdfFiles.map(file => this._createFileNode(file, grid));
      grid.append(...fileNodes);
   }

   /**
    * Thêm trực tiếp một tệp mới vào đầu danh sách hiển thị
    * @param {Object} file - Dữ liệu tệp tin mới (name, relative_path, ext...)
    */
   prependFile(file) {
      const grid = this.uploadFiles.data.dropList;
      if (!grid) return;

      const node = this._createFileNode(file, grid);
      grid.prepend(node);
   }

   /**
    * Helper để tạo cấu trúc DOM cho một item file
    * @param {Object} file - Thông tin tệp
    * @param {HTMLElement} grid - Container chứa danh sách
    * @returns {HTMLElement} Thẻ li hoàn chỉnh
    * @private
    */
   _createFileNode(file, grid) {
      // Lấy extension từ file.ext hoặc tự tách từ file.name nếu server thiếu
      const ext = file.ext || file.name.split('.').pop().toLowerCase();

      let icon = '📄';
      if (ext === 'pdf') icon = FILE_PDF_ICON;
      else if (ext === 'ai') icon = AI_FILE_ICON;
      else if (['doc', 'docx'].includes(ext)) icon = DOC_FILE_ICON;
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) icon = '🖼️';

      const item = TagBuilder.create('li')
         .setAttributes({
            className: 'file-grid-item',
            'data-path': file.relative_path,
            title: `${file.name} (${file.size || ''})`
         })
         .append([
            TagBuilder.create('div').setAttributes({ className: 'file-icon' }).html(icon).build(),
            TagBuilder.create('span').setAttributes({ className: 'file-name' }).html(file.name).build(),

         ])
         .build();

      return item;
   }

   /**
    * Ẩn/Hiện liên kết "Tải thêm file" dựa trên trạng thái còn dữ liệu hay không
    * @param {boolean} show
    */
   toggleLoadMore(show) {
      this.btnLoadMore.style.display = show ? 'block' : 'none';
   }

   /**
    * Quét vùng drop-zone để lấy danh sách ID đơn hàng đã được người dùng chấp nhận gán
    * @returns {number[]}
    * @private
    */
   _getAcceptedOrderIds() {
      const items = this.dragDrop.data.dropList.querySelectorAll('.drag__item');
      return [...items].map(item => parseInt(item.innerText.replace('#', '')));
   }

   /**
    * Tạo danh sách các phần tử kéo thả cho đơn hàng
    * @param {number[]} listOrders
    * @private
    */
   _dragListOrders(listOrders) {
      // Logic để xây dựng danh sách đơn hàng có thể kéo thả dựa trên listOrders
      // Trả về phần tử HTML chứa danh sách đơn hàng
      return listOrders.map(order =>
         TagBuilder.create('li')
            .setAttributes({ className: 'drag__item', draggable: "true" })
            .html(`#${order}`)
            .build()
      );
   }

   /**
    * Xây dựng cấu trúc HTML cho Form gán tài liệu (2 cột: Đơn hàng & Tài liệu)
    * @private
    */
   _documentFormBuilder() {
      const orders =  TagBuilder.create('div')
         .setAttributes({ className: 'upload-form-column orders-selection-column' })
         .append([
            TagBuilder.create('h3').setAttributes({ className: 'section-title' }).html('1. Đơn hàng').build(),
            TagBuilder.create('p')
            .setAttributes({
               style: 'font-size: 12px; color: #666; margin-bottom: 10px; font-style: italic;',
               className: 'file-manager-instruction'
            })
            .html('Bạn có thể kéo thả đơn hàng vào đây để gán hàng loạt').build(),
            this.dragDrop.data.main,
         ]).build();

      return TagBuilder.create('div')
         .setAttributes({ className: 'document-upload-form unified-layout' , id: 'document-upload-form'})
         .append([
            // Cột bên trái: Danh sách đơn hàng cần gán và Vùng nhận đơn
            orders,
            this.uploadFiles.data.main,
            // Cột bên phải: Quản lý File (Vùng upload và Grid danh sách file)
         ]).build();
   }
   showPreviewModal(documentData, link, options = {}) {
      const titles = {
         vatDocument: 'Hóa đơn VAT',
         orderDocument: 'Tài liệu đối ứng',
         deliveryDocument: 'Phiếu giao hàng'
      };

      const displayTitle = titles[documentData.name] || 'Tài liệu';

      // Tạo container hiển thị PDF 100% chiều rộng và tự động có scrollbar bên trong
      const pdfContainer = TagBuilder.create('div')
         .setAttributes({
            style: 'width: 100%; height: 70vh; border: 1px solid #ddd; background: #fff;'
         })
         .build();

      let removeButton = null;
      if (typeof options.onRemove === 'function') {
         removeButton = TagBuilder.create('button')
            .setAttributes({ className: 'button button-secondary tsp-document-remove', type: 'button' })
            .append([
               TagBuilder.create('span').setAttributes({ className: 'dashicons dashicons-trash' }).build(),
               document.createTextNode(' Gỡ tài liệu')
            ])
            .build();
         removeButton.onclick = options.onRemove;
      }

      this.modal
         .title(`${displayTitle} - Đơn hàng #${documentData.ID}`)
         .width('95%') // Mở rộng chiều rộng modal để PDF hiển thị lớn nhất có thể
         .maxWidth('870px')
         .footer(Boolean(removeButton))
         .content([pdfContainer]);

      if (removeButton) this.modal.footerContent([removeButton]);
      this.modal
         .open();

      // Kiểm tra hỗ trợ nhúng PDF
      if (pdfobject.supportsPDFs) {
         pdfobject.embed(link, pdfContainer, {
            pdfOpenParams: {
               toolbar: 1,
               view: 'FitH',
               pagemode: 'thumbs'
            }
         });
      } else {
         // Fallback cho trình duyệt không hỗ trợ nhúng (như một số trình duyệt mobile)
         pdfContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
               <p>Trình duyệt của bạn không hỗ trợ xem PDF trực tiếp.</p>
               <a href="${link}" target="_blank" class="button button-primary">Tải xuống để xem tài liệu</a>
            </div>
         `;
      }

      return this.modal;
   }

   /**
    * Cập nhật giao diện các dòng đơn hàng sau khi gán tài liệu thành công
    */
   updateOrderRows(orderIds, relativePath, docName) {
      const filename = relativePath.split('/').pop();
      const allDocElements = document.querySelectorAll('.order--document');

      allDocElements.forEach(orderEl => {
         const rawData = orderEl.document || orderEl.dataset.document;
         if (!rawData) return;

         const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

         if (data && orderIds.includes(parseInt(data.ID)) && data.name === docName) {
            // 1. Cập nhật dữ liệu thực tế gắn vào element
            data.file = relativePath;
            orderEl.document = data;

            // 2. Cập nhật nội dung hiển thị cho link chính
            const actionLink = orderEl.querySelector('.uploadToDocument');
            if (actionLink) {
               actionLink.innerHTML = filename;
               actionLink.dataset.action = 'previewDocument';
            }

            // 3. Thêm nút xóa (Trash icon) bằng TagBuilder để đồng bộ phong cách
            if (!orderEl.querySelector('.delete__button')) {
               const deleteBtn = TagBuilder.create('a')
                  .setAttributes({
                     href: '#',
                     className: 'delete__button',
                     'data-action': 'deleteDocument'
                  })
                  .html('<span class="dashicons dashicons-trash"></span>')
                  .build();
               orderEl.appendChild(deleteBtn);
            }
         }
      });
   }

   /**
    * Đưa dòng đơn hàng về trạng thái chưa có tài liệu (nút Tải lên)
    */
   resetOrderRow(orderId, docName) {
      const allDocElements = document.querySelectorAll('.order--document');

      allDocElements.forEach(orderEl => {
         const rawData = orderEl.document || orderEl.dataset.document;
         if (!rawData) return;

         const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

         if (data && parseInt(data.ID) === parseInt(orderId) && data.name === docName) {
            // 1. Reset dữ liệu trong bộ nhớ (xóa đường dẫn file)
            data.file = '';
            orderEl.document = data;

            // 2. Trả link về trạng thái ban đầu: hiện tiêu đề "Tải..." và đổi action thành upload
            const actionLink = orderEl.querySelector('.uploadToDocument');
            if (actionLink) {
               actionLink.innerHTML = data.title || 'Tải lên';
               actionLink.dataset.action = 'uploadDocument';
            }

            // 3. Xóa nút trash (biểu tượng xóa)
            const deleteBtn = orderEl.querySelector('.delete__button');
            if (deleteBtn) deleteBtn.remove();
         }
      });
   }

   renderDocumentSingle() {

      // return this.tabs.render();
   }
}
