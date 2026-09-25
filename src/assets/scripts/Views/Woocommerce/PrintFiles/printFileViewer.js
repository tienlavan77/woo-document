import Viewer from '../../viewer.js';
import TagBuilder from '../../../Vendor/helpers/tagBuilder.js';
import UploadFiles from '../../../Vendor/dragdropfile/dragDropUpload.js';
import { FILE_PDF_ICON, AI_FILE_ICON } from '../../../Vendor/dragdropfile/filesSVGIcon.js';
import PanelViewer from '../../Panel/panelViewer.js';

export default class PrintFileViewer extends Viewer {
   constructor() {
      super();
      this.uploadFiles = null;
      this.activeIndex = 0;
      this.assetGroups = [];
      this.selectedJobByAsset = new Map();
      this.newProductItemByAsset = new Map();
      this.editingProductByAsset = new Map();
      this.previousProductByAsset = new Map();
      this.currentJobs = [];
      this.currentCallbacks = {};
      this.onUploadFile = null;
      this.onOpenLibrary = null;
      this.printTemplate = '';
      this.printTemplateContext = {};
      this.currentSheet = null;
      this.documentPanelViewer = null;
      this.documentPanelState = this._loadDocumentPanelState();
   }

   createPanel() {
      const panel = TagBuilder.create('section')
         .setAttributes({ className: 'tsp-print-files-panel' })
         .build();
      const header = TagBuilder.create('div')
         .setAttributes({ className: 'tsp-print-files-header' })
         .build();
      const heading = TagBuilder.create('div').setAttributes({ className: 'tsp-print-files-heading' }).build();
      heading.append(
         TagBuilder.create('h2').text('Print files & processing').build(),
         TagBuilder.create('p').text('Quản lý file AI/PDF và phiếu thông tin in & gia công của đơn hàng.').build(),
      );
      header.append(heading);

      this.uploadFiles = new UploadFiles();
      this.uploadFiles.init({ id: `tsp-print-upload-zone-${Date.now()}` });
      this.uploadFiles.accept('.ai,.pdf');
      this.uploadFiles.multiple(false);
      this._prepareUploadZone();

      this.grid = TagBuilder.create('div').setAttributes({ className: 'tsp-print-files-grid' }).build();
      panel.append(header, this.grid);
      return panel;
   }

   createDocumentPanel() {
      this.documentPanelViewer = new PanelViewer({
         controls: ['stamp', 'signature', 'reference'],
         showActions: false,
      });

      ['stamp', 'signature', 'reference'].forEach((name) => {
         const input = this.documentPanelViewer[name];
         if (!input) return;
         input.checked = this.documentPanelState[name];
         input.addEventListener('change', () => {
            this.documentPanelState[name] = input.checked;
            this._saveDocumentPanelState();
         });
      });

      return this.documentPanelViewer.body;
   }

   _loadDocumentPanelState() {
      const defaults = { stamp: true, signature: true, reference: true };
      try {
         const saved = JSON.parse(window.localStorage.getItem('tsp_print_document_modifier') || '{}');
         return { ...defaults, ...Object.fromEntries(Object.keys(defaults).map((key) => [key, saved[key] !== false])) };
      } catch (error) {
         return defaults;
      }
   }

   _saveDocumentPanelState() {
      try {
         window.localStorage.setItem('tsp_print_document_modifier', JSON.stringify(this.documentPanelState));
      } catch (error) {
         // Local storage may be unavailable in restricted browser contexts.
      }
   }

   bindPanelActions({ onUpload, onLibrary }) {
      this.onUploadFile = onUpload;
      this.onOpenLibrary = onLibrary;
      this.libraryButton.onclick = () => this.onOpenLibrary?.();
   }

   setPrintTemplate(template) {
      this.printTemplate = typeof template === 'string' ? template : '';
   }

   setPrintTemplateContext(context) {
      this.printTemplateContext = context && typeof context === 'object' ? context : {};
   }

   renderJobs(jobs, callbacks = {}) {
      this.currentJobs = jobs || [];
      this.currentCallbacks = callbacks;
      const activeAssetId = this.assetGroups[this.activeIndex]?.asset?.id;
      this.assetGroups = this._groupJobs(jobs);
      this.grid.innerHTML = '';
      if (!this.assetGroups.length) {
         this.activeIndex = 0;
         this.grid.classList.add('is-empty');
         this.grid.append(this.uploadPanel);
         return;
      }
      this.grid.classList.remove('is-empty');
      const restoredIndex = this.assetGroups.findIndex((group) => String(group.asset.id) === String(activeAssetId));
      this.activeIndex = restoredIndex >= 0
         ? restoredIndex
         : Math.min(this.activeIndex, this.assetGroups.length - 1);
      const layout = TagBuilder.create('div').setAttributes({ className: 'tsp-print-files-layout' }).build();
      this.gallery = TagBuilder.create('div').setAttributes({ className: 'tsp-print-files-gallery' }).build();
      this.assetPicker = this.uploadPanel;
      layout.append(this.gallery, this.assetPicker);
      this.grid.append(layout);
      this._renderActiveJob(jobs, callbacks);
   }

   _groupJobs(jobs) {
      const groups = new Map();
      (jobs || []).forEach((job) => {
         const key = String(job.asset_id || job.asset?.id || '');
         if (!key) return;
         if (!groups.has(key)) groups.set(key, { asset: job.asset || {}, jobs: [] });
         groups.get(key).jobs.push(job);
      });
      return [...groups.values()];
   }

   _selectedJob(group) {
      const key = String(group.asset.id);
      const rememberedId = this.selectedJobByAsset.get(key);
      if (rememberedId === 'new') return null;
      // Keep the selected product ticket scoped to the current asset.
      let job = group.jobs.find((item) => String(item.id) === String(rememberedId));
      if (!job) {
         job = group.jobs.find((item) => Number(item.order_item_id) > 0 && this._hasTicket(item, 'product'))
            || group.jobs.find((item) => this._hasTicket(item, 'product'))
            || group.jobs.find((item) => Number(item.order_item_id) > 0);
         if (job) this.selectedJobByAsset.set(key, job.id);
      }
      return job;
   }

   _printJob(group) {
      return group.jobs.find((job) => job?.print_ticket?.id || this._hasTicket(job, 'print'))
         || group.jobs[0]
         || null;
   }

   _hasTicket(job, type) {
      if (type === 'print') return job?.print_document_status === 'ready';
      return job?.product_document_status === 'ready';
   }

   _hasAnyTicket(job) {
      return this._hasTicket(job, 'print') || this._hasTicket(job, 'product');
   }

   _canCreateProductTicket(callbacks = {}) {
      const orderItems = callbacks.orderItems || [];
      if (!orderItems.length) return true;
      const productJobs = callbacks.allProductJobs || callbacks.productJobs || [];
      return orderItems.some((item) => !productJobs.some((productJob) => (
         String(productJob.order_item_id) === String(item.id)
         && this._hasTicket(productJob, 'product')
      )));
   }

   _prepareUploadZone() {
      const main = this.uploadFiles.data.main;
      main.classList.add('tsp-print-upload-zone');
      this.uploadFiles.data.message.textContent = 'Kéo thả file AI/PDF vào đây';
      this.uploadFiles.data.title.textContent = 'Chọn file từ máy tính';
      this.libraryButton = this._button('Chọn file đã có', 'button');
      this.uploadFiles.data.label.remove();
      const actions = TagBuilder.create('div')
         .setAttributes({ className: 'tsp-print-upload-actions' })
         .append([this.uploadFiles.data.label, this.libraryButton])
         .build();
      this.uploadFiles.data.dragArea.append(actions);
      this.uploadPanel = TagBuilder.create('div')
         .setAttributes({ className: 'tsp-print-files-picker' })
         .append([main])
         .build();

      const input = this.uploadFiles.data.input;
      input.addEventListener('change', () => {
         const file = input.files?.[0];
         if (file) this.onUploadFile?.(file);
      }, { capture: true });
      this.uploadFiles.processIncomingFiles = async (files) => {
         const file = files?.[0];
         if (file) await this.onUploadFile?.(file);
      };
   }

   _renderActiveJob(jobs, callbacks) {
      const group = this.assetGroups[this.activeIndex];
      if (!group) return;
      const selectedProductJob = this._selectedJob(group);
      const printJob = this._printJob(group) || selectedProductJob;
      const asset = group.asset || {};
      const draftItemId = this.newProductItemByAsset.get(String(asset.id)) || 0;
      const job = selectedProductJob || this._newProductJob(printJob, draftItemId);
      const previousCard = this.gallery?.querySelector('.tsp-print-file-card');
      const sameCard = previousCard && String(previousCard.dataset.assetId) === String(asset.id);
      const card = sameCard
         ? previousCard
         : TagBuilder.create('article').setAttributes({ className: 'tsp-print-file-card' }).build();
      card.dataset.jobId = String(job.id || '');
      card.dataset.assetId = String(asset.id || '');
      const preview = sameCard
         ? previousCard.querySelector('.tsp-print-file-preview')
         : null;
      if (preview) {
         // Keep the preview DOM and its loaded image; only the form state changes.
         preview.querySelectorAll('.tsp-print-files-nav, .tsp-print-files-counter').forEach((control) => control.remove());
      }
      if (sameCard) card.querySelector('.tsp-print-file-body')?.remove();
      const previewElement = preview || TagBuilder.create('div').setAttributes({ className: 'tsp-print-file-preview' }).build();
      if (!previewElement.querySelector('img[data-thumbnail-url]')) {
         const image = TagBuilder.create('img').setAttributes({ alt: asset.name || 'Print file thumbnail', loading: 'lazy', className: 'is-unavailable', 'data-thumbnail-url': asset.thumbnail_url || '' }).build();
         const fallback = TagBuilder.create('div').setAttributes({ className: 'tsp-print-file-fallback is-visible' }).text('Thumbnail').build();
         const thumbnailBox = TagBuilder.create('div').setAttributes({ className: 'tsp-print-thumbnail-box' }).append([fallback, image]).build();
         const thumbnailHint = TagBuilder.create('small').setAttributes({ className: 'tsp-print-thumbnail-hint' }).text('click để xem').build();
         previewElement.append(thumbnailBox, thumbnailHint);
      }

      const body = TagBuilder.create('div').setAttributes({ className: 'tsp-print-file-body' }).build();
      body.append(
         TagBuilder.create('h3').text(asset.name || 'Không tên file').build(),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-file-meta' }).text(`${String(asset.extension || '').toUpperCase()} · ${asset.size || ''}`).build(),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-file-meta' }).text(`${this._pointsToCm(asset.width) || 0} × ${this._pointsToCm(asset.height) || 0} cm · SL ${job.quantity || 1}`).build(),
      );

      const form = this._createJobForm(asset, callbacks.orderItems || [], job, {
         ...callbacks,
         assetId: asset.id,
         printJob,
         productJobs: group.jobs,
         allProductJobs: this.currentJobs.filter((productJob) => this._hasTicket(productJob, 'product')),
      });
      body.append(form);

      card.append(previewElement, body);

      previewElement.setAttribute('role', 'button');
      previewElement.setAttribute('tabindex', '0');
      previewElement.setAttribute('aria-label', `Xem thumbnail ${asset.name || 'file'}`);
      previewElement.onclick = (event) => {
         if (event.target.closest('button')) return;
         callbacks.onPreview?.(job);
      };
      previewElement.onkeydown = (event) => {
         if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            callbacks.onPreview?.(job);
         }
      };

      const stage = sameCard
         ? previousCard.closest('.tsp-print-files-stage')
         : TagBuilder.create('div').setAttributes({ className: 'tsp-print-files-stage' }).append([card]).build();
      if (this.assetGroups.length > 1) {
         const previous = this._button('‹', 'tsp-print-files-nav tsp-print-files-nav-prev');
         const next = this._button('›', 'tsp-print-files-nav tsp-print-files-nav-next');
         previous.setAttribute('aria-label', 'File trước');
         next.setAttribute('aria-label', 'File tiếp theo');
         previous.onclick = (event) => { event.stopPropagation(); this.activeIndex = (this.activeIndex - 1 + this.assetGroups.length) % this.assetGroups.length; this._renderActiveJob(jobs, callbacks); callbacks.onActiveChange?.(this._selectedJob(this.assetGroups[this.activeIndex])); };
         next.onclick = (event) => { event.stopPropagation(); this.activeIndex = (this.activeIndex + 1) % this.assetGroups.length; this._renderActiveJob(jobs, callbacks); callbacks.onActiveChange?.(this._selectedJob(this.assetGroups[this.activeIndex])); };
         previewElement.append(previous, next);
         previewElement.append(TagBuilder.create('span').setAttributes({ className: 'tsp-print-files-counter' }).text(`${this.activeIndex + 1} / ${this.assetGroups.length}`).build());
      }
      if (!sameCard) {
         this.gallery.innerHTML = '';
         this.gallery.append(stage);
      }
   }

   _newProductJob(baseJob, orderItemId = 0) {
      return {
         id: 0,
         order_id: baseJob?.order_id || 0,
         order_item_id: Number(orderItemId || 0),
         asset_id: baseJob?.asset_id || 0,
         asset: baseJob?.asset || {},
         quantity: 1,
         status: 'draft',
         document_status: 'not_created',
         product_document_status: 'not_created',
         print_document_status: baseJob?.print_document_status || 'not_created',
         print_specs: baseJob?.print_specs || {},
         print_ticket: baseJob?.print_ticket || {},
         specs: {},
      };
   }

   _createJobForm(asset, items, job, callbacks = {}) {
      const specs = job?.specs || {};
      const form = TagBuilder.create('form').setAttributes({ className: 'tsp-print-job-form frame__content' }).build();
      this._appendPrintFields(form, asset, specs, job, items, callbacks);
      form.addEventListener('submit', (event) => event.preventDefault());

      return form;
   }

   _appendPrintFields(form, asset, specs, job = {}, items = [], callbacks = {}) {
      const assetWidthCm = this._pointsToCm(asset.width);
      const assetHeightCm = this._pointsToCm(asset.height);
      const selectedItem = items.find((item) => String(item.id) === String(job?.order_item_id || ''));
      const productWidthCm = this._dimensionValue(job?.product_dimensions?.width_cm, selectedItem?.width_cm || assetWidthCm);
      const productHeightCm = this._dimensionValue(job?.product_dimensions?.height_cm, selectedItem?.height_cm || assetHeightCm);
      const printJob = callbacks.printJob || job;
      const printSpecs = { ...(printJob?.specs || {}), ...(printJob?.print_specs || {}) };
      const printSection = TagBuilder.create('section').setAttributes({ className: 'tsp-print-job-section' }).build();
      printSection.append(TagBuilder.create('h4').text('Phiếu in').build());
      printSection.append(
         this._documentStatusRow(printJob, 'print', callbacks, form, printSection),
         this._supplierField(callbacks.suppliers || [], printSpecs.supplier || ''),
         this._field('Chất liệu', this._materialSelect(callbacks.materials || [], printSpecs.material || '')),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Khổ rộng (cm)', this._input('width', this._dimensionValue(printSpecs.width, assetWidthCm), 'number', '0.01')),
            this._field('Khổ cao (cm)', this._input('height', this._dimensionValue(printSpecs.height, assetHeightCm), 'number', '0.01')),
         ]).build(),
         this._field('Khổ in', this._input('print_size', printSpecs.print_size || '', 'text')),
         this._field('Phương pháp in', this._termSelect('printing_method', callbacks.printingMethods || [], printSpecs.printing_method || '', 'Chọn phương pháp in')),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Số màu', this._input('color_count', printSpecs.color_count ?? '', 'number', '1')),
            this._field('Loại màu', this._input('color_type', printSpecs.color_type || printSpecs.colors || '', 'text')),
         ]).build(),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Số lượng tờ in', this._input('print_sheet_quantity', printSpecs.print_sheet_quantity ?? '', 'number', '1')),
            this._field('Số lượng thử bài', this._input('proof_quantity', printSpecs.proof_quantity ?? '', 'number', '1')),
         ]).build(),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Số mặt in', this._termSelect('print_sides', callbacks.printSides || [], printSpecs.print_sides || '', 'Chọn số mặt in')),
            this._field('Phương án in', this._input('print_plan', printSpecs.print_plan || '', 'text')),
         ]).build(),
         this._field('Ghi chú', this._textarea('print_note', printSpecs.print_note ?? printSpecs.note ?? '')),
      );
      // A saved print ticket is read-only until the user explicitly edits it.
      this._setSectionFieldsEnabled(printSection, false);

      const productSection = TagBuilder.create('section').setAttributes({ className: 'tsp-print-job-section' }).build();
      productSection.append(TagBuilder.create('h4').text('Thành phẩm').build());
      const itemSelect = TagBuilder.create('select').setAttributes({ name: 'order_item_id', className: 'form__field form__item regular-text wd-100 setting__item tsp-print-input' }).build();
      itemSelect.append(TagBuilder.create('option').setAttributes({ value: '0' }).text('Toàn bộ đơn hàng').build());
      const productJobs = callbacks.productJobs || [];
      const allProductJobs = callbacks.allProductJobs || productJobs;
      items.forEach((item) => {
         const alreadyHasTicket = allProductJobs.some((productJob) => (
            String(productJob.order_item_id) === String(item.id)
            && this._hasTicket(productJob, 'product')
         ));
         const option = TagBuilder.create('option').setAttributes({
            value: item.id,
            'data-width-cm': item.width_cm || 0,
            'data-height-cm': item.height_cm || 0,
         }).text(`#${item.id} · ${item.name}`).build();
         if (alreadyHasTicket) {
            option.disabled = true;
            option.title = 'Sản phẩm này đã có phiếu thành phẩm trong đơn hàng';
         }
         itemSelect.append(option);
      });
      itemSelect.value = String(job?.order_item_id || 0);
      itemSelect.addEventListener('change', () => {
         const key = String(asset.id);
         const selected = (callbacks.productJobs || []).find((productJob) => String(productJob.order_item_id) === itemSelect.value);
         if (selected) {
            this.selectedJobByAsset.set(key, selected.id);
            this.newProductItemByAsset.delete(key);
         } else {
            const currentId = this.selectedJobByAsset.get(key);
            if (currentId && currentId !== 'new') this.previousProductByAsset.set(key, currentId);
            this.selectedJobByAsset.set(key, 'new');
            this.newProductItemByAsset.set(key, Number(itemSelect.value || 0));
         }
         this.editingProductByAsset.set(key, true);
         this._renderActiveJob(this.currentJobs, this.currentCallbacks);
      });
      const editingProduct = this.editingProductByAsset.get(String(asset.id)) === true;
      productSection.append(
         this._documentStatusRow(job, 'product', callbacks, form, productSection, editingProduct),
         this._supplierField(callbacks.suppliers || [], specs.supplier || ''),
         this._field('Sản phẩm trong đơn hàng', itemSelect),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Kích thước rộng (cm)', this._input('product_width', this._dimensionValue(specs.product_width, productWidthCm), 'number', '0.01')),
            this._field('Kích thước cao (cm)', this._input('product_height', this._dimensionValue(specs.product_height, productHeightCm), 'number', '0.01')),
         ]).build(),
         TagBuilder.create('div').setAttributes({ className: 'tsp-print-job-two-col' }).append([
            this._field('Cán màng', this._termSelect('lamination', callbacks.laminations || [], specs.lamination || '', 'Chọn cán màng')),
            this._field('Số mặt', this._input('product_sides', specs.product_sides || '', 'text')),
         ]).build(),
         this._field('Thành phẩm', this._termSelect('product_form', callbacks.productForms || [], specs.product_form || '', 'Chọn thành phẩm')),
         this._field('Số lượng', this._input('product_quantity', specs.product_quantity ?? job.quantity ?? 1, 'number', '0.01')),
         this._field('Đóng gói', this._input('packaging', specs.packaging || '', 'text')),
         this._field('Ghi chú', this._textarea('product_note', specs.product_note || '')),
      );
      this._setSectionFieldsEnabled(productSection, editingProduct);
      form.append(printSection, productSection);
   }

   _documentStatusRow(job, type, callbacks, form, section = null, initiallyEditing = false) {
      const ready = this._hasTicket(job, type);
      const row = TagBuilder.create('div').setAttributes({ className: `tsp-print-document-status-row tsp-print-document-status-${type}` }).build();
      if (type === 'product') {
         const tickets = (callbacks.productJobs || []).filter((productJob) => this._hasTicket(productJob, 'product'));
         if (tickets.length) {
            const badges = TagBuilder.create('div').setAttributes({ className: 'tsp-print-product-badges' }).build();
            tickets.forEach((productJob) => {
               const item = (callbacks.orderItems || []).find((orderItem) => String(orderItem.id) === String(productJob.order_item_id));
               const label = item?.name || (productJob.order_item_id ? `Sản phẩm #${productJob.order_item_id}` : 'Toàn bộ đơn hàng');
               const badge = this._button(label, 'tsp-print-product-badge');
               if (String(productJob.id) === String(job?.id)) badge.classList.add('is-selected');
               badge.setAttribute('aria-pressed', String(productJob.id) === String(job?.id) ? 'true' : 'false');
               badge.onclick = (event) => {
                  event.stopPropagation();
                  this.selectedJobByAsset.set(String(callbacks.assetId), productJob.id);
                  this.editingProductByAsset.delete(String(callbacks.assetId));
                  this._renderActiveJob(this.currentJobs, this.currentCallbacks);
               };
               badges.append(badge);
            });
            row.append(badges);
         } else {
            row.append(TagBuilder.create('span').setAttributes({ className: 'tsp-print-file-status' }).text('Chưa tạo phiếu').build());
         }
      } else {
         row.append(TagBuilder.create('span').setAttributes({ className: `tsp-print-file-status ${ready ? 'is-ready' : ''}` }).text(ready ? 'Đã có phiếu' : 'Chưa tạo phiếu').build());
      }

      if (type === 'product' && ready && !initiallyEditing && this._canCreateProductTicket(callbacks)) {
         const create = this._button('Tạo phiếu', 'button tsp-print-product-new tsp-print-edit-secondary');
         create.onclick = (event) => {
            event.stopPropagation();
            const key = String(callbacks.assetId);
            if (job?.id) this.previousProductByAsset.set(key, job.id);
            this.selectedJobByAsset.set(key, 'new');
            this.newProductItemByAsset.set(key, 0);
            this.editingProductByAsset.set(key, true);
            this._renderActiveJob(this.currentJobs, this.currentCallbacks);
         };
         row.append(create);
      }

      let editing = initiallyEditing;
      const action = this._button(editing ? 'Lưu phiếu' : (ready ? 'Sửa phiếu' : 'Tạo phiếu'), 'button button-primary');
      let cancel = null;
      const addCancelButton = () => {
         if (cancel) return;
         cancel = this._button('Hủy', 'button tsp-print-document-cancel');
         cancel.onclick = (event) => {
            event.stopPropagation();
            const key = String(callbacks.assetId || job?.asset_id || '');
            if (type === 'product') {
               const previousId = this.previousProductByAsset.get(key);
               if (!job?.id && previousId) this.selectedJobByAsset.set(key, previousId);
               else if (!job?.id) this.selectedJobByAsset.delete(key);
               this.newProductItemByAsset.delete(key);
               this.editingProductByAsset.delete(key);
               this.previousProductByAsset.delete(key);
            }
            this._renderActiveJob(this.currentJobs, this.currentCallbacks);
         };
      };
      if (editing) addCancelButton();
      action.onclick = () => {
         if (!editing) {
            editing = true;
            if (type === 'product' && callbacks.assetId) {
               this.editingProductByAsset.set(String(callbacks.assetId), true);
            }
            this._setSectionFieldsEnabled(section, true);
            action.textContent = 'Lưu phiếu';
            row.querySelectorAll('.tsp-print-edit-secondary').forEach((element) => element.remove());
            addCancelButton();
            row.append(cancel);
            return;
         }
         // Read only the active ticket section. Both sections use shared field
         // names (for example `supplier`), so reading the whole form can make
         // one selector overwrite the other.
         const data = this._collectSectionFields(section || form);
         callbacks.onSave?.(job, {
            order_item_id: Number(data.order_item_id || 0),
            quantity: Number(data.product_quantity || job?.quantity || 1),
            create_document: true,
            document_type: type,
            specs: this._collectPrintSpecs(data),
         });
      };
      row.append(action);
      if (cancel && !cancel.parentNode) row.append(cancel);

      if (ready && !editing) {
         const print = this._button('', 'button tsp-print-edit-secondary');
         print.innerText = 'In phiếu';
         print.onclick = () => callbacks.onSheet?.(job, type);
         row.append(print);
      }
      const remove = this._button('Gỡ', 'button-link-delete tsp-print-edit-secondary');
      remove.onclick = () => callbacks.onRemove?.(job, type);
      if (ready && !editing) row.append(remove);
      return row;
   }

   _setSectionFieldsEnabled(section, enabled, preserveNames = []) {
      if (!section) return;
      section.classList.toggle('tsp-print-fields-locked', !enabled);
      section.querySelectorAll('input, select, textarea').forEach((field) => {
         field.disabled = !enabled && !preserveNames.includes(field.name);
      });
   }

   _collectSectionFields(section) {
      const data = {};
      if (!section) return data;
      section.querySelectorAll('input, select, textarea').forEach((field) => {
         if (field.disabled || !field.name) return;
         data[field.name] = field.value;
      });
      return data;
   }

   _collectPrintSpecs(data) {
      return {
         supplier: Number(data.supplier || 0),
         material: data.material,
         width: Number(data.width || 0),
         height: Number(data.height || 0),
         print_size: data.print_size,
         printing_method: data.printing_method,
         color_count: Number(data.color_count || 0),
         color_type: data.color_type,
         print_sheet_quantity: Number(data.print_sheet_quantity || 0),
         proof_quantity: Number(data.proof_quantity || 0),
         print_sides: data.print_sides,
         print_plan: data.print_plan,
         print_note: data.print_note,
         product_width: Number(data.product_width || 0),
         product_height: Number(data.product_height || 0),
         product_form: data.product_form,
         lamination: data.lamination,
         product_sides: data.product_sides,
         product_quantity: Number(data.product_quantity || 0),
         packaging: data.packaging,
         product_note: data.product_note,
      };
   }

   _supplierField(suppliers, value = '') {
      const field = this._field('Nhà cung cấp', this._supplierSelect('supplier', suppliers, value));
      field.classList.add('tsp-print-supplier-field');
      return field;
   }

   _supplierSelect(name, suppliers, value = '') {
      const select = TagBuilder.create('select').setAttributes({ name, className: 'form__field form__item regular-text wd-100 setting__item tsp-print-input' }).build();
      select.append(TagBuilder.create('option').setAttributes({ value: '' }).text('Chọn nhà cung cấp').build());
      suppliers.forEach((supplier) => {
         select.append(TagBuilder.create('option').setAttributes({ value: supplier.id }).text(supplier.name).build());
      });
      const selected = suppliers.find((supplier) => String(supplier.id) === String(value));
      if (value && !selected) {
         select.append(TagBuilder.create('option').setAttributes({ value }).text(`Nhà cung cấp #${value}`).build());
      }
      select.value = String(value || '');
      return select;
   }

   _materialSelect(materials, value = '') {
      return this._termSelect('material', materials, value, 'Chọn chất liệu');
   }

   _termSelect(name, terms, value = '', placeholder = 'Chọn giá trị') {
      const select = TagBuilder.create('select').setAttributes({ name, className: 'form__field form__item regular-text wd-100 setting__item tsp-print-input' }).build();
      select.append(TagBuilder.create('option').setAttributes({ value: '' }).text(placeholder).build());
      terms.forEach((term) => {
         select.append(TagBuilder.create('option').setAttributes({ value: term.name }).text(term.name).build());
      });
      if (value && !terms.some((term) => term.name === value)) {
         select.append(TagBuilder.create('option').setAttributes({ value }).text(value).build());
      }
      select.value = value;
      return select;
   }

   _dimensionValue(value, fallback) {
      return Number(value) > 0 ? value : fallback;
   }

   _pointsToCm(value) {
      const points = Number(value || 0);
      return points > 0 ? Number((points * 2.54 / 72).toFixed(2)) : '';
   }

   _textarea(name, value = '') {
      return TagBuilder.create('textarea').setAttributes({ name, className: 'form__field form__item regular-text wd-100 setting__item tsp-print-input', rows: 3 }).text(value).build();
   }

   _button(label, className) {
      return TagBuilder.create('button').setAttributes({ type: 'button', className }).text(label).build();
   }

   setThumbnail(card, url) {
      const image = card.querySelector('img[data-thumbnail-url]');
      // Only blob URLs fetched from the thumbnail endpoint may reach <img>.
      if (!image || !url || !String(url).startsWith('blob:')) return;
      image.removeAttribute('src');
      image.addEventListener('load', () => card.querySelector('.tsp-print-file-fallback')?.classList.remove('is-visible'), { once: true });
      image.addEventListener('error', () => image.classList.add('is-unavailable'), { once: true });
      image.classList.remove('is-unavailable');
      image.src = url;
   }

   resetUploadZone() {
      const data = this.uploadFiles?.data;
      if (!data) return;
      data.main.querySelectorAll('.files__contain').forEach((node) => node.remove());
      data.label?.classList.remove('hide');
      data.message?.classList.remove('hide');
      if (data.input) data.input.value = '';
      data.result = [];
   }

   showUploadModal({ onFile }) {
      this.uploadFiles = new UploadFiles();
      const id = `tsp-print-upload-${Date.now()}`;
      this.uploadFiles.init({ id });
      this.uploadFiles.accept('.ai,.pdf');
      this.uploadFiles.multiple(false);
      const main = this.uploadFiles.data.main;
      main.classList.add('tsp-print-upload-zone');
      const help = TagBuilder.create('p').setAttributes({ className: 'tsp-print-upload-help' }).text('Kéo thả hoặc chọn một file .AI/.PDF.').build();
      main.prepend(help);

      const input = this.uploadFiles.data.input;
      input.addEventListener('change', () => {
         const file = input.files?.[0];
         if (file) onFile(file);
      }, { capture: true });
      this.uploadFiles.processIncomingFiles = async (files) => {
         const file = files?.[0];
         if (file) await onFile(file);
      };

      const close = this._button('Đóng', 'button');
      close.onclick = () => this.modal.close();
      return this.modal.title('Upload Print file').width('90%').maxWidth('680px').footer(true).footerContent([close]).content([main]).open();
   }

   showLibraryModal(files, callbacks = {}) {
      const wrapper = TagBuilder.create('div').setAttributes({ className: 'tsp-print-library' }).build();
      const search = TagBuilder.create('input').setAttributes({ type: 'search', className: 'tsp-print-library-search', placeholder: 'Tìm theo tên file...' }).build();
      const grid = TagBuilder.create('div').setAttributes({ className: 'tsp-print-library-grid' }).build();
      const loadMore = TagBuilder.create('a').setAttributes({ href: '#', className: 'tsp-print-library-load-more' }).text('Tải thêm file').build();
      let selected = null;
      let libraryFiles = files;
      let hasMore = Boolean(callbacks.hasMore);
      this.libraryGrid = grid;
      const assign = this._button('Gán file', 'button button-primary');
      assign.disabled = true;
      const render = (nextFiles = libraryFiles, append = false) => {
         libraryFiles = append ? [...libraryFiles, ...nextFiles] : nextFiles;
         grid.innerHTML = '';
         libraryFiles.forEach((file) => {
            const card = TagBuilder.create('button').setAttributes({ type: 'button', className: 'tsp-print-library-card', 'data-file-id': file.id }).build();
            const icon = TagBuilder.create('span').setAttributes({ className: 'tsp-print-library-icon' }).html(file.extension === 'ai' ? AI_FILE_ICON : FILE_PDF_ICON).build();
            const thumb = TagBuilder.create('img').setAttributes({ className: 'tsp-print-library-thumb', alt: file.name, 'data-thumbnail-url': file.thumbnail_url || '' }).build();
            if (file.thumbnail_status === 'ready') card.append(thumb);
            card.append(icon, TagBuilder.create('strong').text(file.name).build(), TagBuilder.create('small').text(`${String(file.extension).toUpperCase()} · ${file.size}`).build());
            card.onclick = () => {
               selected = file;
               grid.querySelectorAll('.tsp-print-library-card').forEach((item) => item.classList.remove('is-selected'));
               card.classList.add('is-selected');
               assign.disabled = false;
            };
            grid.append(card);
         });
         if (!grid.children.length) grid.append(TagBuilder.create('p').setAttributes({ className: 'tsp-print-files-empty' }).text('Không tìm thấy file phù hợp.').build());
         loadMore.classList.toggle('is-hidden', !hasMore);
      };
      this.updateLibraryFiles = (nextFiles, options = {}) => {
         hasMore = Boolean(options.hasMore);
         selected = null;
         assign.disabled = true;
         render(nextFiles, Boolean(options.append));
      };
      let searchTimer = null;
      search.oninput = () => {
         clearTimeout(searchTimer);
         searchTimer = setTimeout(() => callbacks.onSearch?.(search.value), 300);
      };
      loadMore.onclick = async (event) => {
         event.preventDefault();
         if (!hasMore || loadMore.classList.contains('is-loading')) return;
         loadMore.classList.add('is-loading');
         try {
            await callbacks.onLoadMore?.(search.value);
         } finally {
            loadMore.classList.remove('is-loading');
         }
      };
      wrapper.append(search, grid, loadMore);
      render();
      const close = this._button('Đóng', 'button');
      close.onclick = () => this.modal.close();
      assign.onclick = () => {
         if (selected) callbacks.onChoose?.(selected);
      };
      return this.modal.title('Quản lý Print files').width('94%').maxWidth('960px').footer(true).footerContent([close, assign]).content([wrapper]).open();
   }

   _input(name, value, type = 'text', step = '') {
      const attrs = { name, type, value: String(value ?? ''), className: 'form__field form__item regular-text wd-100 setting__item tsp-print-input' };
      if (step) attrs.step = step;
      return TagBuilder.create('input').setAttributes(attrs).build();
   }

   _field(label, control) {
      return TagBuilder.create('div').setAttributes({ className: 'frame__item' }).append([
         TagBuilder.create('label').setAttributes({ className: 'item__label' }).append([
            TagBuilder.create('div').setAttributes({ className: '__label' }).text(label).build(),
            TagBuilder.create('div').setAttributes({ className: 'item__view' }).append([control]).build(),
         ]).build(),
      ]).build();
   }

   showPreview(asset, blobUrl, { thumbnail = false } = {}) {
      const body = TagBuilder.create('div').setAttributes({ className: 'tsp-print-preview-modal' }).build();
      if (thumbnail) {
         body.append(TagBuilder.create('img').setAttributes({ src: blobUrl, alt: asset.name || 'Print file thumbnail', className: 'tsp-print-thumbnail-preview' }).build());
      } else if (asset.extension === 'pdf') {
         body.append(TagBuilder.create('embed').setAttributes({ src: blobUrl, type: 'application/pdf' }).build());
      } else {
         body.append(TagBuilder.create('p').text('Không có thumbnail để xem file này.').build());
      }
      return this.modal.title(asset.name).width('95%').maxWidth('1200px').footer(false).content([body]).open();
   }

   showSheetModal(job, type = 'all', options = {}) {
      const sheet = this._createSheet(job, type, options);
      this.currentSheet = { job, type, options };
      const close = this._button('Đóng', 'button');
      close.onclick = () => this.modal.close();
      const print = this._button('In phiếu', 'button button-primary');
      print.onclick = () => this.printSheet(job, type, options);
      const title = type === 'print' ? 'Phiếu in' : type === 'product' ? 'Phiếu thành phẩm' : 'Phiếu thông tin in & gia công';

      return this.modal
         .title(`${title} - ${job.asset?.name || ''}`)
         .width('95%')
         .maxWidth('840px')
         .footer(true)
         .footerContent([close, print])
         .content([sheet])
         .open();
   }

   printSheet(job, type = 'all', options = {}) {
      const html = this._createSheet(job, type, options).outerHTML;
      const frame = document.createElement('iframe');
      frame.setAttribute('title', 'Print sheet');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.border = '0';
      frame.style.opacity = '0';
      document.body.append(frame);

      const win = frame.contentWindow;
      const doc = frame.contentDocument || win?.document;
      if (!win || !doc) {
         frame.remove();
         return this.showNotice('Không thể khởi tạo chức năng in.', 'error');
      }
      const stylesheetLinks = [...document.querySelectorAll('link[rel="stylesheet"]')]
         .map((link) => link.href)
         .filter(Boolean)
         .map((href) => `<link rel="stylesheet" href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`)
         .join('');
      doc.open();
      doc.write(`
         <!doctype html>
         <html>
            <head>
               <meta charset="utf-8">
               ${stylesheetLinks}
                  <title>${type === 'print' ? 'Phiếu in' : type === 'product' ? 'Phiếu thành phẩm' : 'Phiếu in & gia công'}</title>
               <style>html, body { margin: 0; padding: 0; } body { color: #111; }</style>
            </head>
            <body>${html}</body>
         </html>
      `);
      doc.close();
      const cleanup = () => frame.remove();
      win.addEventListener('afterprint', cleanup, { once: true });
      const images = [...doc.images];
      const waitForImages = images.map((image) => image.complete
         ? Promise.resolve()
         : new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
         }));
      Promise.all(waitForImages).then(() => {
         win.focus();
         win.print();
         // Some browsers do not dispatch afterprint for an iframe.
         window.setTimeout(cleanup, 1000);
      });
   }

   _createSheet(job, type = 'all', options = {}) {
      if (['print', 'product'].includes(type) && this.printTemplate) {
         return this._createPrintTemplateSheet(job, options, type);
      }

      const asset = job.asset || {};
      const specs = type === 'print'
         ? (job.print_specs || {})
         : type === 'product'
            ? (job.specs || {})
            : { ...(job.print_specs || {}), ...(job.specs || {}) };
      const rows = [
         ['File', asset.name || ''],
         ['Loại file', String(asset.extension || '').toUpperCase()],
         ['Kích thước file (cm)', `${this._pointsToCm(asset.width) || 0} × ${this._pointsToCm(asset.height) || 0}`],
      ];
      if (type !== 'print') rows.splice(2, 0, ['Sản phẩm trong đơn hàng', job.order_item_id ? `#${job.order_item_id}` : 'Toàn bộ đơn hàng']);
      const sections = [
         {
            title: 'IN',
            rows: [
               ['Nhà cung cấp', this._supplierLabel(specs.supplier)],
               ['Chất liệu', specs.material || ''],
               ['Khổ rộng - cao (cm)', `${specs.width || ''} × ${specs.height || ''}`],
               ['Khổ in', specs.print_size || ''],
               ['Phương pháp in', specs.printing_method || ''],
               ['Số màu', specs.color_count || ''],
               ['Loại màu', specs.color_type || specs.colors || ''],
               ['Số lượng tờ in', specs.print_sheet_quantity || ''],
               ['Số lượng thử bài', specs.proof_quantity || ''],
               ['Số mặt in', specs.print_sides || ''],
               ['Phương án in', specs.print_plan || ''],
               ['Ghi chú', specs.print_note || specs.note || ''],
            ],
         },
         {
            title: 'THÀNH PHẨM',
            rows: [
               ['Nhà cung cấp', this._supplierLabel(specs.supplier)],
               ['Kích thước (cm)', `${specs.product_width ?? specs.width ?? ''} × ${specs.product_height ?? specs.height ?? ''}`],
               ['Thành phẩm', specs.product_form || ''],
               ['Cán màng', specs.lamination || ''],
               ['Số mặt', specs.product_sides || ''],
               ['Số lượng', specs.product_quantity ?? job.quantity ?? ''],
               ['Đóng gói', specs.packaging || ''],
               ['Ghi chú', specs.product_note || ''],
            ],
         },
      ];

      const table = TagBuilder.create('table').build();
      rows.forEach(([label, value]) => {
         table.append(TagBuilder.create('tr').append([
            TagBuilder.create('th').text(label).build(),
            TagBuilder.create('td').text(String(value || '')).build(),
         ]).build());
      });
      sections.filter((section) => type === 'all' || (type === 'print' && section.title === 'IN') || (type === 'product' && section.title === 'THÀNH PHẨM')).forEach((section) => {
         table.append(TagBuilder.create('tr').setAttributes({ className: 'tsp-print-sheet-section' }).append([
            TagBuilder.create('th').setAttributes({ colSpan: 2 }).text(section.title).build(),
         ]).build());
         section.rows.forEach(([label, value]) => {
            table.append(TagBuilder.create('tr').append([
               TagBuilder.create('th').text(label).build(),
               TagBuilder.create('td').text(String(value || '')).build(),
            ]).build());
         });
      });

      return TagBuilder.create('div')
         .setAttributes({ className: 'tsp-print-sheet' })
         .append([
            TagBuilder.create('h2').text(type === 'print' ? 'PHIẾU IN' : type === 'product' ? 'PHIẾU THÀNH PHẨM' : 'PHIẾU THÔNG TIN IN & GIA CÔNG').build(),
            table,
         ])
         .build();
   }

   _createPrintTemplateSheet(job, options = {}, type = 'print') {
      const holder = document.createElement('div');
      holder.innerHTML = this.printTemplate.trim();
      const style = holder.querySelector('style');
      const article = holder.querySelector('.tsp-print-a4');
      if (!article) return this._createSheet(job, type, options);

      const asset = job?.asset || {};
      const specs = job?.print_specs || {};
      const productSpecs = job?.specs || {};
      const baseContext = this.printTemplateContext || {};
      const orderContext = baseContext.order || {};
      const orderItem = (this.currentCallbacks.orderItems || []).find((item) => String(item.id) === String(job?.order_item_id || ''));
      const context = {
         company: baseContext.company || {},
         user: baseContext.user || {},
         order: orderContext.number ? `#${orderContext.number}` : `#${job?.order_id || ''}`,
         document_title: type === 'product' ? 'PHIẾU THÀNH PHẨM' : 'PHIẾU THÔNG TIN IN',
         asset: {
            name: asset.name || '',
            type: String(asset.extension || '').toUpperCase(),
            dimensions: `${this._pointsToCm(asset.width) || 0} × ${this._pointsToCm(asset.height) || 0} cm`,
            thumbnail: type === 'product'
               ? (orderItem?.image_url || '')
               : (options.thumbnailUrl || ''),
         },
         specs: {
            ...specs,
            supplier: this._supplierDetails(productSpecs.supplier || specs.supplier),
            size: `${specs.width || ''} × ${specs.height || ''}`,
            product_name: productSpecs.product_name || orderItem?.name || '',
            product_size: `${productSpecs.product_width || ''} × ${productSpecs.product_height || ''}`,
            lamination: productSpecs.lamination || '',
            product_sides: productSpecs.product_sides || '',
            product_form: productSpecs.product_form || '',
            product_quantity: productSpecs.product_quantity ?? job?.quantity ?? '',
            packaging: productSpecs.packaging || '',
            product_note: productSpecs.product_note || '',
         },
         date: this._formatAdministrativeDate(),
      };

      article.querySelectorAll('[data-tsp-bind]').forEach((element) => {
         const value = this._templateValue(context, element.dataset.tspBind);
         element.textContent = value == null ? '' : String(value);
      });
      article.querySelectorAll('[data-tsp-bind-src]').forEach((element) => {
         const value = this._templateValue(context, element.dataset.tspBindSrc);
         if (value) {
            element.setAttribute('src', value);
            element.style.display = 'block';
         } else {
            element.removeAttribute('src');
            element.style.display = 'none';
         }
      });

      article.querySelectorAll('[data-tsp-print-option]').forEach((element) => {
         const option = element.dataset.tspPrintOption;
         if (Object.prototype.hasOwnProperty.call(this.documentPanelState, option)) {
            const sourceAvailable = option === 'stamp'
               ? Boolean(context.company.stamp)
               : option === 'signature'
                  ? Boolean(context.user.signature)
                  : option === 'reference'
                     ? Boolean(context.asset.thumbnail)
                     : true;
            element.style.display = this.documentPanelState[option] && sourceAvailable ? 'block' : 'none';
         }
      });

      article.querySelectorAll('[data-tsp-document-type]').forEach((element) => {
         const documentType = element.dataset.tspDocumentType;
         const visible = documentType === 'all' || documentType === type;
         element.style.display = visible
            ? (element.tagName === 'TABLE' ? 'table' : '')
            : 'none';
      });

      const thumbnail = article.querySelector('[data-tsp-bind-src="asset.thumbnail"]');
      const reference = article.querySelector('[data-tsp-print-option="reference"]');
      const emptyThumbnail = article.querySelector('[data-tsp-thumbnail-empty]');
      const showEmptyThumbnail = () => {
         if (thumbnail) thumbnail.style.display = 'none';
         if (reference) reference.style.display = 'none';
         if (emptyThumbnail) emptyThumbnail.style.display = 'flex';
      };
      if (thumbnail && context.asset.thumbnail) {
         thumbnail.style.display = 'block';
         if (reference) reference.style.display = this.documentPanelState.reference ? 'block' : 'none';
         if (emptyThumbnail) emptyThumbnail.style.display = 'none';
         thumbnail.addEventListener('error', showEmptyThumbnail, { once: true });
      } else {
         showEmptyThumbnail();
      }

      const result = document.createElement('div');
      result.className = 'tsp-print-template-root';
      if (style) result.append(style.cloneNode(true));
      result.append(article);
      return result;
   }

   _templateValue(context, path) {
      return String(path || '').split('.').reduce((value, key) => value?.[key], context) ?? '';
   }

   _supplierLabel(value) {
      const supplier = (this.printTemplateContext?.suppliers || []).find((item) => String(item.id) === String(value));
      return supplier?.name || value || '';
   }

   _supplierDetails(value) {
      const supplier = (this.printTemplateContext?.suppliers || []).find((item) => String(item.id) === String(value));
      if (!supplier) {
         return {
            company: value || '',
            address: '',
            phone: '',
            email: '',
         };
      }
      return {
         company: supplier.company || supplier.name || '',
         address: supplier.address || '',
         phone: supplier.phone || '',
         email: supplier.email || '',
      };
   }

   _formatAdministrativeDate() {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `Ngày ${day} tháng ${month} năm ${date.getFullYear()}`;
   }
}
