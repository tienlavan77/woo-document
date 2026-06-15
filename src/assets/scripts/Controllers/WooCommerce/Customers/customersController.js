import Controller from "../../controller";
import CustomersModel from '../../../Models/Woocommerce/Customers/customersModel';
import CustomersViewer from "../../../Views/Woocommerce/Customers/customersViewer";

/**
 * CustomersWooConttroller: Điều phối dữ liệu khách hàng giữa Model và View.
 * Xử lý các sự kiện click, đồng bộ dữ liệu cục bộ và hiển thị thông báo.
 */
export default class CustomersConttroller extends Controller {
   constructor() {   
      super() 
      // Khởi tạo Model và Viewer
      this.model = new CustomersModel();
      this.viewer = new CustomersViewer();
      // Lưu trữ reference của hàm bind để có thể removeListener nếu cần (Best Practice)
      this._boundHandleClick = this._handleDelegateClick.bind(this);
      this.init();      
   }

   /**
    * Khởi tạo logic ban đầu
    */
   init() {
      this.model.init();
      // Sử dụng Event Delegation trên document để bắt các phần tử sinh ra động
      document.addEventListener('click', this._boundHandleClick);
   }

   /**
    * Xử lý ủy quyền sự kiện Click
    * @param {Event} event 
    */ 
   async _handleDelegateClick(event) {
      const link = event.target.closest(this.viewer.link);
      if (!link) return;

      event.preventDefault();

      // Tối ưu: Chỉ Parse JSON 1 lần và lưu vào property để tăng hiệu năng
      if (!link.info && link.dataset.info) {
         try {
            link.info = JSON.parse(link.dataset.info);
            // Giữ lại dataset nếu cần cho CSS, nếu không có thể xóa để giải phóng bộ nhớ
            delete link.dataset.info;
            
         } catch (err) {
            console.error("Lỗi parse dữ liệu khách hàng:", err);
            return;
         }
      }

      await this._processAction(link.info);
   }

   /**
    * Xác định và thực thi hành động dựa trên trạng thái dữ liệu
    * @param {Object} customerInfo - Dữ liệu từ dataset của link
    */
   async _processAction(customerInfo) {
      try {
         const customerId = customerInfo?.id;
         const currentData = this.model.data;

         // Action Mapping: Rút gọn logic xác định trạng thái
         let action = 'emptyCustomer'; 
         
         if (currentData && Object.keys(currentData).length > 0) {
            action = (customerId === currentData.id) ? 'sameCustomer' : 'differentCustomer';
         }

         // Thực thi hàm tương ứng nếu tồn tại
         if (typeof this[action] === 'function') {
            await this[action](customerId);
         }
      } catch (error) {
         console.error("Lỗi trong quá trình xử lý Action:", error);
      }
   }

   /**
    * Cập nhật dữ liệu khách hàng từ API và đồng bộ vào bộ nhớ
    * @param {number|string} id 
    */
   async updateCustomer(id) { 
      try {
         // Hiển thị loading nếu cần
         const data = await this.model.get(id);

         if (data) {
            // Cập nhật Model (Model nên tự xử lý việc lưu vào Storage trong hàm set data)
            this.model.data = data; 
            this.model.saveLocal();            
            this.viewer.updateSuccessNotice();
          
            this.channel.emit('quotation',{               
               type: 'customer',
               action: 'update'
            })
            return true;
         }
         return false;
      } catch (error) {
         console.error("Lỗi API UpdateCustomer:", error);
         return false;
      }   
   }

   // --- Các hàm xử lý trạng thái cụ thể ---

   async emptyCustomer(id) {
      return await this.updateCustomer(id);
   }

   /**
    * Khi click vào chính khách hàng đang hiển thị
    */
   sameCustomer(id) {
      this._showConfirmModal(id, this.viewer.messages.same);
   }

   /**
    * Khi click vào một khách hàng khác với khách hàng hiện tại
    */
   differentCustomer(id) {
      this._showConfirmModal(id, this.viewer.messages.different);
   }

   /**
    * Hàm trung gian hiển thị Modal xác nhận để tránh lặp code
    */
   _showConfirmModal(id, message) {
      this.viewer.updateCustomerNotice({
         message: message,
         yes: async () => {
            const success = await this.updateCustomer(id);
            if (success) this.viewer.modal.close();
         }, 
         no: () => this.viewer.modal.close(),
      });
   }

   onSyncCustomer({ type, action }) {
      try {       
         if (type === 'quotation') this.model.data = this.model._getStorage()   
      } catch (error) {
         console.log('not clear customer')
      }
   }
}
