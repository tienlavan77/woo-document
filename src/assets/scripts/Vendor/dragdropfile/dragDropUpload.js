import TagBuilder from '../helpers/tagBuilder';
import DragDrop from '../dragdrop/dragDrop';
import { FILE_PDF_ICON, AI_FILE_ICON, DOC_FILE_ICON } from "./filesSVGIcon.js";

/**
 * Bản đồ ánh xạ Mime-type sang mã SVG Icon tương ứng
 * @constant {Object<string, string>}
 */
const FILE_ICONS = {
   "application/msword": DOC_FILE_ICON,
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DOC_FILE_ICON, // Hỗ trợ thêm file .docx
   "application/pdf": FILE_PDF_ICON,
   "application/postscript": AI_FILE_ICON,
   "DEFAULT": "📄" // Fallback icon dành cho định dạng tệp lạ
};

/**
 * Class xử lý Tải lên tệp tin (File Upload) kết hợp Kéo & Thả
 * Kế thừa toàn bộ phân vùng xử lý sự kiện Drag-Drop từ lớp cha DragDrop
 */
export default class UploadFiles extends DragDrop {
   
   constructor() {
      super(); // Khởi tạo các thuộc tính `data` và `dragging` từ Class cha
   }

   /**
    * Ghi đè giao diện cấu trúc HTML Template dành riêng cho phân hệ Upload file
    * @returns {string}
    */
   getDragAndDropTemplate() {
      return `
         <div class="drop-zone drop-container">
            <ul class="drop-zone__items"></ul>   
            <div class="drop-zone__wrapper">
               <label class="drag__label label">
                  <span class="label__title title">Choice files</span>
                  <input type="file" class="drag__file file"> 
               </label>
               <div class="drop-zone__message message">Drag & drop here</div>
            </div>    
         </div>
      `;
   }

   /**
    * Ghi đè phương thức quét DOM: Bổ sung các thẻ Input, Label đặc thù của luồng xử lý File
    * @param {HTMLElement} mainElement - Thẻ container tổng bao bọc
    * @returns {Object} Cấu trúc State quản lý DOM nâng cao
    * @protected
    */
   _getElementOfDropZone(mainElement) {
      // Lấy các phân vùng DOM cơ bản từ Class cha (dropZone, dropList, message...)
      const baseElements = super._getElementOfDropZone(mainElement);

      // Tích hợp thêm các thẻ giao diện chuyên dụng cho Upload
      const advancedElements = {
         ...baseElements,
         dragArea: mainElement.querySelector(".drop-zone__wrapper"),
         label: mainElement.querySelector(".drag__label"),
         title: mainElement.querySelector(".title"),
         input: mainElement.querySelector("input[type=file]")
      };

      // Đăng ký sự kiện thay đổi file (chọn từ cửa sổ Explorer)
      if (advancedElements.input) {
         advancedElements.input.addEventListener("change", (e) => this.fileOnChange(e));
      }

      return advancedElements;
   }

   /**
    * Ghi đè logic gom nhóm: Lắng nghe cấu hình bổ sung và gắn kết bộ lắng nghe sự kiện
    * @param {Object} config - Bộ cấu hình truyền vào từ hàm init
    * @protected
    */
   _collectDragDrop(config) {
      super._collectDragDrop(config);
   }
 
   /**
    * Ghi đè sự kiện Thả chuột (Drop tệp tin từ màn hình máy tính vào trình duyệt)
    * @param {DragEvent} event 
    */
   drop(event) {
      const dataTransfer = event.dataTransfer;
      if (dataTransfer && dataTransfer.files.length > 0) {
         this.processIncomingFiles(dataTransfer.files);
      }
   }

   /**
    * Xử lý sự kiện khi người dùng click chọn file thủ công từ nút bấm
    * @param {Event} event 
    */
   fileOnChange(event) {
      const files = [...event.target.files];
      if (files.length === 0) return;

      if (!this.data.input.multiple) {
         this.handleSingleChoiceFile(files);
      } else {
         this.handleMultiChoiceFile(files);
      }
      
      // Reset giá trị input để có thể chọn lại chính file đó ở lần tiếp theo
      this.data.input.value = null;
   }

   /**
    * Nghiệp vụ xử lý tải lên 1 tệp tin duy nhất (Single Mode)
    * @param {File[]} files - Danh sách mảng chứa file
    */
   handleSingleChoiceFile(files) {
      const file = files[0];
      this.toggleControlWidgets(false); // Ẩn nút chọn và dòng tin nhắn mặc định

      const iconFileType = this.createIconFollowFileType(file, false);
      this.data.dragArea.append(iconFileType);
      this.data.result = [file];
   }

   /**
    * Nghiệp vụ xử lý tải lên nhiều tệp tin cùng lúc (Multiple Mode)
    * @param {File[]} files - Mảng danh sách file mới đưa vào
    */
   handleMultiChoiceFile(files) {
      const filteredFiles = this._filterValidFiles(files);

      // Nếu đây là lượt thêm file đầu tiên
      if (this.data.result.length === 0) {
         if (!this.data.dropList.querySelector(".drag__label")) {
            this.changeButtonToPlusMode();
            this.data.dropList.append(this.data.label);
         }
      }

      // Tiến hành chèn các file hợp lệ vào giao diện danh sách kết quả
      if (filteredFiles.length > 0) {
         this.data.result = [...this.data.result, ...filteredFiles];
         const listFileDOMs = this.createListFileElements(filteredFiles);
         
         // Chèn danh sách file mới đứng trước nút dấu cộng (+)
         listFileDOMs.forEach((fileDOM) => {
            this.data.dropList.insertBefore(fileDOM, this.data.label);
         });
      }
   }

   /**
    * Lọc loại bỏ tệp trùng lặp và tệp không đúng định dạng đuôi mở rộng yêu cầu
    * @param {File[]} incomingFiles - Mảng file đầu vào cần kiểm tra
    * @returns {File[]} Mảng các file sạch, đủ điều kiện đưa vào hệ thống
    * @private
    */
   _filterValidFiles(incomingFiles) {
      const acceptExtensions = this.data.input.accept;

      return incomingFiles.filter((file) => {
         // Kiểm tra trùng tên (Sử dụng toán tử .some để tối ưu hiệu năng dừng sớm)
         const isDuplicate = this.data.result.some((srcFile) => srcFile.name === file.name);
         
         // Kiểm tra định dạng đuôi mở rộng cho phép
         let isValidExtension = true;
         if (acceptExtensions) {
            const fileExt = `.${file.name.split(".").pop()}`.toLowerCase();
            isValidExtension = acceptExtensions.toLowerCase().includes(fileExt);
         }

         return !isDuplicate && isValidExtension;
      });
   }

   /**
    * Đóng/Mở (Ẩn/Hiện) nút chọn file và dòng tin nhắn hướng dẫn kéo thả
    * @param {boolean} showState - true: hiện ra, false: ẩn đi
    */
   toggleControlWidgets(showState) {
      const action = showState ? "remove" : "add";
      ["label", "message"].forEach((item) => {
         if (this.data[item]) this.data[item].classList[action]("hide");
      });
   }

   /** Chuyển đổi nút chọn file sang dạng ô vuông dấu cộng nhỏ gọn (+) */
   changeButtonToPlusMode() {
      if (!this.data) return;
      this.data.message.classList.add("hide");
      this.data.label.classList.add("plus");
      this.data.title.oldTitle = this.data.title.innerHTML;
      this.data.title.innerHTML = "+";
   }

   /** Trả nút bấm ô vuông dấu cộng về dạng thanh tiêu đề dài nguyên bản */
   changeButtonToOriginTitle() {
      if (!this.data) return;
      this.data.message.classList.remove("hide");
      this.data.label.classList.remove("plus");
      if (this.data.input.multiple && this.data.title.oldTitle) {
         this.data.title.innerHTML = this.data.title.oldTitle;
      }
   }

   /**
    * Tạo cấu trúc thẻ Li bọc quanh khối Icon hiển thị tệp tin
    * @param {File[]} files 
    * @returns {HTMLElement[]}
    */
   createListFileElements(files) {
      return files.map((file) =>
         TagBuilder.create('li').setAttributes({
            tag: "li",
            className: "file__item",
            append: [this.createIconFollowFileType(file, true)],
         })
      );
   }

   /**
    * Khởi tạo giao diện chi tiết của một Node khối tệp (Gồm Icon, Tên file, Nút xóa)
    * @param {File} file - Đối tượng tệp tin nguyên bản
    * @param {boolean} isMultiple - Chế độ đa tệp hay đơn tệp
    * @returns {HTMLElement} Node DOM hoàn chỉnh
    */
   createIconFollowFileType(file, isMultiple) {
      const iconContent = FILE_ICONS[file.type] || FILE_ICONS["DEFAULT"];
      
      return TagBuilder.create('div')
         .setAttributes({ className: `files__contain ${isMultiple ? "multiple" : ""}` })
         .append([
            TagBuilder.create('span')
               .setAttributes({ className: "files__contain--icon" })
               .html(iconContent)
               .build(),
            TagBuilder.create('span')
               .setAttributes({ className: "files__contain--filename" })
               .html(file.name)
               .build(),
            TagBuilder.create('span')
               .setAttributes({ className: "files__contain--clear", onclick: (event) => this.clearFile(event) })              
               .build(),
         ])
         .build();
   }

   /**
    * Xử lý gỡ bỏ tệp tin khỏi giao diện hiển thị và mảng lưu trữ dữ liệu kết quả
    * @param {Event} event - Sự kiện click chuột
    */
   clearFile(event) {
      const fileItem = event.target.closest(".files__contain");
      if (!fileItem) return;

      const fileName = fileItem.querySelector(".files__contain--filename").innerHTML;

      // Xóa phần tử khỏi cây cấu trúc DOM hiển thị
      if (!this.data.input.multiple) {
         fileItem.remove();
      } else {
         fileItem.parentElement.remove(); // Xóa thẻ cha <li>
      }

      // Xóa tệp tương ứng khỏi mảng lưu trữ kết quả trong bộ nhớ
      const fileIndex = this.data.result.findIndex((file) => file.name === fileName);
      if (fileIndex !== -1) {
         this.data.result.splice(fileIndex, 1);
      }

      // Nếu danh sách trống rỗng hoàn toàn, trả giao diện về trạng thái sơ khai ban đầu
      if (this.data.result.length === 0) {
         this.toggleControlWidgets(true);
         this.changeButtonToOriginTitle();
         this.data.dragArea.insertBefore(this.data.label, this.data.message);
      }
   }

   /**
    * Điều phối tệp tin thu thập được từ hành động Kéo & Thả chuột (Drag Over -> Drop)
    * @param {FileList} fileList - Danh sách các file nhận được từ DataTransfer
    */
   processIncomingFiles(fileList) {
      const incomingFiles = [...fileList];
      const validFiles = this._filterValidFiles(incomingFiles);

      if (validFiles.length === 0) return;

      if (!this.data.input.multiple) {
         // Chế độ đơn tệp
         if (this.data.result.length === 0) {
            this.handleSingleChoiceFile(validFiles);
         } else {
            // Nếu đã có sẵn file trước đó, ghi đè cập nhật nội dung hiển thị mới
            const targetFile = validFiles[0];
            const fileContain = this.data.dragArea.querySelector(".files__contain");
            if (fileContain) {
               fileContain.querySelector(".files__contain--icon").innerHTML = FILE_ICONS[targetFile.type] || FILE_ICONS["DEFAULT"];
               fileContain.querySelector(".files__contain--filename").innerHTML = targetFile.name;
            }
            this.data.result = [targetFile];
         }
      } else {
         // Chế độ đa tệp: Đưa thẳng vào luồng xử lý Multi-mode thông thường
         this.handleMultiChoiceFile(validFiles);
      }
   }

   /**
    * Phương thức cấu hình nhanh: Đặt chế độ chọn một hay nhiều tệp
    * @param {boolean} isMultiple 
    */
   multiple(isMultiple) {
      if (this.data?.input) this.data.input.multiple = isMultiple;
   }

   /**
    * Phương thức cấu hình nhanh: Giới hạn định dạng đuôi tệp cho phép upload
    * @param {string} allowedTypes - Ví dụ: ".pdf,.doc,.docx"
    */
   accept(allowedTypes) {
      if (this.data?.input) this.data.input.accept = allowedTypes;
   }

   /** Thiết lập loại dữ liệu tùy biến lưu trên thuộc tính phần tử gốc */
   dataType(value) {
      if (this.data?.main) this.data.main.dataType = value;
   }

   /** Thay đổi tiêu đề chữ hiển thị của nút bấm chọn file */
   title(text) {
      if (this.data?.title) this.data.title.innerText = text;
   }

   /**
    * Trả giao diện và dữ liệu lưu trữ về nguyên trạng thái ban đầu sạch sẽ
    */
   resetDragDrop() {
      if (!this.data) return;
      this.data.result = [];
      this.data.input.value = null;
      this.toggleControlWidgets(true);
      this.changeButtonToOriginTitle();
      
      const activeFileDisplay = this.data.dropZone.querySelector(".files__contain");
      if (activeFileDisplay) activeFileDisplay.remove();

      const itemContainer = this.data.dropZone.querySelector(".file__item");
      if (itemContainer) itemContainer.remove();
   }
}
