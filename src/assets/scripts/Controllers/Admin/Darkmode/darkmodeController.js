export default class DarkmodeController {
   constructor() {
      this.init();
   }
   init() {
      // Kiểm tra trạng thái dark mode từ localStorage
      const isDarkMode = localStorage.getItem('darkmode') === 'true'? 'dark' : 'light';
      this.applyDarkMode(isDarkMode);

      // Lắng nghe sự kiện thay đổi dark mode từ các phần khác của ứng dụng
      document.addEventListener('click', (event) => {
         let target = event.target.closest('.darkmode-toggle');
         if (!target) return;
         const currentMode = document.documentElement.getAttribute('data-theme');
         const newMode = currentMode === 'dark' ? 'light' : 'dark';
         this.applyDarkMode(newMode);
         localStorage.setItem('darkmode', newMode === 'dark'? 'true' : 'false');
      });
   }

   applyDarkMode(isDarkMode) {
     document.documentElement.setAttribute('data-theme', isDarkMode);
   }
}
