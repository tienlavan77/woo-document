import shell from 'shelljs';
import fs from 'fs';
import { ZipArchive } from 'archiver';

// 1. Chạy lệnh build Vite trước
console.log('📦 1. Đang biên dịch tài nguyên với Vite...');
const build = shell.exec('npm run build');
if (build.code !== 0) {
    console.error('❌ Build thất bại, dừng deploy để không đóng gói tài nguyên cũ.');
    process.exit(build.code || 1);
}

// 2. Tạo một thư mục tạm để chuẩn bị cấu trúc cho WordPress
const tempDir = './temp-build';
const pluginDir = `${tempDir}/document`;

shell.rm('-rf', tempDir);
shell.mkdir('-p', pluginDir);

// Danh sách các file và thư mục PHP + Asset cần đóng gói
const filesToCopy = [
    'core',          
    'dist',          
    'vendor',
    'templates',
    'plugin.php'   
];

console.log('🚚 2. Đang gom các file sản phẩm vào thư mục tạm...');
filesToCopy.forEach(file => {
    if (shell.test('-e', file)) {
        shell.cp('-R', file, pluginDir);
    }
});

// 3. Tiến hành nén thư mục tạm thành file document.zip chuẩn WordPress
console.log('🤐 3. Đang tiến hành nén thành file document.zip...');

const productionDir = './production';
const outputPath = `${productionDir}/document.zip`;
fs.mkdirSync(productionDir, { recursive: true });
const output = fs.createWriteStream(outputPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n🚀 NÉN THÀNH CÔNG!`);
    console.log(`📂 Đã tạo ra file: ${outputPath} (${sizeInMB} MB)`);
    console.log(`✨ Bạn có thể lấy file này up trực tiếp lên admin WordPress.`);
    
    shell.rm('-rf', tempDir);
});

archive.on('error', (err) => {
    console.error('❌ Lỗi trong quá trình nén file:', err);
    shell.rm('-rf', tempDir);
});

archive.pipe(output);
archive.directory(pluginDir, 'document');
archive.finalize();
