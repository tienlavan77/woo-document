import FormFactory from "../../Vendor/helpers/formFactory";

/**
 * PanelViewer
 * Chịu trách nhiệm xây dựng giao diện bảng điều khiển (Toggle switches & Buttons)
 */
export default class PanelViewer {
   constructor(options = {}) {
      this.controls = Array.isArray(options.controls) && options.controls.length
         ? options.controls
         : ['stamp', 'signature'];
      this.showActions = options.showActions !== false;

      // Khởi tạo các input trước để Controller có thể truy cập trực tiếp
      this.controls.forEach((name) => {
         this[name] = this._createCheckbox(name);
      });
      
      // Các nút chức năng thêm vào sau
      if (this.showActions) {
         this.btnClear = this._createButton('Clear data', 'clear-data','clearData');
         this.btnPrint = this._createButton('Print document', 'btn-print-doc', 'printDocument');
         this.reloadTemplate = this._createButton('Reload template', 'btn-reload-template', 'reloadTemplate')
         this.deleteProduct = this._createButton('Delete product', 'btn-delete-products', 'dropProducts')
         this.clear = this._createButton('Clear all', 'btn-clear', 'clearAllData')
      }
 
      this.body = this.build();
   }

   /**
    * Xây dựng cấu trúc DOM tổng thể của Panel
    */
   build() {
      return FormFactory.create({
         tag: 'div',
         className: 'document_panel',
         children: [
            // Cụm Toggle Switches
            ...this.controls.map((name) => this._createPanelItem(this._getControlLabel(name), this._wrapToggle(this[name]))),
            
            // // Cụm Action Buttons (Clear & Print)
            ...(this.showActions ? [FormFactory.create({
               tag: 'div',
               className: '__item __actions',
               children: [this.deleteProduct, this.clear, this.reloadTemplate, this.btnPrint]
            })] : [])
         ]
      });
   }

   _getControlLabel(name) {
      return {
         stamp: "Hidden/show company's Stamp",
         signature: 'Hidden/show saler staff signature',
         reference: 'Hidden/show print reference',
      }[name] || `Hidden/show ${name}`;
   }

   /**
    * Hàm tạo nhanh một Checkbox input
    * @private
    */
   _createCheckbox(name) {
      return FormFactory.tagBuilder.create('input')
         .setAttributes({
            type: 'checkbox',
            name: name,
            id: name
         })
         .build();
   }

   /**
    * Hàm tạo nhanh một Button
    * @private
    */
   _createButton(text, className, action) {
      return FormFactory.tagBuilder.create('button')
         .setAttributes({ 
            type: 'button', 
            className: `panel-btn ${className}`,
            'data-action': action 
         })
         .html(text)
         .build();
   }

   /**
    * Tạo cấu trúc một hàng (item) trong Panel
    * @private
    */
   _createPanelItem(labelText, controlElement) {
      return FormFactory.create({
         tag: 'div',
         className: '__item',
         children: [
            FormFactory.tagBuilder.create('p')
               .setAttributes({ className: '__label' })
               .html(labelText)
               .build(),
            controlElement
         ]
      });
   }

   /**
    * Bọc Input checkbox vào giao diện Toggle Switch của WordPress (hoặc custom)
    * @private
    */
   _wrapToggle(inputElement) {
      return FormFactory.create({
         tag: 'label',
         className: 'wp-toggle-clean',
         children: [
            inputElement,
            FormFactory.tagBuilder.create('span')
               .setAttributes({ className: 'switch' })
               .build()
         ]
      });
   }
}
