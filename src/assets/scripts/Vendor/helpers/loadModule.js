const controllerModules = import.meta.glob('../../Controllers/**/*.js');

/**
 * Lớp ModuleLoader - Chuyên trách việc nạp các module dynamic.
 */
export default class ModuleLoader {
   /**
    * Tải và khởi tạo một module từ đường dẫn cho trước.
    * * @param {Object} options - Tham số cấu hình
    * @param {string} options.link - Đường dẫn tới file module (.mjs hoặc .js)
    * @param {Object} options.notice - Instance của class thông báo
    * @param {Object} options.modal - Instance của class modal
    * @returns {Promise<Object|null>} Trả về instance của module hoặc null nếu lỗi
    */
   static async load(link ) {
       try {
           // 1. Thực hiện dynamic import
           // Sử dụng await vì import() trả về một Promise
           const fullPath = `../../Controllers/${link}.js`
           if (controllerModules[fullPath]) {
                const module = await controllerModules[fullPath]();
                if (! module.default) {
                    throw new Error(`Module tại ${link} không có "export default".`);
                }
                /**
                * 3. Khởi tạo instance từ class được export.
                * Giả định module được tải luôn export default là một Class.
                */
               // 2. Kiểm tra xem module có default export hay không
                const instance = new module.default();
                return instance;
           }
         
           // Trả về instance để có thể sử dụng tiếp nếu cần (ví dụ gọi hàm .init())
           return undefined;          

       } catch (error) {
           // In lỗi chi tiết hơn để dễ debug
           console.error(`[ModuleLoader Error]: Không thể tải module từ đường dẫn: ${link}`);
           console.error(error);           
  
           return null;
       }
   }
}

