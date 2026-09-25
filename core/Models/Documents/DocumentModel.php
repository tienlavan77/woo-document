<?php
namespace App\Models\Documents;

use App\Support\SystemFolderManager;

class DocumentModel {
    private $new_dir;
    private $new_relative_prefix;
    private $legacy_dir;
    private $upload_base_url;

    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->upload_base_url = $upload_dir['baseurl'] . '/';

        $configured_folder = SystemFolderManager::getFolder('document_folder');
        $this->new_dir = trailingslashit($configured_folder['absolute_path']);
        $this->new_relative_prefix = $configured_folder['relative_prefix'];
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
        $all_files = [];
        $document_directories = SystemFolderManager::getDocumentDirectories();

        // Hợp nhất file PDF từ cả kho mới và kho cũ trước khi phân trang.
        foreach ($document_directories as [$directory, $relative_prefix]) {
            if (!is_dir($directory)) {
                continue;
            }

            foreach (array_diff(scandir($directory), ['.', '..']) as $file) {
                $path = trailingslashit($directory) . $file;
                if (is_file($path) && strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'pdf') {
                    $all_files[] = $this->buildFileInfoObject($file, $path, $relative_prefix . $file);
                }
            }
        }

        // Sắp xếp toàn bộ danh sách theo thời gian chỉnh sửa mới nhất trước.
        usort($all_files, function($a, $b) {
            $timestamp_a = (int) ($a['timestamp'] ?? 0);
            $timestamp_b = (int) ($b['timestamp'] ?? 0);

            if ($timestamp_a !== $timestamp_b) {
                return $timestamp_b <=> $timestamp_a;
            }

            // Giữ thứ tự ổn định khi filesystem trả về cùng một timestamp.
            return strnatcasecmp(
                (string) ($b['relative_path'] ?? ''),
                (string) ($a['relative_path'] ?? '')
            );
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

        // Không cache danh sách này: modal cần phản ánh ngay file mới từ cả hai thư mục.
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
        clearstatcache(true, $full_path);

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

    public function getNewRelativePrefix() {
        return $this->new_relative_prefix;
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

        foreach (SystemFolderManager::getDocumentDirectories() as [$directory, $relative_prefix]) {
            $file_path = trailingslashit($directory) . $filename;
            if ($is_debug) error_log('getFileDetailByPath: Checking path: ' . $file_path);

            if (is_file($file_path)) {
                return $this->buildFileInfoObject($filename, $file_path, $relative_prefix . $filename);
            }
        }

        if ($is_debug) error_log('getFileDetailByPath: File not found after checking all paths for slug: ' . $slug);

        return new \WP_Error('file_not_found', 'Tài liệu không tồn tại trên hệ thống.', ['status' => 404]);
    }

    /**
     * Xóa file vật lý một cách an toàn
     * @param string $relative_path Đường dẫn tương đối của file (Ví dụ: 'order_documents/Invoice-4707.pdf')
     */
    public function deleteFileSafely($path) {
        $clean_path = wp_normalize_path(sanitize_text_field($path));

        // 1. CHẶN BẢO MẬT: Không cho phép chứa dấu vết di chuyển thư mục ngược dòng (../)
        if (strpos($clean_path, '..') !== false || empty($clean_path)) {
            return new \WP_Error('security_error', 'Đường dẫn file không hợp lệ hoặc không an toàn.', ['status' => 400]);
        }

        $upload_dir = wp_upload_dir();
        $absolute_path = wp_normalize_path($upload_dir['basedir'] . '/' . $clean_path);

        // 2. CHẶN BẢO MẬT: Chỉ cho phép xóa trong các kho tài liệu đã cấu hình.
        $is_in_document_dir = false;
        foreach (SystemFolderManager::getDocumentDirectories() as [$directory]) {
            $document_dir = trailingslashit(wp_normalize_path($directory));
            if (strpos($absolute_path, $document_dir) === 0) {
                $is_in_document_dir = true;
                break;
            }
        }

        if (!$is_in_document_dir) {
            return new \WP_Error('permission_denied', 'Bạn không có quyền xóa file nằm ngoài kho lưu trữ.', ['status' => 403]);
        }

        // 3. Thực hiện xóa file
        if (file_exists($absolute_path) && is_file($absolute_path)) {
            if (unlink($absolute_path)) {
                $this->clearFileCache();
                return true;
            }
            return new \WP_Error('delete_failed', 'Lỗi hệ thống: Không thể thực hiện xóa file.', ['status' => 500]);
        }

        return new \WP_Error('file_not_found', 'File không tồn tại hoặc đã bị xóa từ trước.', ['status' => 404]);
    }
}
