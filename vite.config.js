import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    build: {
      // Cực kỳ quan trọng: Tạo file manifest.json để PHP có thể đọc tên file đã hash
      manifest: true,
      outDir: 'dist',
      emptyOutDir: true, // Xóa thư mục dist trước mỗi lần build
      rollupOptions: {
        // Điểm đầu vào chính của plugin
        input: path.resolve(__dirname, 'src/main.js'),
      },
      // Để Vite tự chọn minifier mặc định (thường là esbuild) khi build production
      minify: isProduction, 
    },
    // Cấu hình esbuild để tự động loại bỏ console và debugger khi build
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      // Kiểm tra file certificate trước khi load để tránh Fatal Error
      https: fs.existsSync('./192.168.1.181+2-key.pem') ? {
        key: fs.readFileSync('./192.168.1.181+2-key.pem'),
        cert: fs.readFileSync('./192.168.1.181+2.pem'),
      } : false,
      cors: true, // Cho phép WordPress Admin truy cập tệp từ Dev Server
      watch: {
        usePolling: true, 
        interval: 100,
      },
    },
    // Base path rất quan trọng để Vite xử lý các đường dẫn ảnh/font bên trong CSS
    base: isProduction 
      ? '/wp-content/plugins/document/dist/' 
      : '/',
  };
});