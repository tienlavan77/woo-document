// Provides module declarations and business logic for printFileController.js.

import Controller from '../../controller.js';
import PrintFileModel from '../../../Models/PrintFiles/printFileModel.js';
import PrintFileViewer from '../../../Views/Woocommerce/PrintFiles/printFileViewer.js';

// Defines PrintFileController class behavior for printFileController.js.
export default class PrintFileController extends Controller {
   // Defines constructor method behavior for printFileController.js.
   constructor() {
      super();
      this.model = new PrintFileModel();
      this.viewer = new PrintFileViewer();
      this.jobs = [];
      this.printOptions = { materials: [], suppliers: [], printing_methods: [], print_sides: [], laminations: [], product_forms: [] };
      this.thumbnailCache = new Map();
      this.thumbnailRequests = new Map();
      this.thumbnailDataCache = new Map();
      this.templateContext = {};
      this.init();
   }

   // Defines init method behavior for printFileController.js.
   async init() {
      await this.model.init();
      this.orderId = this._getOrderId();
      if (!this.orderId) return;
      this.viewer.setActiveAssetStorageKey(`tsp_print_active_asset_${this.orderId}`);

      const mount = this._getOrderItemsMount();
      if (!mount) return;
      this.panel = this.viewer.createPanel();
      mount.insertAdjacentElement('afterend', this.panel);
      const documentPanel = this.viewer.createDocumentPanel();
      document.body.append(documentPanel);
      this.viewer.bindPanelActions({
         onUpload: (file) => this.openUpload(file),
         onLibrary: () => this.openLibrary(),
      });
      await this.loadPrintOptions();
      await this.loadPrintTemplate();
      await this.reloadJobs();
   }

   // Defines loadPrintTemplate method behavior for printFileController.js.
   async loadPrintTemplate() {
      const response = await this.model.getTemplate('print-template-A4');
      if (response?.status?.code === 200) {
         this.viewer.setPrintTemplate(response.status.data.template || '');
      }
   }

   // Defines loadPrintOptions method behavior for printFileController.js.
   async loadPrintOptions() {
      const response = await this.model.getPrintOptions();
      if (response?.status?.code === 200) {
         this.printOptions = {
            materials: response.status.data.materials || [],
            suppliers: response.status.data.suppliers || [],
            printing_methods: response.status.data.printing_methods || [],
            print_sides: response.status.data.print_sides || [],
            laminations: response.status.data.laminations || [],
            product_forms: response.status.data.product_forms || [],
         };
      }
   }

   // Defines _getOrderId method behavior for printFileController.js.
   _getOrderId() {
      const value = document.querySelector('#post_ID')?.value || new URLSearchParams(window.location.search).get('post');
      const id = Number.parseInt(value || '', 10);
      return Number.isInteger(id) && id > 0 ? id : null;
   }

   // Defines _getOrderItemsMount method behavior for printFileController.js.
   _getOrderItemsMount() {
      const items = document.querySelector('#woocommerce-order-items, #order_items, .woocommerce-order-items, .wc-order-items-editable');
      if (!items) return null;
      return items.closest('.postbox') || items;
   }

   // Defines _getOrderItems method behavior for printFileController.js.
   _getOrderItems() {
      const rows = document.querySelectorAll('#woocommerce-order-items [data-order_item_id], #order_items [data-order_item_id], .woocommerce-order-items [data-order_item_id]');
      return [...rows].map((row) => ({
         id: Number(row.dataset.order_item_id),
         name: row.querySelector('.wc-order-item-name, .name, .item_name')?.textContent?.trim() || `Item #${row.dataset.order_item_id}`,
      })).filter((item) => item.id);
   }

   // Defines reloadJobs method behavior for printFileController.js.
   async reloadJobs() {
      const response = await this.model.getOrderJobs(this.orderId);
      if (response?.status?.code !== 200 && response?.status?.code !== 201) {
         this.viewer.showNotice(response?.status?.message || 'Không thể tải Print files.', 'error');
         return;
      }
      this.jobs = response.status.data.jobs || [];
      this.productJobs = response.status.data.product_jobs || this.jobs.filter((job) => Number(job.order_item_id) > 0);
      this.templateContext = {
         ...(response.status.data.template_context || {}),
         suppliers: this.printOptions.suppliers,
      };
      this.viewer.setPrintTemplateContext(this.templateContext);
      const orderItems = response.status.data.order_items || this._getOrderItems();
      this.viewer.renderJobs(this.jobs, {
         orderItems,
         orderId: this.orderId,
         materials: this.printOptions.materials,
         suppliers: this.printOptions.suppliers,
         printingMethods: this.printOptions.printing_methods,
         printSides: this.printOptions.print_sides,
         laminations: this.printOptions.laminations,
         productForms: this.printOptions.product_forms,
         onPreview: (job) => this.preview(job),
         onSave: (job, data) => this.saveJob(job, data),
         onSheet: (job, type) => this.showSheet(job, type),
         onRemove: (job, type) => this.removeJob(job, type),
         onRemoveAsset: (asset) => this.removeAssetFromOrder(asset),
         allProductJobs: this.productJobs,
         onActiveChange: () => this.loadThumbnails(),
      });
      this.loadThumbnails();
   }

   // Defines loadThumbnails method behavior for printFileController.js.
   async loadThumbnails() {
      const cards = [...this.viewer.grid.querySelectorAll('.tsp-print-file-card')];
      await Promise.all(cards.map(async (card) => {
         const job = this.jobs.find((item) => String(item.asset_id) === String(card.dataset.assetId));
         const group = this.viewer.assetGroups?.find((item) => String(item.asset?.id) === String(card.dataset.assetId));
         const asset = group?.asset || job?.asset;
         if (!asset?.id) return;
         try {
            const url = await this.getThumbnailUrl(asset);
            this.viewer.setThumbnail(card, url);
         } catch (error) {
            // Keep the fallback icon when a legacy asset has no thumbnail yet.
         }
      }));
   }

   // Defines getThumbnailUrl method behavior for printFileController.js.
   async getThumbnailUrl(asset) {
      const baseUrl = asset.thumbnail_url || `${this.model.api}/print-files/${encodeURIComponent(asset.id)}/thumbnail`;
      const thumbnailUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}thumbnail_version=2`;
      const cacheKey = thumbnailUrl;
      if (this.thumbnailCache.has(cacheKey)) return this.thumbnailCache.get(cacheKey);
      if (this.thumbnailRequests.has(cacheKey)) return this.thumbnailRequests.get(cacheKey);

      const request = this.model.getBlob(thumbnailUrl, 'image/').then((blob) => {
         const url = URL.createObjectURL(blob);
         this.thumbnailCache.set(cacheKey, url);
         this.thumbnailRequests.delete(cacheKey);
         return url;
      }).catch((error) => {
         this.thumbnailRequests.delete(cacheKey);
         throw error;
      });
      this.thumbnailRequests.set(cacheKey, request);
      return request;
   }

   // Defines openUpload method behavior for printFileController.js.
   async openUpload(file) {
      if (!file) return;
      this.viewer.showNotice('Đang upload Print file...', 'info');
      const response = await this.model.uploadFile(file);
      this.viewer.resetUploadZone();
      if (response?.status?.code !== 201 && response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Upload Print file thất bại.', 'error');
         return;
      }
      this.viewer.showNotice('Upload thành công. Đang gắn file vào đơn hàng...', 'success');
      await this.assignAsset(response.status.data);
   }

   // Defines openLibrary method behavior for printFileController.js.
   async openLibrary() {
      const response = await this.model.getAssets({ page: 1, count: 15 });
      if (response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Không thể tải thư viện file.', 'error');
         return;
      }
      const data = response.status.data;
      this.libraryPage = 1;
      this.librarySearch = '';
      this.librarySearchRequest = 0;
      this.viewer.showLibraryModal(data.files || [], {
         hasMore: Boolean(data.has_more),
         onChoose: (asset) => this.assignAsset(asset),
         onSearch: (keyword) => this.searchLibrary(keyword),
         onLoadMore: (keyword) => this.loadMoreLibrary(keyword),
      });
      await this.loadLibraryThumbnails(data.files || []);
   }

   // Defines searchLibrary method behavior for printFileController.js.
   async searchLibrary(keyword = '') {
      this.librarySearch = keyword.trim();
      this.libraryPage = 1;
      const requestId = ++this.librarySearchRequest;
      const response = await this.model.getAssets({ page: 1, count: 15, search: this.librarySearch });
      if (requestId !== this.librarySearchRequest) return;
      if (response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Không thể tìm file.', 'error');
         return;
      }
      const data = response.status.data;
      this.viewer.updateLibraryFiles(data.files || [], { hasMore: Boolean(data.has_more) });
      await this.loadLibraryThumbnails(data.files || []);
   }

   // Defines loadMoreLibrary method behavior for printFileController.js.
   async loadMoreLibrary(keyword = '') {
      this.libraryPage += 1;
      const response = await this.model.getAssets({ page: this.libraryPage, count: 15, search: keyword.trim() });
      if (response?.status?.code !== 200) {
         this.libraryPage -= 1;
         this.viewer.showNotice(response?.status?.message || 'Không thể tải thêm file.', 'error');
         return;
      }
      const data = response.status.data;
      this.viewer.updateLibraryFiles(data.files || [], { append: true, hasMore: Boolean(data.has_more) });
      await this.loadLibraryThumbnails(data.files || []);
   }

   // Defines loadLibraryThumbnails method behavior for printFileController.js.
   async loadLibraryThumbnails(files) {
      const cards = [...(this.viewer.libraryGrid?.querySelectorAll('.tsp-print-library-card') || [])];
      await Promise.all(cards.map(async (card) => {
         const file = files.find((item) => String(item.id) === card.dataset.fileId);
         if (!file?.thumbnail_url || file.thumbnail_status !== 'ready') return;
         try {
            const image = card.querySelector('.tsp-print-library-thumb');
            if (image) {
               const thumbnailUrl = await this.getThumbnailUrl(file);
               if (!thumbnailUrl.startsWith('blob:')) return;
               image.removeAttribute('src');
               image.addEventListener('load', () => card.classList.add('has-thumbnail'), { once: true });
               image.addEventListener('error', () => card.classList.remove('has-thumbnail'), { once: true });
               image.src = thumbnailUrl;
               if (image.complete && image.naturalWidth > 0) card.classList.add('has-thumbnail');
            }
         } catch (error) {
            // The file icon remains available when a thumbnail cannot be loaded.
         }
      }));
   }

   // Defines assignAsset method behavior for printFileController.js.
   async assignAsset(asset) {
      if (!asset?.id) return;
      const response = await this.model.createJob(this.orderId, {
         asset_id: asset.id,
         order_item_id: 0,
         quantity: 1,
         create_document: false,
         specs: {},
      });
      if (response?.status?.code !== 200 && response?.status?.code !== 201) {
         this.viewer.showNotice(response?.status?.message || 'Không thể gán file vào đơn hàng.', 'error');
         return;
      }
      this.viewer.modal.close();
      // Make the file just selected the active card after the API reload.
      this.viewer.setActiveAsset(asset.id);
      this.viewer.showNotice('Đã gán file vào đơn hàng.', 'success');
      await this.reloadJobs();
   }

   // Defines saveJob method behavior for printFileController.js.
   async saveJob(job, data) {
      if (this.savingJob) return false;
      this.savingJob = true;
      try {
         // A new product ticket uses the draft job (id = 0), even when the
         // current file already has a base assignment job.
         const isProductTicket = data.document_type === 'product';
         const response = isProductTicket
            ? (Number(job?.id) > 0
               ? await this.model.updateProductTicket(job.id, data)
               : await this.model.createProductTicket(this.orderId, data))
            : (Number(job?.id) > 0
               ? await this.model.updateJob(job.id, data)
               : await this.model.createJob(this.orderId, {
                  ...data,
                  asset_id: job?.asset_id,
               }));
         if (response?.status?.code !== 200 && response?.status?.code !== 201) {
            this.viewer.showNotice(response?.status?.message || 'Không thể lưu phiếu in.', 'error');
            return false;
         }
         const savedJob = response.status.data || {};
         if (data.document_type === 'product') {
            const savedJobId = savedJob.id || job?.id;
            if (savedJobId) this.viewer.selectedProductJobId = savedJobId;
            this.viewer.editingProductByAsset.clear();
         }
         const title = data.document_type === 'print' ? 'phiếu in' : 'phiếu thành phẩm';
         this.viewer.showNotice(`Đã lưu ${title}.`, 'success');
         // Render the complete post-save button set from the fresh server
         // response instead of mutating only the current row.
         await this.reloadJobs();
         return savedJob;
      } catch (error) {
         this.viewer.showNotice(error?.message || 'Không thể lưu phiếu in.', 'error');
         return false;
      } finally {
         this.savingJob = false;
      }
   }

   // Defines preview method behavior for printFileController.js.
   async preview(job) {
      try {
         const url = await this.getThumbnailUrl(job.asset);
         this.viewer.showPreview(job.asset, url, { thumbnail: true });
      } catch (error) {
         this.viewer.showNotice(error.message || 'Không thể xem file.', 'error');
      }
   }

   // Defines showSheet method behavior for printFileController.js.
   async showSheet(job, type) {
      let thumbnailUrl = '';
      if (type === 'print' || type === 'product') {
         try {
            thumbnailUrl = await this.getThumbnailDataUrl(job?.asset);
         } catch (error) {
            // The template will show its empty-thumbnail state when preview is unavailable.
         }
      }
      // Print directly; the sheet preview modal is not needed for this action.
      this.viewer.printSheet(job, type, { thumbnailUrl });
   }

   // Defines getThumbnailDataUrl method behavior for printFileController.js.
   async getThumbnailDataUrl(asset) {
      if (!asset?.id) return '';
      const baseUrl = asset.thumbnail_url || `${this.model.api}/print-files/${encodeURIComponent(asset.id)}/thumbnail`;
      const thumbnailUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}thumbnail_version=2`;
      const cacheKey = thumbnailUrl;
      if (this.thumbnailDataCache.has(cacheKey)) return this.thumbnailDataCache.get(cacheKey);
      const blob = await this.model.getBlob(thumbnailUrl, 'image/');
      const dataUrl = await new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result);
         reader.onerror = () => reject(reader.error || new Error('Không thể đọc thumbnail.'));
         reader.readAsDataURL(blob);
      });
      this.thumbnailDataCache.set(cacheKey, dataUrl);
      return dataUrl;
   }

   // Defines removeJob method behavior for printFileController.js.
   async removeJob(job, type = 'product') {
      if (!job?.id || this.removingJobId) return;
      this.removingJobId = job.id;
      try {
         const response = type === 'print'
            ? await this.model.deletePrintTicket(job.id)
            : await this.model.deleteProductTicket(job.id);
         if (response?.status?.code !== 200) {
            this.viewer.showNotice(response?.status?.message || 'Không thể gỡ phiếu khỏi order.', 'error');
            return;
         }
         if (type === 'product') {
            if (String(this.viewer.selectedProductJobId) === String(job.id)) this.viewer.selectedProductJobId = null;
            this.viewer.editingProductByAsset.clear();
         }
         this.viewer.showNotice(type === 'print' ? 'Đã gỡ phiếu in.' : 'Đã gỡ phiếu thành phẩm.', 'success');
         await this.reloadJobs();
      } catch (error) {
         this.viewer.showNotice(error?.message || 'Không thể gỡ phiếu khỏi order.', 'error');
      } finally {
         this.removingJobId = null;
      }
   }

   // Defines removeAssetFromOrder method behavior for printFileController.js.
   async removeAssetFromOrder(asset) {
      if (!asset?.id) return;

      const response = await this.model.detachAsset(this.orderId, asset.id);
      if (response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Không thể gỡ file khỏi đơn hàng.', 'error');
         return;
      }
      const key = String(asset.id);
      this.viewer.selectedJobByAsset.delete(key);
      this.viewer.newProductItemByAsset.delete(key);
      this.viewer.editingProductByAsset.delete(key);
      this.viewer.previousProductByAsset.delete(key);
      this.viewer.showNotice('Đã gỡ file khỏi đơn hàng. File vẫn còn trong thư viện.', 'success');
      await this.reloadJobs();
   }
}
