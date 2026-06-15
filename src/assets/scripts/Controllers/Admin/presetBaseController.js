import TextHelper from '../../Vendor/helpers/textHelper';
import DataChecker from '../../Vendor/helpers/dataChecker'

export default class PresetBaseController {
   constructor() {
      this.model = null;
      this.viewer = null
   }

   async init(data) {     
      
      if (DataChecker.isEmpty(this.model.data)) {
         await this.model.init();      
      }
     
      // 1. Khởi tạo template thô
      this.viewer.init(this.model.data.template || "");
      
      // 2. Gán ID cho các ô editable nếu là lần đầu xử lý
      if (! this.model.data.isProcessed) {
         this._processModelData();
      }
      
      // 3. Render dữ liệu sản phẩm/khách hàng vào template
      this.viewer.render(data, this.model.data.modifier.vatEnable);

      // 4. CỰC KỲ QUAN TRỌNG: Ghi đè các thay đổi (modifier) sau khi render
      this._applyUserModifiers();

      // 5. Bắt đầu theo dõi các thay đổi mới
      this.initEditableTracking();
   }
   
   _processModelData(vatOrgin) {
      // tạo vat enable
      if (! this.model.data?.modifier) this.model.data.modifier = {vatEnable: vatOrgin}

      // thêm id cho các editable
      const editElements = this.viewer.body.querySelectorAll('.editable');      
      editElements.forEach(el => {
         el.setAttribute('contenteditable', 'true');
         if (!el.id) el.id = `ed_${TextHelper.randomString(6)}`; 
      });

      this.model.data.isProcessed = true;
      this.model.data.template = this.viewer.body.innerHTML;

      this.model.saveLocal();
   }

   _applyUserModifiers() {
      const modifiers = this.model.data.modifier || {};
      Object.keys(modifiers).forEach(id => {
         const el = this.viewer.body.querySelector(`#${id}`);
         if (el) {
            const val = modifiers[id];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = val;
            else el.innerText = val;
         }
      });
   }
   initEditableTracking() {
    
      // Biến tạm để lưu giá trị trước khi sửa
      let originalValue = "";
  
      // 1. Khi người dùng nhấn vào (Focus): Lưu lại giá trị ban đầu để so sánh sau này
      this.viewer.body.addEventListener('focusin', (event) => {
          const target = event.target;
          if (target.classList.contains('editable') && target.id) {
              originalValue = this._getEditableValue(target);
          }
      });
  
      // 2. Khi người dùng thoát ra (Blur): So sánh và tiến hành lưu nếu có thay đổi
      this.viewer.body.addEventListener('focusout', (event) => {
          const target = event.target;
          
          if (target.classList.contains('editable') && target.id) {
              const newValue = this._getEditableValue(target);
  
              // Kiểm tra: Nếu giá trị mới khác giá trị ban đầu thì mới xử lý lưu
              if (newValue !== originalValue) {
                  const elementId = target.id;
                  
                   // thay đổi theo dõi trên template
                  if (!this.model.data.modifier) {
                     this.model.data.modifier = {};
                  }
                  // Lưu vào model
                  this.model.data.modifier[elementId] = newValue;
                  this.model.saveLocal();
  
              }
          }
      }); 
  }
  
  /**
   * Helper lấy giá trị linh hoạt từ Input/Textarea hoặc thẻ Div/Span thông thường
   */
  _getEditableValue(el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          return el.value.trim();
      }
      return el.innerText.trim();
   }

   reloadPreset( action) {
      this.viewer.confirmReloadTemplate(() => action())
   }

   async applyReloadTemplate(data) {
      try {
         let vatEnable =  this.model.data.modifier.vatEnable
         await this.model.get()
          // 1. Khởi tạo template thô
         this.viewer.body.innerHTML = this.model.data.template || "";
         
         this._processModelData(vatEnable);
     
         // 3. Render dữ liệu sản phẩm/khách hàng vào template
         this.viewer.render(data, vatEnable);
         
      } catch (error) {
         this.viewer.close({clear: true})
      }
   }

   _vatHidden(target) {
      let current = this.model.data.modifier.vatEnable   
      this.model.data.modifier.vatEnable = ! current
      this.model.saveLocal()
      this.viewer._setVatHidden(target, ! current)
   }

}
