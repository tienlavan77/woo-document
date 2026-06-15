import './style.scss';
import App from './assets/scripts/app.min.js'

// Khởi chạy ứng dụng ngay sau khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
   const app = new App();
   app.init();
});