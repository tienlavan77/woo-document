import * as XLSX from 'xlsx';

/**
 * Class xử lý xuất dữ liệu ra file Excel (.xlsx) chuẩn bảo mật và tối ưu
 */
export default class ExcelExporter {
   /**
    * Khởi tạo cấu hình mặc định cho Class
    * @param {Object} config - Cấu hình tùy chọn
    * @param {string} config.defaultFilename - Tên file mặc định khi tải về
    * @param {string} config.defaultSheetName - Tên thẻ Sheet bên trong Excel
    */
   constructor(config = {}) {
      this.defaultFilename = config.defaultFilename || 'danh-sach-xuat.xlsx';
      this.defaultSheetName = config.defaultSheetName || 'Dữ liệu';
   }

   /**
    * Chuẩn hóa tên file luôn luôn có đuôi .xlsx
    * @param {string} filename 
    * @returns {string}
    * @private
    */
   _formatFilename(filename) {
      const name = filename ? filename.trim() : this.defaultFilename;
      return name.endsWith('.xlsx') ? name : `${name}.xlsx`;
   }

   /**
    * Xuất dữ liệu từ HTML Table và tự động chuyển cột đầu tiên thành STT
    * @param {string} tableId - ID của thẻ <table>
    * @param {string} [customFilename] - Tên file tùy chỉnh
    * @returns {boolean}
    */
   fromTable(tableId, customFilename = '') {
      try {
         const originalTable = document.getElementById(tableId);
         if (!originalTable) {
            throw new Error(`Không tìm thấy phần tử HTML Table với ID: "${tableId}"`);
         }

         // 👉 BƯỚC THẦN THÁNH: Nhân bản bảng ra một bản sao chạy ngầm trong bộ nhớ
         // Việc chỉnh sửa trên bản sao này sẽ KHÔNG làm thay đổi giao diện hiển thị của người dùng
         const clonedTable = originalTable.cloneNode(true);
         console.log('Bảng gốc:', clonedTable);
         // 1. Sửa tiêu đề cột đầu tiên ở thẻ <theader> thành "STT"
         const firstHeader = clonedTable.querySelector('thead tr th:first-child') || clonedTable.querySelector('tr th:first-child');
       
         if (firstHeader) {
            firstHeader.textContent = 'STT';
         }

         // 2. Lặp qua toàn bộ các hàng trong <tbody> để thay thế nút bấm/checkbox thành số thứ tự tăng dần
         const dataRows = clonedTable.querySelectorAll('tbody tr'); // Chỉ lấy những hàng không có class 'hidden'

         if (dataRows.length > 0) {
            dataRows.forEach((row, index) => {
               const firstCell = row.querySelector('td:first-child');
               if (firstCell) {
                  // Thay thế toàn bộ ruột bên trong ô (checkbox, nút bấm...) bằng số thứ tự (1, 2, 3...)
                  firstCell.textContent = index + 1; 
                  
                  // Xóa bỏ các thuộc tính định dạng căn lề cũ nếu cần để số hiển thị ngay ngắn
                  firstCell.removeAttribute('style');
                  firstCell.style.textAlign = 'center'; // Căn giữa số thứ tự trong Excel
               }
            });
         }
      
         // 3. Tiến hành chuyển đổi bản sao đã được làm sạch này sang định dạng SheetJS
         const worksheet = XLSX.utils.table_to_sheet(clonedTable);
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, this.defaultSheetName);

         const finalFilename = this._formatFilename(customFilename);
         XLSX.writeFile(workbook, finalFilename);

         return true;
      } catch (error) {
         console.error('[ExcelExporter Error]:', error.message);
         return false;
      }
   }

   /**
    * TÍNH NĂNG MỞ RỘNG: Xuất dữ liệu từ mảng Object (JSON) không cần qua giao diện Table
    * @param {Array<Object>} jsonData - Mảng dữ liệu JSON ví dụ: [{name: 'A', age: 20}]
    * @param {string} [customFilename] - Tên file tùy chỉnh
    * @returns {boolean}
    */
   fromJson(jsonData, customFilename = '') {
      try {
         if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('Dữ liệu JSON đầu vào phải là một mảng và không được trống.');
         }

         const worksheet = XLSX.utils.json_to_sheet(jsonData);
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, this.defaultSheetName);

         const finalFilename = this._formatFilename(customFilename);
         XLSX.writeFile(workbook, finalFilename);

         return true;
      } catch (error) {
         console.error('[ExcelExporter Error]:', error.message);
         return false;
      }
   }
}
