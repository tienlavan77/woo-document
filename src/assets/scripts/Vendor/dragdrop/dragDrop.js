import TagBuilder from '../helpers/tagBuilder';
import DOMValidator from '../helpers/domValidator';

/**
 * Class xử lý tính năng Kéo & Thả (Drag and Drop) chuẩn OOP
 */
export default class DragDrop {
   constructor() {
      /**
       * Lưu trữ dữ liệu cấu trúc các vùng DOM nội bộ và mảng kết quả
       * @type {Object|null}
       */
      this.data = null;

      /**
       * Lưu trữ phần tử HTML hiện đang được kéo 
       * @type {HTMLElement|null}
       */
      this.dragging = null;
   }

   /**
    * Khởi tạo vùng làm việc Kéo & Thả
    * @param {Object} options
    * @param {string|HTMLElement} options.id - ID của container (chuỗi) hoặc chính phần tử DOM
    * @param {Object} [options.config] - Cấu hình tùy chỉnh ban đầu (ví dụ: thay đổi message)
    * @returns {DragDrop}
    */
   init({ id, config }) {
      let mainElement;

      // 1. Kiểm tra nếu 'id' đã là một DOM element
      if (DOMValidator.isElement(id)) {
         mainElement = id;
      } else if (typeof id === 'string' && id.length > 0) {
         // 2. Nếu 'id' là một chuỗi, tìm kiếm DOM element bằng querySelector
         mainElement = document.querySelector(`#${id}`);
      } else {
         console.error("DragDrop.init: Invalid 'id' parameter. Must be a string ID or an HTMLElement.");
         return this; // Thoát sớm nếu id không hợp lệ
      }
      
      // 3. Nếu không tìm thấy element, tạo mới (chỉ khi 'id' là chuỗi)
      if (!mainElement) {
         if (typeof id === 'string' && id.length > 0) {
             mainElement = this._createNewDragDrop(id);
         } else {
             console.error("DragDrop.init: Failed to find or create main element with the provided ID.");
             return this;
         }
      }

      // 2. Thu thập và định nghĩa các phân vùng DOM chức năng
      this.data = this._getElementOfDropZone(mainElement);

      // 3. Đăng ký cấu hình động và gắn các sự kiện lắng nghe chuột (Listeners)
      this._collectDragDrop(config);

      return this;
   }

   /**
    * Template HTML chuẩn cho khung Drag & Drop
    * @returns {string}
    */
   getDragAndDropTemplate() {
      return `
         <ul class="drag__items order__items drop-container"></ul>
         <div class="drop-zone drop-container">
            <div class="drop-zone__wrapper">
               <div class="drop-zone__message message">Drag & drop here</div>
            </div>    
            <ul class="drop-zone__items"></ul>   
         </div>
      `;
   }

   /**
    * Tạo mới thẻ bao ngoài Drag & Drop bằng công cụ buildTag helper
    * @private
    */
   _createNewDragDrop(id) {
      return TagBuilder
					.create("div")
					.setAttributes({
						className: "drag parent",
						id: id})
					.html(this.getDragAndDropTemplate())
					.build();											
   }

   /**
    * Gom nhóm các phần tử DOM quan trọng thành cấu trúc dữ liệu nội bộ
    * @private
    */
   _getElementOfDropZone(mainElement) {
      return {
         main: mainElement,
         dragZone: mainElement.querySelector(".drag__items"),
         dropZone: mainElement.querySelector(".drop-zone"),
         dropList: mainElement.querySelector(".drop-zone__items"),
         message: mainElement.querySelector(".message"),
         result: [],
      };
   }

   /**
    * Kích hoạt thuộc tính từ config và thiết lập toàn bộ Event Listeners
    * @private
    */
   _collectDragDrop(config) {
      // Gọi động các phương thức cấu hình nếu được truyền vào (Ví dụ: thay đổi message)
      if (config) {
         Object.entries(config).forEach(([method, parameter]) => {
            if (typeof this[method] === 'function') {
               // Chuyển đổi cách gọi linh hoạt: truyền trực tiếp tham số thay vì bọc quá nhiều tầng Object
               this[method](parameter); 
            }
         });
      }

      // Quét tìm tất cả các mục có thể kéo trong vùng dragZone
      if (this.data.dragZone) {
         const draggables = [...this.data.dragZone.querySelectorAll(".drag__item")];
         this.setDragItems(draggables);
      }

      // Đăng ký các sự kiện Drag-Drop cơ bản cho các vùng chức năng
      ["dropZone", "dragZone"].forEach((zoneKey) => {
         const zoneElement = this.data[zoneKey];
         if (zoneElement) {
            zoneElement.addEventListener("dragover", (event) => {
               this.preventDefault(event);
               this.highlight(event);
            }, false);

            zoneElement.addEventListener("dragleave", (event) => {
               this.preventDefault(event);
               this.unHighlight(event);
            }, false);

            zoneElement.addEventListener("drop", (event) => {
               this.preventDefault(event);
               this.unHighlight(event);
               this.drop(event);
            }, false);
         }
      });
   }

   /**
    * Kích hoạt thuộc tính chuẩn draggable cho danh sách các item
    * @param {HTMLElement[]} items - Mảng các phần tử HTML cần cho phép kéo đi
    */
   setDragItems(items) {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
         item.draggable = true;
         // Gắn sự kiện dragstart và dragend (Dùng Arrow function giữ nguyên context "this" của Class)
         item.addEventListener("dragstart", (event) => this.dragStart(event, item), false);
         item.addEventListener("dragend", (event) => this.dragEnd(event, item), false);
      });
   }

   /** Event: Bắt đầu kéo phần tử */
   dragStart(event, item) {
      this.dragging = item;
      item.classList.add("dragging");
   }

   /** Event: Kết thúc kéo phần tử */
   dragEnd(event, item) {
      item.classList.remove("dragging");
   }

   /** Ngăn chặn các hành vi mặc định không mong muốn của trình duyệt */
   preventDefault(event) {
      event.preventDefault();
      event.stopPropagation();
   }

   /** Thêm hiệu ứng sáng (active) khi kéo item đi ngang qua vùng nhận */
   highlight(event) {
      const target = event.target.closest(".drop-container");
      if (target && !target.classList.contains("active")) {
         target.classList.add("active");
      }
   }

   /** Xóa bỏ hiệu ứng sáng (active) khi kéo item rời đi */
   unHighlight(event) {
      const target = event.target.closest(".drop-container");
      if (target && target.classList.contains("active")) {
         target.classList.remove("active");
      }
   }

   /** Event: Thả phần tử chuột vào phân vùng đích */
   drop(event) {
      if (!this.dragging) return;

      const target = event.target.closest(".drop-container");
      if (!target) return;

      const isDropZone = target.classList.contains("drop-zone");

      if (isDropZone) {
         this.data.dropList.append(this.dragging);
      } else {
         target.append(this.dragging);
      }

      // Tính toán kết quả mảng ID dựa trên vùng được thả
      this._calculateResults(isDropZone);
      
      // Đưa trạng thái kéo về trống rỗng
      this.dragging = null;
   }

   /**
    * Trích xuất ID và cập nhật vào mảng kết quả dữ liệu
    * @private
    */
   _calculateResults(isDropZone) {
      const oId = parseInt(this.dragging.innerHTML.replace("#", ""));
      if (isNaN(oId)) return;

      if (isDropZone) {
         // Nếu thả vào drop-zone, đẩy ID vào mảng kết quả (chặn đẩy trùng)
         if (!this.data.result.includes(oId)) {
            this.data.result.push(oId);
         }
      } else {
         // Nếu kéo trả ngược ra ngoài, tìm vị trí ID hiện tại để xóa đi
         const findIndex = this.data.result.indexOf(oId);
         if (findIndex !== -1) {
            this.data.result.splice(findIndex, 1);
         }
      }
   }

   /**
    * Làm mới (Reset) toàn bộ dữ liệu giao diện và mảng kết quả
    */
   resetDragDrop() {
      if (!this.data) return;
      this.data.dragZone.innerHTML = "";
      this.data.dropList.innerHTML = "";
      this.data.result = [];
      this.dragging = null;
   }

   /**
    * Thay đổi chuỗi văn bản thông báo hiển thị trên giao diện
    * @param {string} text - Nội dung chữ muốn hiển thị
    */
   message(text) {
      if (this.data && this.data.message) {
         this.data.message.innerHTML = text;
      }
   }
}
