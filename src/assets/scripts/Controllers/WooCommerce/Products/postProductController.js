import Controller from '../../controller';
import ProductModel from '../../../Models/Woocommerce/Products/productModel';
import ProductViewer from '../../../Views/Woocommerce/Products/productViewer';

export default class PostProductController extends Controller {
   constructor() {
      super()
      this.model = new ProductModel();
      this.viewer = new ProductViewer(); 
      this.init()
   }

   async init() {
      this.model.init();
      document.addEventListener('click', this._boundHandleClick);      
   }

   // xử lý các nút bấm đơn trong trang chỉnh sửa sản phẩm
   _boundHandleClick = (event) => {
      const link = event.target.closest(this.viewer.link);
      if (!link) return; 

      event.preventDefault(); 
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
      
      this.processAddProduct(link.info);
   }

   async processAddProduct(info) {
            
      let exist = this.model.checkExistSingle(info);
              
      if ( exist.parent || exist.variation ) {       
                  
         this.viewer.existProductNotice({
            yes: async () => {
               await this.updateQuotation(info, exist)
               this.viewer.modal.close({clear: true})
            },
            no: () => this.viewer.modal.close({clear: true}),
            message: this.viewer.messages.exist
         })

      } else {
         // chưa có sản phẩm cha
         // có sản phẩm cha, chưa có sản phẩm con
         let result = await this.updateQuotation(info, exist);
         
      }

   }

   async updateQuotation(selectedItem, existingEntry) {
      try {
            // 1. Định danh ID để truy xuất Key (Ép kiểu String)
         const pId = String(selectedItem.parent_id || selectedItem.id);
         const vId = String(selectedItem.id);

         // 2. Lấy dữ liệu mới nhất từ server (đã được chuẩn hóa ở model.get)
         const freshParent = await this.model.get(`/${pId}`);
         if (!freshParent) throw new Error("Product not found");
         
         // 3. Xử lý Logic cập nhật
         if (!selectedItem.parent_id || selectedItem.parent_id === 0) {
            /** 
             * TRƯỜNG HỢP 1: Chọn sản phẩm cha (Simple Product/Parent)
             * Ghi đè hoặc thêm mới toàn bộ thông tin từ server.
          */
         this.model.data = { ...this.model.data, ...freshParent };
         } else {
         /** 
          * TRƯỜNG HỢP 2: Chọn sản phẩm con (Variation)
         */
            const products = {...freshParent[pId]}
            const targetVariation = products.variations[vId];
            
            if (!(pId in this.model.data)) {
               /** 
                * 2a. Không có cha trong model.data:
                * Thêm mới cha nhưng chỉ chứa duy nhất biến thể được chọn.
                */
               this.model.data[pId] = {
                     ...products,
                     variations: { [vId]: targetVariation }
               };
            } else {
               /** 
                * 2b. Đã có cha trong model.data:
                * - Thông tin cha lấy mới từ server.
                * - Update biến thể được chọn, giữ lại các biến thể đang có.
                */
               this.model.data[pId] = {
                     ...products,
                     variations: {
                        ...(this.model.data[pId].variations || {}), // Giữ lại variations cũ
                        [vId]: targetVariation // Ghi đè hoặc thêm mới biến thể được chọn
                     }
               };
            }
         }

         // 4. Lưu trữ và Thông báo
         this.model.saveLocal();
         this.viewer.updateSuccessNotice();
         this.channel.emit('quotation',{               
            type: 'product',
            action: 'update'
         })
         return true;

      } catch (error) {
         console.error("Update Quotation Error:", error);
         return false;
      }
   }

   onSyncProduct({type, action}) {
      try {       
         if (type === 'quotation') this.model.data = this.model._getStorage()              
      } catch (error) {
         console.log('not clear products')
      }
   }

}
