import Model from '../../model';
/**
 * UserModel: Lớp quản lý dữ liệu đặc thù cho Thông tin Người dùng.
 * Kế thừa toàn bộ logic khởi tạo, lưu trữ và đồng bộ từ SettingModel.
 */
export default class UserModel extends Model {
   /**
   * Khởi tạo Model với các thông số định danh riêng
   */
   constructor() {
      // Gọi constructor của lớp cha (SettingModel)
      super();

      // Định nghĩa Endpoint API dành riêng cho thông tin người dùng
      this.api = '/wp-json/tinsinhphat/v1/settings/user';

      // Định nghĩa Endpoint API dành riêng cho thông tin người dùng
      this.storageName = 'user_info';           
       /**
      * Ví dụ về mở rộng: Kiểm tra dữ liệu trước khi lưu
      * (Nếu bạn muốn thêm logic kiểm tra riêng cho Company)
      */
      // async save() { 
      //   if (!this.data.taxcode) {
      //     console.error("Mã số thuế không được để trống");
      //     return { status: { code: 400, message: "Thiếu mã số thuế" } };
      //   }
      //   return await super.save(); // Gọi hàm save gốc của lớp cha
      // }
   }
}

