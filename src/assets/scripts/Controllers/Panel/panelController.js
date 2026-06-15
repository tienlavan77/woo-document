import PanelViewer from "../../Views/Panel/panelViewer";

export default class PanelController {
   constructor(model) {
      this.viewer = new PanelViewer();
      this.model = model;
      
      // Danh sách các key cần quản lý để tránh lặp code (DRY)
      this.controls = ['stamp', 'signature'];           
   }

   init(template) {
      // template: DOM element 
      if (! template ) return 
      // 1. Đồng bộ trạng thái từ dữ liệu đã lưu
      this.collectLink(template)
      this.loadInitialStatus();
      // 2. Đăng ký sự kiện tự động cho tất cả controls
      this.controls.forEach(key => {
         const element = this.viewer[key];
         if (element) {
            element.addEventListener('change', (e) => this._handleStatusChange(e));
         }
      });
   }

   // Lưu trữ các element link vào một object để truy cập linh hoạt
   collectLink(template) {
      this.links = {};
      this.controls.forEach(key => {
         this.links[key] = template.querySelector(`.${key}Link`);
      });
   }
   /**
    * Khôi phục trạng thái ban đầu
    */
   loadInitialStatus() {
      const savedData = this.model.data.modifier || {};

      this.controls.forEach(key => {
         const isChecked = savedData[key] ?? true; // Mặc định là true nếu chưa có data
         
         // Cập nhật trạng thái checkbox trong Viewer
         if (this.viewer[key]) {
            this.viewer[key].checked = isChecked;
         }

         // Cập nhật hiển thị của link tương ứng
         this._updateVisibility(key, isChecked);
      });
   }

   /**
    * Xử lý thay đổi trạng thái
    */
   _handleStatusChange(e) {
      const { name: key, checked: isChecked } = e.target;

      // Cập nhật Model nhanh hơn với tính năng spread
      // if (! this.model.data.)
      this.model.data.modifier = { ...this.model.data.modifier, [key]: isChecked };
      this.model.saveLocal();

      // Cập nhật UI
      this._updateVisibility(key, isChecked);
   }

   /**
    * Hàm tập trung xử lý ẩn/hiện để dễ bảo trì
    * @param {string} key - 'stamp' hoặc 'signature'
    * @param {boolean} isVisible 
    */
   _updateVisibility(key, isVisible) {
      const targetLink = this.links[key];
      if (!targetLink) return;

      // Sử dụng tham số thứ 2 của toggle để đảm bảo tính chính xác tuyệt đối của state
      // invisible sẽ được thêm nếu isVisible là false
      targetLink.classList.toggle('invisible', !isVisible);
   }
}
