import Viewer from '../viewer';
import FormFactory from '../../Vendor/helpers/formFactory';
import DataChecker from '../../Vendor/helpers/dataChecker'

export default class PresetViewer extends Viewer {
   constructor() {
      super()
       this.messages = {
         ...this.messages,
         reloadTemplate: 'Do you want to reload the template from the server? All interface customizations will be reset to default.'
      }
   }

   // tạo body cho trang admin
   init(template) {
      this.body = this.create(template);
   }

   /**
    * Khởi tạo khung chứa div ban đầu[cite: 22]
    */
   create(template) {
      return FormFactory.create({
         tag: 'div',
         className: 'quotation__content page',
         innerHTML: template // Sẽ được lấp đầy sau khi render
      });
   }

    /**
    * Render dữ liệu vào template và hiển thị ra màn hình
    * @param {Object} data - Object chứa { customer, products }
    */
    render(data, vatEnable) {   

      // 1. Render dữ liệu Customer (Sử dụng placeholder {{customer.name}})
      this._renderCustomer(data.customer)

      // 2. Render dữ liệu Products (Sử dụng block {{#products}}...{{/products}})
      this._renderProductList(data.products || {} );

      // 3. Render dữ liệu Vat
      this._renderVat(data.vat)

      // 4. cập nhật trang thái của vat
      if (! vatEnable) this._setVatHidden(undefined)
   }

   _renderCustomer( customer) {
      if (! this.body || ! customer) return      
      if (customer) {
         Object.keys(customer).forEach(key => {
            if (key !== 'id') {
               let element = this.body.querySelector(`[data-locate="customer|${key}"]`)
               if (element) element.innerText = customer[key] || '';
            }
         });
      }
     
   }
    /**
    * Helper xử lý lặp danh sách sản phẩm  
    * Mở rộng lớp QuotationTemplateViewer để xử lý quy cách và variations
   */
    _renderProductList(products) {
      if (! this.body ) return
      let html = this.body.innerHTML

      // Regex mới tìm thẻ comment <!--#products--> và <!--/products-->
      const regex = /<!--#products([\s\S]*?)\/products-->/;
      const match = html.match(regex);
      
      if (!match) {
         console.warn("Template Error: Placeholder {{#products}} not found.");
         return html;
      }

      const itemTemplate = match[1].trim();

      const regexField = /\{\{(.+?)\}\}/g; 
      let fieldInPresets = [...itemTemplate.matchAll(regexField)]
      if (fieldInPresets.length === 0) return html;
      
      // chỉ chọn lại 2 giá trị đầu mỗi mảng
      fieldInPresets = this._revertField(fieldInPresets)

      const trProducts = Object.values(products).map((product, index) => {
         const finalProductHTML = fieldInPresets.reduce((currentHTML, { rep, fun }) => {
            if (typeof this[`_${fun}`] === 'function') {
               
               return this[`_${fun}`](product, rep, currentHTML);
            }
            return currentHTML;
         }, itemTemplate);

         let className = product.isPrint === false ? 'opacity-50 screen-only' : '';
            
         let aProduct = FormFactory.tagBuilder.create('tr')
                        .setAttributes({
                           className: `table__row product-row ${className}`,
                           "data-productid": `${product.id}`
                        })
                        .html(finalProductHTML).build()
         return aProduct;
      })

      // 🛠️ ĐOẠN CẬP NHẬT: Xử lý vị trí chèn linh hoạt
      // 1. Tìm tất cả các dòng sản phẩm hiện đang có trong bảng
      const existingRows = this.body.querySelectorAll('.product-row');
      
      if (existingRows.length > 0) {
         // Nếu đã có sẵn dòng sản phẩm, lấy dòng cuối cùng (vị trí length - 1)
         const lastRow = existingRows[existingRows.length - 1];
         // Chèn nối đuôi vào ngay SAU dòng cuối cùng đó
         lastRow.after(...trProducts);
      } else {
         // CẬP NHẬT TẠI ĐÂY: Nếu chưa có dòng sản phẩm nào (lần đầu render)
         // Chèn thẳng vào ĐẦU của thẻ <tbody>
        
         let tbody = this.body.querySelector('#products__list');
         
         if (tbody) {
            tbody.prepend(...trProducts);
         }
      } 
   }

   _renderVat(vat) {
      //rate: thuế VAT
      if (! this.body || DataChecker.isEmpty(vat)) return;
     
      Object.keys(vat).forEach(key=> {
         let element = `[data-field="${key}"]`
         let fieldVat = this.body.querySelector(element)
         if (fieldVat) {
            let value = key !== 'byWord'? this._formatNumber(vat[key]): vat[key];
            fieldVat.innerText = value;
         }
      })   
     
   }
   
   _setVatHidden(target) {   
      let inTarget = target ||  this.body.querySelector('#vat-toggle');
      this._setOpacity(inTarget)
      let trVats = this.body.querySelectorAll('.vat-tr')
      trVats.forEach(el =>['opacity-50','screen-only'].forEach(cls => el.classList.toggle(cls)));
   }
   
   _setOpacity(target) { 
      let icon = target.querySelector('span')
      icon.classList.toggle('eye-open')
   }

   /**
   * Tạo chuỗi quy cách từ thuộc tính sản phẩm và biến thể[cite: 15]
   */
   _formatSpecs(product) {
     // 1. Tạo nhóm tên sản phẩm đầu tiên (có dấu *)[cite: 2]
   //   product, rep, productHTML
      let html = `<span class="spec__group semi-bold">*&nbsp;
                  <span class="editable" contenteditable="true" data-locate=product|name|${product.id}>${product.name || ''}</span></span>`;
      
      // 2. Lấy danh sách thuộc tính (ưu tiên từ variation)
      const attrs = product.attributes || {};
      if (! DataChecker.isEmpty(attrs) ) {
         // 3. Duyệt qua từng thuộc tính để tạo các cụm span
         const attrHtml = Object.values(attrs).map(attr => {
            // Chuyển tên thuộc tính thành slug class (ví dụ: "Kích thước" -> "pa_kich-thuoc")
          
            const label = attr.name ? `<span class="semi-bold">${attr.name}: </span>` : '';
            const value = attr.option || attr.value || '';

            const locate = `product|attributes|${attr.slug}|${product.id}`;

            return `<span class="spec__group">${label}<span class="editable" contenteditable="true" 
                  data-locate=${locate}>${value}</span></span>`;
         }).join('');
         
         html += attrHtml;
      }

      return html;
   }

   /**
    * Định dạng số có dấu phẩy (,) ngăn cách hàng nghìn
    */
   _formatNumber(num) {
      if (isNaN(num)) return '0';
      // Sử dụng locale 'en-US' để mặc định dùng dấu phẩy cho hàng nghìn
      return new Intl.NumberFormat('en-US').format(num);
   }
   _variation(product, field, edit) {
      const numfields = ['quantity', 'price', 'total']
      if (! product || !product.variations ) return '';
      let variations = product.variations || {};
      let innerHTML = Object.values(variations).map((variation) => {
         let outValue = numfields.includes(field)? this._formatNumber(variation[field]): variation[field] || '';
         let dataField = `product|${field}|${product.id}|${variation.id}`
         return `<span class="spec__group${edit? ' editable':''}" 
                  ${edit? "contenteditable=true": ''} 
                  data-locate=${dataField}>${outValue}</span>`;

      }).join('')
      return innerHTML;
   }

   confirmReloadTemplate(action) {
      this.yesNoQuestionModal({
         message: this.messages.reloadTemplate,
         title: 'Reload template confirm!', 
         yes : async () => {
            await action()
            this.modal.close({clear:true})
         },
      })
   }  

   _revertField(fields) {
      return fields.map(field=> {
         return {
            rep: field[0],
            fun: field[1]
         }
      })
   }
   _index(product, rep, productHTML) {
        // <button class="index-button btn-delete-single" data-action="_deleteSingleProduct" data-id="${product.id}">
            //    <span class="x-x">&times;</span>
      let className = product.isPrint === false ?  'eye-open' : '';
      let tempIndex = `
         <div class="screen-only">
            <input type="checkbox" class="check-item" data-id="${product.id}">
            <span class="index-button eye-toggle-btn" data-id="${product.id}" data-action="_hiddenProduct" title="Ẩn hiện sản phẩm khi in hóa đơn">
               <span class="dashicons dashicons-hidden ${className}"></span> 
            </span>          
         </div>
         <span class="print-only stt-render"></span>
         `;
      return productHTML.replace(rep, tempIndex);
   }
      
   _specs(product, rep, productHTML) {
      let value = this._formatSpecs(product)
      return productHTML.replace(rep,value)
   }

   _unit(product, rep, productHTML) {
      let value = product?.unit || 'pcs'
      let html = `<span class="editable" contenteditable="true" data-locate="product|unit|${product.id}">${value}</span>`
      return productHTML.replace(rep, html)
   }

   _quantity(product, rep, productHTML) {
      return productHTML.replace(rep, this._variation(product, 'quantity', true))
      
   }
   _price(product, rep, productHTML) {
      return productHTML.replace(rep, this._variation(product, 'price', true))
       
   }
   _total(product, rep, productHTML) {
      return productHTML.replace(rep, this._variation(product, 'total', false));
   }

   _note(product, rep, productHTML) {
      return productHTML.replace(rep, this._variation(product,'note', true));
   }

}

