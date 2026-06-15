/**
 * Lớp WPMediaManager - Quản lý tương tác với WordPress Media Library
 */
class WPMediaManager {
   constructor(config = {}) {
     // Cấu hình mặc định
     this.defaultConfig = {
       title: "Choice image or upload",
       buttonText: "Use this image",
       libraryType: "image",
       multiple: false,
       ...config
     };
 
     this.frame = null; // Lưu trữ instance của wp.media
     this.currentContext = { element: null, callback: null };
   }
 
   /**
    * Khởi tạo hoặc lấy lại Media Frame (Singleton Pattern)
    */
   getFrame() {
     if (this.frame) return this.frame;
 
     // Khởi tạo wp.media nếu chưa tồn tại
     this.frame = wp.media({
       title: this.defaultConfig.title,
       button: {
         text: this.defaultConfig.buttonText,
       },
       library: {
         type: this.defaultConfig.libraryType,
       },
       multiple: this.defaultConfig.multiple,
     });
 
     // Lắng nghe sự kiện chọn file
     this.frame.on("select", () => this.handleSelect());
 
     return this.frame;
   }
 
   /**
    * Xử lý dữ liệu sau khi người dùng nhấn nút chọn
    */
   handleSelect() {
     const selection = this.frame.state().get("selection");
     
     if (this.defaultConfig.multiple) {
         // Nếu chọn nhiều ảnh
         const imageData = selection.map(attachment => attachment.toJSON());
         if (this.currentContext.callback) {
             this.currentContext.callback(imageData, this.currentContext.element);
         }
     } else {
         // Nếu chọn 1 ảnh
         const imageUrl = selection.first().toJSON().url;
         if (this.currentContext.callback) {
             this.currentContext.callback({ 
                 link: imageUrl, 
                 element: this.currentContext.element 
             });
         }
     }
   }
 
   /**
    * Mở hộp thoại Media
    * @param {Object} options - { element, callback }
    */
   open({ element, callback }) {
     // Lưu ngữ cảnh hiện tại để callback biết trả về cho ai
     this.currentContext = { element, callback };
 
     // Mở frame
     this.getFrame().open();
   }
 }
 // Khởi tạo một instance duy nhất để dùng chung toàn hệ thống

export default WPMediaManager ;


