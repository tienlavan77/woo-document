import BroadcastBus from "../Vendor/helpers/broadcastChannel";
import TextHelper from "../Vendor/helpers/textHelper";

const broadCast = new BroadcastBus('document_channel')

export default class Controller {
   constructor() {
      this.channel = broadCast;  
      this._initBroadcastSync()
   }
   /**
    * Thiết lập bộ lắng nghe chung cho tất cả controller con
    */
   _initBroadcastSync() {
      if (this.channel) {
         this.channel.onMessage((response) => {
            const { name, payload } = response;
            
            // Kiểm tra nếu class con có định nghĩa hàm xử lý cho 'type' này
            // Ví dụ: nếu type là 'quotation', nó sẽ tìm hàm onSyncQuotation() trong class con
            const handlerName = `onSync${TextHelper.capitalize(name)}`;
            
            if (typeof this[handlerName] === 'function') {
               this[handlerName](payload);
            }
         });
      }
   }
}