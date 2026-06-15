import Controller from '../../controller';
import ProductModel from '../../../Models/Woocommerce/Products/productModel';
import ProductViewer from '../../../Views/Woocommerce/Products/productViewer';

export default class EditProductController extends Controller {
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
      this.processAddProduct(event);
   }

   async processAddProduct (event) {
      const postChoiced = document.querySelectorAll('input[name="post[]"]:checked');

      if (postChoiced.length === 0) { 
         this.viewer.noAnyChoiceNotice();
         return; 
      }

      const products = [...postChoiced].map(post => parseInt(post.value));
      let exist = this.model.checkExistList(products);
      
      if (exist) {
            this.viewer.existProductNotice({
            yes: async () => {
               await this.updateQuotaion(products)
               this.viewer.modal.close({clear: true})
            },
            no: () => this.viewer.modal.close({clear: true}),
            message: this.viewer.messages.exist
         })
      } else {
         let result = await this.updateQuotaion(products)
      }

   }

   async updateQuotaion(data) {     
      if (! data || data.length === 0 ) return {};
      try {
         const includes = data.join(',')
         //lấy dữ liệu từ server nếu sản phẩm cha không tồn tại trong quotation 
         // tại đây chưa biết sản phẩm lấy ra là sản phẩm con hay cha
         let products = await this.model.get(`?include=${includes}`);
         this.model.data = {...this.model.data, ...products}
         this.model.saveLocal();     
         this.viewer.updateSuccessNotice();
         
         this.channel.emit('quotation',{               
            type: 'product',
            action: 'update'
         })
         return true;
      } catch(error) {
         console.error("Lỗi khi cập nhật báo giá:", error);

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
