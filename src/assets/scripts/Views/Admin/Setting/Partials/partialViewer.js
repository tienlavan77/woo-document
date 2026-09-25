import Viewer from '../../../viewer';
import FormFactory from '../../../../Vendor/helpers/formFactory';
import DataChecker from '../../../../Vendor/helpers/dataChecker';

/**
 * Lớp quản lý giao diện thông tin công ty.
 * Tự động hóa việc tạo form và quản lý các element bên trong.
 */
export default class PartialViewer extends Viewer {
   constructor() {
      super()
      // this.notice = notice;
      this.title = '';
      this.elements = []; // Lưu trữ các input/button để Controller sử dụng 
      this.formFactory = FormFactory;  
      
   }
   // static formFactory = FormFactory;
  
 
   /**
    * Helper: Tạo nhanh một hàng trong form (gồm label và input wrapper)
    * @param {string} labelText - Văn bản hiển thị trên label
    * @param {HTMLElement|Array} content - Input hoặc danh sách các thành phần bên trong
    * @param {string} extraClass - Class bổ sung nếu cần
    */
   _createRow(labelText, content, extraClass = '') {      
      return this.formFactory.create({
         tag: 'div',
         className: `frame__item ${extraClass}`,
         children: [
            this.formFactory.tagBuilder.create('label')
               .setAttributes({className: 'item__label'})               
               .append([
                  this.formFactory.tagBuilder.create('div')
                     .setAttributes({className: '__label'})
                     .html(labelText)
                     .build(),
                  ...content
               ])
               .build(),          
         ]       
      });
   }

   /**
    * Helper tạo nhanh Input element bằng TagBuilder
    */
   _createInput({type, name, placeholder, className}) {
      return  this.formFactory.tagBuilder.create('input')
         .setAttributes({ type, name, placeholder, id: name, className })         
         .build();
   }

   /**
    * Tạo phần Header của form
    */
   _createHeader() {
      const coverBtn =  this.formFactory.create({
         tag: 'div',
         className: '__handle',
         children:[this.button]
      })
      const children = [
         { tag: 'h3', attributes: { className: '__title' }, innerHTML: this.title },
         coverBtn
      ].filter(Boolean);

      return  this.formFactory.create({
         tag: 'div',
         className: 'frame__header',
         children
      });
      
   }

   /**
    * Xử lý layout đặc biệt cho phần hiển thị lựa chọn hình ảnh 
    */
   _createImageSection(item) {
      // tự động trả lại 
      let link = this._createInput({...item.element});
      let choice =  this.formFactory.tagBuilder.create('button')
                     .html('Choice Image')
                     .setAttributes({type: 'button', className:'btn __choice'})
                     .build();
      let view =  this.formFactory.tagBuilder.create('button') 
                     .html('View Image')
                     .setAttributes({type: 'button', className:'btn __view'})
                     .build();
                     
      let cover = this._createRow(item.label, [
         this.formFactory.tagBuilder.create('div')
            .setAttributes({className: 'item__view'})
            .append([link, choice, view])
            .build()
         ], 'image-box');     
     
      return {
         cover,
         controller: {
            link, // input link hình ảnh được chọn
            choice, // button chọn hình ảnh từ image box của wp
            view// button bật model hiển thị modal 
         }
      }
   }
   
   _createNomalSection(item) {      
      let cntr = this._createInput({...item.element})
      let cover = this._createRow(item.label, [
         this.formFactory.tagBuilder.create('div')
            .setAttributes({className: 'item__view'})
            .append(cntr)
            .build()
      ]);
      return {
         cover,
         controller: cntr
      }
   }
   _createBody() {
      let children = DataChecker.isEmpty(this.elements) ? [] : Object.keys(this.elements).map(key => {
        
         let frame =  this.elements[key].typeof === 'imagebox'? 
            this._createImageSection(this.elements[key]): this._createNomalSection(this.elements[key]) ;

         this.elements[key].element = frame.controller;
         
         return frame.cover;
      });

      let body  =  this.formFactory.create({
         tag: 'div',
         className: 'frame__content',
         children 
      })
      return body;
   }
   /** 0
    * Khởi tạo và lắp ghép toàn bộ giao diện
    */
   render() {
    
      // 1. Tạo các elements tương tác chính
      const header = this._createHeader();
      const body = this._createBody();
   
      // 2. Xây dựng cấu trúc layout chính
      return  this.formFactory.create({
         tag: 'div',
         className: 'frame__wrapper',
         children: [
            // Header: Tiêu đề và nút Save
            header,
            body          
         ]
      });
    
   }

   init() {
      this.button =  this.formFactory.domValidator.isElement(this.button) ? this.button : 
         this.formFactory.tagBuilder.create(this.button.tag)
            .setAttributes(this.button.attributes)
            .html(this.button.innerHTML)
            .build();
      
      this.main = this.render(); // Lưu trữ root element của partial này
   }
   
}
