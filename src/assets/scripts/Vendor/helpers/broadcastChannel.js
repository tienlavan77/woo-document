/**
 * BroadcastBus
 * Quản lý việc gửi và nhận tín hiệu đồng bộ giữa các tab
 */
export default class BroadcastBus {
   constructor(channelName = 'woo_sync_channel') {
      this.channel = new BroadcastChannel(channelName);
   }

   /**
    * Phát tín hiệu đi các tab khác
    * @param {string} name - bộ điều khiển bị tác động (controller) (vd: products, users, quotationController)
    * @param {object} payload - Dữ liệu đi kèm
    *    {
    *       action: loại hành động update, delete, add, ....   
    *       type: dữ liệu bị tác động
    *    }
    */
   emit(name, payload) { 
      // 
      this.channel.postMessage({ name, payload });
   }

   /**
    * Lắng nghe tín hiệu từ các tab khác
    * @param {function} callback - Hàm xử lý khi nhận được tin nhắn
    */
   onMessage(callback) {
      this.channel.onmessage = (event) => {
         callback(event.data);
      };
   }
   // Thêm hàm này để tương thích với thói quen gọi hàm native
   postMessage(data) {
      this.channel.postMessage(data);
   }
}