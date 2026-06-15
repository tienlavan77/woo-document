<?php
namespace App\Models\Documents;

class DocumentModel {
    private $new_dir;
    private $legacy_dir;
    private $upload_base_url;

    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->upload_base_url = $upload_dir['baseurl'] . '/';
        
        // Thư mục mới và cũ cấu hình theo đường dẫn tuyệt đối trên Server
        $this->new_dir    = $upload_dir['basedir'] . '/order_documents/';
        $this->legacy_dir = $upload_dir['basedir'] . '/myoptions/moreinfo/';

        // Tự động tạo thư mục mới nếu chưa có
        if (!file_exists($this->new_dir)) wp_mkdir_p($this->new_dir);
    }

    /**
     * Phương thức lõi: Tổng hợp file từ nhiều nguồn, xử lý sắp xếp và phân trang ảo.
     * Sử dụng Transient API để tránh quét ổ cứng liên tục, cải thiện tốc độ API.
     * 
     * @param int $page Trang hiện tại
     * @param int $per_page Số file trên mỗi trang (12 file)
     */
    public function getCompiledFiles($page = 1, $per_page = 12) {
        $cache_key = 'doc_files_p' . $page . '_c' . $per_page;
        $cached_data = get_transient($cache_key);

        if ($cached_data !== false) {
            return $cached_data;
        }

        $all_files = [];

        // 1. Quét thư mục mới
        if (file_exists($this->new_dir)) {
            $files = array_diff(scandir($this->new_dir), ['.', '..']);
            foreach ($files as $file) {
                $path = $this->new_dir . $file;
                if (is_file($path)) {
                    $all_files[] = $this->buildFileInfoObject($file, $path, 'order_documents/' . $file);
                }
            }
        }

        // 2. Quét thư mục cũ (Legacy Folder)
        if (file_exists($this->legacy_dir)) {
            $legacy_files = array_diff(scandir($this->legacy_dir), ['.', '..']);
            foreach ($legacy_files as $file) {
                $path = $this->legacy_dir . $file;
                if (is_file($path)) {
                    $all_files[] = $this->buildFileInfoObject($file, $path, 'myoptions/moreinfo/' . $file);
                }
            }
        }

        // Sắp xếp theo thứ tự thời gian giảm dần (LIFO) để người dùng thấy file vừa upload ngay lập tức
        usort($all_files, function($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        // Pagination Logic: Vì chúng ta lấy dữ liệu từ filesystem nên phải tự thực hiện slice mảng
        $total_files = count($all_files);
        $offset      = ($page - 1) * $per_page;
        $sliced_files = array_slice($all_files, $offset, $per_page);

        $result = [
            'files'        => $sliced_files,
            'total_count'  => $total_files,
            'has_more'     => ($offset + $per_page) < $total_files
        ];

        // Cache kết quả trong 5 phút để giảm tải I/O ổ cứng
        set_transient($cache_key, $result, 5 * MINUTE_IN_SECONDS);

        return $result;
    }

    /**
     * Xóa sạch toàn bộ cache transients của danh sách file.
     * Cần gọi mỗi khi có file mới được upload hoặc có file bị xóa khỏi server.
     */
    public function clearFileCache() {
        global $wpdb;
        // WordPress lưu transient trong bảng options với tiền tố _transient_
        $wpdb->query("DELETE FROM $wpdb->options WHERE option_name LIKE '_transient_doc_files_%'");
        $wpdb->query("DELETE FROM $wpdb->options WHERE option_name LIKE '_transient_timeout_doc_files_%'");
        
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('DocumentModel: File cache cleared via SQL wildcard.');
        }
    }

    /**
     * Hàm phụ trợ chuẩn hóa object thông tin file
     */
    private function buildFileInfoObject($file_name, $full_path, $relative_path) {
        return [
            'name'          => $file_name,
            'relative_path' => $relative_path, // Dùng cái này để lưu vào Order Meta nhằm phân biệt cũ/mới
            'url'           => $this->upload_base_url . $relative_path,
            'size'          => size_format(filesize($full_path)),
            'timestamp'     => filemtime($full_path),
            'ext'           => strtolower(pathinfo($file_name, PATHINFO_EXTENSION))
        ];
    }

    /**
     * Đồng bộ hóa tài liệu vào WooCommerce Meta.
     * Hệ thống lưu song song vào 2 Meta Keys:
     * 1. Meta key riêng lẻ (_assigned_doc_...) để phục vụ truy vấn DB nhanh.
     * 2. Meta key gộp ('orders') để phục vụ việc render giao diện đồng nhất.
     */
    public function bulkAssignMeta($order_ids, $relative_path, $doc_type) {
        $meta_key = '_assigned_doc_' . sanitize_text_field($doc_type);
        // Ánh xạ type từ API sang key trong mảng meta 'orders'
        $type_map = [
            'invoice'   => 'vatDocument',
            'quotation' => 'orderDocument',
            'delivery'  => 'deliveryDocument'
        ];
        $target_key = $type_map[$doc_type] ?? $doc_type;
        
        $success_count = 0;

        foreach ($order_ids as $order_id) {
            $order = wc_get_order(absint($order_id));
            if ($order) {
                // Lưu chính xác relative path (Ví dụ: 'myoptions/moreinfo/abc.pdf')
                $order->update_meta_data($meta_key, sanitize_text_field($relative_path));
                // Lấy mảng meta hiện tại
                $current_docs = $order->get_meta('orders', true);
                if (!is_array($current_docs)) {
                    $current_docs = [];
                }

                // Cập nhật giá trị (nếu rỗng thì coi như xóa/unassign)
                $current_docs[$target_key] = sanitize_text_field($relative_path);
                
                $order->update_meta_data('orders', $current_docs);
                $order->save();
                $success_count++;
            }
        }
        return $success_count;
    }
    public function getNewDirPath() {
        return $this->new_dir;
    }

    /**
     * Lấy danh sách các đơn hàng chưa có loại tài liệu cụ thể
     * Tối ưu bằng cách chỉ lấy 50 đơn hàng gần nhất
     * 
     * @param string $doc_type Loại tài liệu cần kiểm tra (invoice|quotation|delivery)
     * @return array Danh sách mảng chứa id, number và customer
     */
    public function getOrdersWithoutDoc($doc_type) {
        $type_map = [
            'invoice'   => 'vatDocument',
            'quotation' => 'orderDocument',
            'delivery'  => 'deliveryDocument'
        ];
        $target_key = $type_map[$doc_type] ?? $doc_type;

        // Lấy 50 đơn hàng gần nhất để kiểm tra (tối ưu hiệu năng)
        $args = [
            'limit' => 50,
            'orderby' => 'date',
            'order' => 'DESC',
            'return' => 'ids',
        ];
        $order_ids = wc_get_orders($args);
        $results = [];

        foreach ($order_ids as $id) {
            $order = wc_get_order($id);
            $meta = $order->get_meta('orders', true);
            
            // Nếu meta trống hoặc key tài liệu cụ thể trống
            if (!is_array($meta) || empty($meta[$target_key])) {
                $results[] = [
                    'id' => $id,
                    'number' => $order->get_order_number(),
                    'customer' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name()
                ];
            }
        }
        return $results;
    }

    /**
     * Tìm thông tin file từ relative path để hiển thị popup (Yêu cầu 1)
     */
    public function getFileDetailByPath($slug) {
        // Giải mã slug nếu nó bị encode và đảm bảo có đuôi .pdf
        $is_debug = defined('WP_DEBUG') && WP_DEBUG;

        // 👉 Loại bỏ dấu vết đường dẫn để ngăn chặn Path Traversal
        $clean_slug = basename(urldecode($slug));

        if ($is_debug) error_log('getFileDetailByPath: Processing slug: ' . $clean_slug);
        
        $filename = $clean_slug;
        if (!str_ends_with(strtolower($filename), '.pdf')) {
            $filename .= '.pdf';
        }

        if ($is_debug) error_log('getFileDetailByPath: Looking for filename: ' . $filename);
        
        $base_dir = wp_upload_dir()['basedir'] . '/';

        // 1. Tìm trong thư mục mới
        $relative_new = 'order_documents/' . $filename;
        if ($is_debug) error_log('getFileDetailByPath: Checking new path: ' . $base_dir . $relative_new);
        
        if (file_exists($base_dir . $relative_new)) {
            return $this->buildFileInfoObject($filename, $base_dir . $relative_new, $relative_new);
        }

        // 2. Tìm trong thư mục cũ (Legacy)
        $relative_legacy = 'myoptions/moreinfo/' . $filename;
        if ($is_debug) error_log('getFileDetailByPath: Checking legacy path: ' . $base_dir . $relative_legacy);
        
        if (file_exists($base_dir . $relative_legacy)) {
            return $this->buildFileInfoObject($filename, $base_dir . $relative_legacy, $relative_legacy);
        }

        if ($is_debug) error_log('getFileDetailByPath: File not found after checking all paths for slug: ' . $slug);
        
        return new \WP_Error('file_not_found', 'Tài liệu không tồn tại trên hệ thống.', ['status' => 404]);
    }
}
