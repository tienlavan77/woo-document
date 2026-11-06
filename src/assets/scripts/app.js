// Provides module declarations and business logic for app.js.

import ModuleLoader from './Vendor/helpers/loadModule.js';
import AuthController from './Controllers/Admin/Authenticate/authController.js';

// Defines App class behavior for app.js.
export default class App {
    static pageData = null;

    // Derives a compatible admin route when WordPress config injection is unavailable.
    static getUrlPageData() {
        const path = window.location.pathname.split('/').pop();
        const params = new URLSearchParams(window.location.search);
        const postType = params.get('post_type');
        const adminPage = params.get('page');

        if (adminPage === 'wc-orders' || adminPage === 'wc-orders--custom-view') {
            return { page: 'edit', type: 'order' };
        }
        if (['quotation', 'delivery', 'invoice', 'setting'].includes(adminPage)) {
            return { page: 'admin', type: adminPage };
        }
        if (path === 'edit.php' && ['shop_order', 'product'].includes(postType)) {
            return { page: 'edit', type: postType === 'shop_order' ? 'order' : 'product' };
        }
        if (path === 'post.php' && params.has('post')) {
            const bodyClass = document.body?.className || '';
            const type = bodyClass.includes('post-type-shop_order')
                ? 'order'
                : bodyClass.includes('post-type-product') ? 'product' : '';
            return { page: 'post', type };
        }
        if (path === 'users.php' || path === 'user-edit.php') {
            return { page: path.replace('.php', '').replace('-', ''), type: 'user' };
        }
        return {};
    }

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

        try {
            let pageData = window.DocumentPluginConfig || {};
            let currentPage = pageData.page;

            for (let attempt = 0; attempt < 20 && !currentPage; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, 50));
                pageData = window.DocumentPluginConfig || {};
                currentPage = pageData.page;
            }

            if (!pageData || typeof pageData !== 'object' || !currentPage) {
                pageData = this.getUrlPageData();
                currentPage = pageData.page;
            }

            if (!pageData || typeof pageData !== 'object' || !currentPage) {
                console.warn("[App] Không tìm thấy route hợp lệ trong DocumentPluginConfig; bỏ qua khởi tạo.");
                return;
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
