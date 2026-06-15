import Controller from "../controller";
import TextHelper from "../../Vendor/helpers/textHelper";
import PanelController from '../Panel/panelController'
import VietnameseNumberReader from '../../Vendor/helpers/numByText'

/**
 * AdminController: Lớp cha cho các module quản trị (Quotation, Delivery, VAT Invoice).
 * Quản lý các logic chung như xử lý sự kiện DOM, Panel actions, đồng bộ Broadcast Channel.
 */
export default class AdminController extends Controller {
   constructor() {
      super();
      this.viewer = null;
      this.model = null;
      this.panel = null;
      this.preset = null; // controller điều khiển cho template
      this.type = null; // Loại đơn hàng: quotation, delivery, invoice
   }

   async init() {
      // nạp panel
      this.setupPanel()
      await this.preset.init({
         customer: this.model.customer?.data || {}, 
         products: this.model.products?.data || {},
         vat: this.model.data
      });

      this.panel.init(this.preset.viewer.body);

      this.viewer.body.children = [
         this.preset.viewer.body,
         this.panel.viewer.body 
      ];
      this.viewer.init();
      this.initDataTracking();
   }

   // nạp bộ điều khiển panel
   setupPanel() {
      this.panel = new PanelController(this.preset.model);
   }
   /**
    * Khởi động các bộ lắng nghe dữ liệu chungg
    */
   initDataTracking() {
      const body = this.preset.viewer.body;
      const panelBody = this.panel.viewer.body;
      this._bodyAddEventListener(body);
      this._panelBodyAddEventListener(panelBody, body);
   }

   // =====================================================================
   // 1. XỬ LÝ SỰ KIỆN DOM (EVENT DELEGATION)
   // =====================================================================

   /**
    * Lắng nghe tương tác bên trong vùng Template
    */
   _bodyAddEventListener(body) {
      let originalValue = "";

      // 1. FOCUS IN: Xử lý format trước khi nhập liệu
      body.addEventListener('focusin', (e) => {
         const target = e.target;
         if (target.classList.contains('editable')) {
            let val = target.innerText.trim();
            const locate = target.dataset.locate;

            if (locate && /price|quantity/.test(locate)) {
               val = val.replace(/,/g, '');
               target.innerText = val;
            }
            originalValue = val;
         }
      });

      // 2. FOCUS OUT: Cập nhật model và format lại
      body.addEventListener('focusout', (e) => {
         const target = e.target;
         if (  !target.isContentEditable) return;

         const rawValue = target.innerText.trim();
         const locate = target.dataset.locate;
         if (locate) {
            const [type, ...rest] = locate.split('|');
            const updateMethod = `_update${TextHelper.capitalize(type)}`;
            if (typeof this[updateMethod] === 'function') {
               this[updateMethod](target, rest, rawValue, originalValue);
            }
         }
      });

      // 3. CLICK: Các nút chức năng nội bộ
      body.addEventListener('click', (e) => {
         const clickedBtn = e.target.closest('.index-button');
         if (clickedBtn?.dataset?.action && typeof this[clickedBtn.dataset.action] === 'function') {
            this[clickedBtn.dataset.action](clickedBtn);
         }
      });

      // 4. CHANGE: Checkbox selection
      body.addEventListener('change', (e) => {
         if (e.target.classList.contains('check-item')) {
            this._handleItemCheckboxChange();
         } else if (e.target.classList.contains('check-all')) {
            this._handleSelectAll(e.target.checked);
         }
      });
   }

   /**
    * Lắng nghe tương tác trên Bảng điều khiển (Panel)
    */
   _panelBodyAddEventListener(body, PresetBody) {
      const actions = body.querySelector('.__actions');
      if (!actions) return;
      actions.addEventListener('click', e => {
         const clickedButton = e.target.closest('.panel-btn');
         const action = clickedButton?.dataset?.action;       
         if (action && typeof this[action] === 'function') {
            this[action](PresetBody);
         }
      });
   }

   // =====================================================================
   // 2. LOGIC CHECKBOX
   // =====================================================================

   _handleItemCheckboxChange() {
      const items = document.querySelectorAll('.check-item');
      const checkedItems = document.querySelectorAll('.check-item:checked');
      if (this.viewer && typeof this.viewer.updateCheckAllStatus === 'function') {
         this.viewer.updateCheckAllStatus(items.length, checkedItems.length);
      }
   }

   _handleSelectAll(isChecked) {
      const allCheckboxes = document.querySelectorAll('.check-item');
      allCheckboxes.forEach(cb => cb.checked = isChecked);
   }

   _hiddenProduct(target) { 
      let id = target.dataset.id;
      if (!id) return;

      const product = this.model.products.data[id];
      if (!product) return;

      if (product.isPrint === undefined || product.isPrint === null) {
         product.isPrint = false;
      } else {
         // Bước 2: Nếu đã tồn tại, đảo ngược trạng thái (true -> false và ngược lại)
         product.isPrint = !product.isPrint;
      }
     
      this.model.products.saveLocal();
      
      this.model.data = this._vatCalculating();    
      this.viewer.updateVatSummaryPreset(this.preset.viewer.body, this.model.data);  

      const productRow = target.closest('.product-row');
      if (productRow) {
         [ 'opacity-50', 'screen-only' ].forEach(cls => productRow.classList.toggle(cls));
         this.preset.viewer._setOpacity(target);
      }
   }
   // =====================================================================
   // 3. CẬP NHẬT DỮ LIỆU CHUNG
   // =====================================================================

   _updateCustomer(target, rest, rawValue, originalValue) {
      if (rawValue === originalValue) return;
      const [field] = rest;
      if (this.model && this.model.customer) {
         this.model.customer.data[field] = rawValue;
         this.model.customer.saveLocal();
      }
   }

   _updateProduct(target, rest, rawValue, originalValue) {
      const [fieldType] = rest;
      if (/price|quantity/.test(fieldType)) {
         if (typeof this._updateVariation === 'function') {
            this._updateVariation(target, rest, rawValue, originalValue);
         }
      } else {
         const method = `_update${TextHelper.capitalize(fieldType)}`;
         if (typeof this[method] === 'function') {
            this[method](target, rest, rawValue, originalValue);
         }
      }
   }

   _updateAttributes(target, rest, rawValue, originalValue) {
      if (rawValue === originalValue) return;
      const [attributesStr, slug, id] = rest;
      const product = this.model?.products?.data[id];
      if (product && product.attributes) {
         product.attributes[slug].option = rawValue;
         this.model.products.saveLocal();
      }
   }

   _updateName(target, rest, rawValue, originalValue) {
      if (rawValue === originalValue) return;
      const [nameStr, id] = rest;
      const product = this.model?.products?.data[id];
      if (product) {
         product.name = rawValue;
         this.model.products.saveLocal();
      }
   }

   /** Định dạng lại số hiển thị */
   _reFormatTarget(target) {
      const val = target.innerText.trim().replace(/,/g, '');
      if (val !== "" && !isNaN(val)) {
         target.innerText = new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2
         }).format(parseFloat(val));
      }
   }
      // =====================================================================
   // 3. CẬP NHẬT DỮ LIỆU & GIAO DIỆN (CỤC BỘ)
   // =====================================================================

   _updateVariation(target, rest, rawValue, originalValue) {   
       // Bỏ qua nếu không thay đổi
       if (rawValue === originalValue) {
         this._reFormatTarget(target);
         return;
      }  
      
      // Cảnh báo nếu nhập sai định dạng số
      if (isNaN(rawValue) || rawValue === "") {
         this.viewer.inputingNoNumberWarning();
         target.innerText = originalValue; // Phục hồi giá trị cũ
         this._reFormatTarget(target);
         return; 
      }

      const [field, id, varId] = rest;
      const product = this.model.products.data[id];
      const variation = product?.variations?.[varId];

      if (!variation) return;

      variation[field] = parseFloat(rawValue) || 0;
      
      // Tính lại tổng tiền của variation đó
      variation.total = (Number(variation.quantity) || 0) * (Number(variation.price) || 0);
      
      // Update UI dòng đó mà không cần render lại toàn bộ bảng (Partial Update)
      this._updateVariationTotalPreset(id, varId, variation.total);

      // Nếu variation bị đổi là variation dòng đầu tiên, phải tính lại cả bảng Thuế
      const variationIds = Object.keys(product.variations || {});
      if (variationIds[0] == varId) {
         this.model.data = this._vatCalculating();
         try {
            this.viewer.updateVatSummaryPreset(this.preset.viewer.body, this.model.data);
         } catch (error) {
            console.log('not VAT')
         }
      }
      
      this._reFormatTarget(target);
      this.model.products.saveLocal();
   }

   _updateVariationTotalPreset(productId, variationId, newTotal) {
      const locate = `product|total|${productId}|${variationId}`;
      const totalEl = this.preset.viewer.body.querySelector(`[data-locate="${locate}"]`);      
    
      if (totalEl) {
         totalEl.innerText = new Intl.NumberFormat('en-US').format(newTotal);
      }
   }

   _updateNote(target, rest, rawValue, originalValue) {
   
      if (rawValue  === originalValue) return      
      let [field, id, varId] = rest
      let variation = this.model.products.data[id]?.variations[varId]        
      if (! variation) return     
      variation.note = rawValue
      this.model.products.saveLocal();
   
   }

   _updateUnit(target, rest, rawValue, originalValue) {
      if (rawValue  === originalValue) return
      let [field, id, varId] = rest
      this.model.products.data[id].unit = rawValue;
      this.model.products.saveLocal();
   }

   _refreshProductListPreset() {
      const currentTotal = this.model.data.totalNonVat;
      this.model.data = this._vatCalculating();

      // Xóa các dòng sản phẩm cũ
      const proRows = this.preset.viewer.body.querySelectorAll('[data-productid]');
      proRows.forEach(element => element.remove());

      // Vẽ lại bảng mới
      this.preset.viewer._renderProductList(this.model.products.data);
      
      if (this.model.data.totalNonVat !== currentTotal) {
         this.viewer.updateVatSummaryPreset(this.preset.viewer.body, this.model.data);
      }
   }
  
   // =====================================================================
   // 4. CÁC HÀNH ĐỘNG XÓA / XÓA SẠCH DỮ LIỆU
   // =====================================================================

   _deleteSingleProduct(target) {
      const id = target.dataset.id;
      if (id) this.viewer.confirmDeleteProduct(() => this._deleteProducts([id]));      
   }

   _deleteProducts(productIds) {
      const body = this.preset.viewer.body;
  
      productIds.forEach(id => {
          delete this.model.products.data[id];
          const row = body.querySelector(`tr[data-productid="${id}"]`);
          if (row) row.remove(); // Xóa DOM trực tiếp
      });
      this.model.products.saveLocal();
      
      // Cập nhật toán hạng và UI phần Footer VAT
      this.model.data = this._vatCalculating();
      this.viewer.updateVatSummaryPreset(this.preset.viewer.body, this.model.data);
      this.viewer.updateSuccessNotice();
      
      // Phát tín hiệu đồng bộ cho các tab khác
      this.channel.emit('product', { type: this.type, action: 'delete' });
   }

   // =====================================================================
   // 2. TÍNH TOÁN (CALCULATING)
   // =====================================================================

   /**
    * Tính toán chi tiết các khoản thuế VAT và tổng thanh toán
    * @returns {Object} Dữ liệu tổng hợp tiền tệ
    */
   _vatCalculating() {
      const products = this.model.products.data || {};
      const vatRate = +(this.model.vat?.data?.rate || 0);
      
      // Tính tổng tiền hàng dựa trên variation đầu tiên của mỗi sản phẩm
      const totalNonVat = this._calculateGrandTotal(products);
      const totalVat = (totalNonVat * vatRate) / 100;
      const totalPaid = totalNonVat + totalVat;
      
      return {
         rate: vatRate,
         totalNonVat,
         totalVat,
         totalPaid,
         byWord: `${VietnameseNumberReader.read(totalPaid)} đồng./.`
      };
   }

      /**
    * Tổng hợp số tiền từ các sản phẩm được chọn
    * Chỉ lấy giá trị của variation đầu tiên (dòng đầu) để tránh cộng dồn sai
    * @param {Object} data Object chứa danh sách sản phẩm
    */
   _calculateGrandTotal(data) {
      const products = Object.values(data || {});
      
      return products.reduce((grandTotal, product) => {
         if (product.isPrint === false) return grandTotal; // Bỏ qua sản phẩm ẩn
          const variations = product.variations || {};
          const variationIds = Object.keys(variations);
  
          if (variationIds.length > 0) {
              const firstVariation = variations[variationIds[0]];
              return grandTotal + (Number(firstVariation.total) || 0);
          }
          return grandTotal;
      }, 0);
   }
   _vatHidden = (target) => this.preset._vatHidden(target);

    // =====================================================================
   // 4. PANEL ACTIONS (PUBLIC)
   // =====================================================================

   dropProducts(presetBody) {
      const selectedIds = Array.from(presetBody.querySelectorAll('.check-item:checked')).map(cb => cb.dataset.id);
      if (selectedIds.length === 0) {
         this.viewer?.noAnyChoiceNotice();
         return;
      }
      this.viewer?.confirmDeleteProduct(() => this._deleteProducts(selectedIds));
   }

   reloadTemplate(presetBody) {
      try {
         this.preset?.reloadPreset(async () => {
            await this.preset.applyReloadTemplate({
               customer: this.model.customer.data,
               products: this.model.products.data,
               vat: this.model.data // Model.data thường chứa VAT/tổng hợp
            });
            this.panel?.collectLink(this.preset.viewer.body);
            this.panel?.loadInitialStatus();
         });
      } catch (error) {
         console.error("Không thể tải lại mẫu template:", error);
      }
   }

   clearAllData(presetBody) {
      try {
         this.viewer?.confirmClearAllData(() => this._clearAllData());
      } catch (error) {
         console.error('Lỗi quy trình xóa sạch dữ liệu:', error);
      }
   }

   printDocument(presetBody) {
      if (this.viewer?.modal) this.viewer.modal.close({ clear: true });
      window.print();
   }
   
   _clearProducts(body) {
      try {
         this.model.products.data = {};
         this.model.products.saveLocal();
         this.viewer.clearProducts(body);
         this.channel.emit('product', { type: this.type, action: 'clear' });
      } catch (error) {
         console.error('Lỗi khi xóa sạch sản phẩm:', error);
      } 
   }

   _clearCustomer(body) {
      try {
         this.model.customer.data = {};
         this.model.customer.saveLocal(); 
         this.viewer.clearCustomer(body);
         this.channel.emit('customer', { type: this.type,  action: 'delete' });
      } catch (error) {
         console.error('Lỗi khi xóa thông tin khách hàng:', error);
      }
   }

   _clearAllData() {
      this._clearCustomer(this.preset.viewer.body);
      this._clearProducts(this.preset.viewer.body);
      
      // Reset VAT
      this.model.data = this._vatCalculating();
      this.viewer.updateVatSummaryPreset(this.preset.viewer.body, this.model.data);
      this.channel.emit('customer', { type: this.type,  action: 'delete' });
      this.channel.emit('product', { type: this.type,  action: 'clear' });

   }
}
