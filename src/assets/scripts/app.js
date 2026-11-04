// Provides module declarations and business logic for app.js.

import ModuleLoader from './Vendor/helpers/loadModule.js';
import AuthController from './Controllers/Admin/Authenticate/authController.js';

// Defines App class behavior for app.js.
export default class App {
    static pageData = null;

    // Defines getPageData method behavior for app.js.
    static getPageData() {
        return App.pageData;
    }

    // Defines constructor method behavior for app.js.
    constructor() {
        this.auth = new AuthController();
        /* Executes documented symbol logic in app.js. */
        this.routeMap = {
            'edit':  'WooCommerce/wooCommerceController',
            'users': 'WooCommerce/wooCommerceController',
            'post':  'WooCommerce/wooCommerceController',
            'admin': 'Admin/adminLoadController',
        };
    }

    /* Executes documented symbol logic in app.js. */
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

            // Executes documented symbol logic in app.js.
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
