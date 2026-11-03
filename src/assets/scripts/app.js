import ModuleLoader from './Vendor/helpers/loadModule.js';
import AuthController from './Controllers/Admin/Authenticate/authController.js';

export default class App {
    static pageData = null;

    static getPageData() {
        return App.pageData;
    }

    constructor() {
        this.auth = new AuthController();
        /**
         * Cấu trúc Route Map: Ánh xạ giữa tên trang (page key) và đường dẫn Controller.
         * Giúp dễ dàng thêm trang mới mà không cần sửa logic khởi tạo.
         */
        this.routeMap = {
            'edit':  'WooCommerce/wooCommerceController',
            'users': 'WooCommerce/wooCommerceController',
            'post':  'WooCommerce/wooCommerceController',
            'admin': 'Admin/adminLoadController',
        };
    }

    /**
     * Phương thức khởi tạo ứng dụng
     * Đọc thông tin từ Meta tag một lần duy nhất và kích hoạt Controller tương ứng.
     */
    async init() {
        if (App.isStarted) return;
        App.isStarted = true;

        const metaTag = document.querySelector("meta#pagenow");
        if (!metaTag) {
            console.warn("[App] Không tìm thấy thẻ meta#pagenow. Ứng dụng không thể xác định trang hiện tại.");
            return;
        }

        try {
            const pageData = JSON.parse(metaTag.dataset.page || '{}');
            const currentPage = pageData.page;

            if (!currentPage) {
                throw new Error("Dữ liệu trang (page) không tồn tại trong dataset.");
            }

            // Lưu thông tin định tuyến đã parse để truyền xuống các bộ nạp controller
            App.pageData = pageData;

            const controllerPath = this.routeMap[currentPage];

            if (controllerPath) {
                await ModuleLoader.load(controllerPath, pageData);
            } else {
                console.warn(`[App] Không tìm thấy controller nào được cấu hình cho trang: "${currentPage}"`);
            }
        } catch (error) {
            console.error("[App] Lỗi nghiêm trọng khi khởi tạo ứng dụng:", error);
        }
    }
}
