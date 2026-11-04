<?php
// Provides module declarations and business logic for DocumentModel.php.

namespace App\Models\Documents;

use App\Support\SystemFolderManager;

// Defines DocumentModel class behavior for DocumentModel.php.
class DocumentModel {
    private $new_dir;
    private $new_relative_prefix;
    private $legacy_dir;
    private $upload_base_url;

    // Defines __construct method behavior for DocumentModel.php.
    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->upload_base_url = $upload_dir['baseurl'] . '/';

        $configured_folder = SystemFolderManager::getFolder('document_folder');
        $this->new_dir = trailingslashit($configured_folder['absolute_path']);
        $this->new_relative_prefix = $configured_folder['relative_prefix'];
        $this->legacy_dir = $upload_dir['basedir'] . '/myoptions/moreinfo/';

        // Executes documented symbol logic in DocumentModel.php.
        if (!file_exists($this->new_dir)) wp_mkdir_p($this->new_dir);
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public function getCompiledFiles($page = 1, $per_page = 12) {
        $all_files = [];
        $document_directories = SystemFolderManager::getDocumentDirectories();

        // Executes documented symbol logic in DocumentModel.php.
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

        // Executes documented symbol logic in DocumentModel.php.
        usort($all_files, function($a, $b) {
            $timestamp_a = (int) ($a['timestamp'] ?? 0);
            $timestamp_b = (int) ($b['timestamp'] ?? 0);

            if ($timestamp_a !== $timestamp_b) {
                return $timestamp_b <=> $timestamp_a;
            }

            // Executes documented symbol logic in DocumentModel.php.
            return strnatcasecmp(
                (string) ($b['relative_path'] ?? ''),
                (string) ($a['relative_path'] ?? '')
            );
        });

        // Executes documented symbol logic in DocumentModel.php.
        $total_files = count($all_files);
        $offset      = ($page - 1) * $per_page;
        $sliced_files = array_slice($all_files, $offset, $per_page);

        $result = [
            'files'        => $sliced_files,
            'total_count'  => $total_files,
            'has_more'     => ($offset + $per_page) < $total_files
        ];

        // Executes documented symbol logic in DocumentModel.php.
        return $result;
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public function clearFileCache() {
        global $wpdb;
        // Executes documented symbol logic in DocumentModel.php.
        $wpdb->query("DELETE FROM $wpdb->options WHERE option_name LIKE '_transient_doc_files_%'");
        $wpdb->query("DELETE FROM $wpdb->options WHERE option_name LIKE '_transient_timeout_doc_files_%'");

        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('DocumentModel: File cache cleared via SQL wildcard.');
        }
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    private function buildFileInfoObject($file_name, $full_path, $relative_path) {
        clearstatcache(true, $full_path);
        $thumbnail = $this->ensureDocumentThumbnail($file_name, $full_path);

        return [
            'name'           => $file_name,
            'relative_path'  => $relative_path, // Dùng cái này để lưu vào Order Meta nhằm phân biệt cũ/mới
            'url'            => $this->upload_base_url . $relative_path,
            'thumbnail_url'  => $thumbnail ? rest_url('tinsinhphat/v1/documents/thumbnail/' . rawurlencode($file_name)) : '',
            'size'           => size_format(filesize($full_path)),
            'timestamp'      => filemtime($full_path),
            'ext'            => strtolower(pathinfo($file_name, PATHINFO_EXTENSION))
        ];
    }

    // Builds the deterministic PNG path used to cache the first-page document preview.
    private function getThumbnailPath($file_name) {
        $directory = trailingslashit($this->new_dir) . '.thumbnails/';
        if (!is_dir($directory)) wp_mkdir_p($directory);
        return $directory . sanitize_file_name(pathinfo($file_name, PATHINFO_FILENAME)) . '.png';
    }

    // Creates or refreshes a first-page PDF thumbnail with Ghostscript and returns its path.
    private function ensureDocumentThumbnail($file_name, $source) {
        if (!is_file($source)) return '';
        $thumbnail = $this->getThumbnailPath($file_name);
        if (is_file($thumbnail) && filemtime($thumbnail) >= filemtime($source)) return $thumbnail;

        $renderer = trim((string) shell_exec('command -v gs 2>/dev/null'));
        if ($renderer === '') return '';
        $command = escapeshellarg($renderer)
            . ' -q -dSAFER -dBATCH -dNOPAUSE -dFirstPage=1 -dLastPage=1'
            . ' -sDEVICE=pngalpha -r96 -sOutputFile=' . escapeshellarg($thumbnail)
            . ' ' . escapeshellarg($source);
        exec($command, $output, $exit_code);
        if ($exit_code !== 0 || !is_file($thumbnail)) {
            if (is_file($thumbnail)) @unlink($thumbnail);
            return '';
        }
        return $thumbnail;
    }

    // Resolves a requested PDF to its authenticated cached thumbnail file.
    public function getThumbnailByPath($slug) {
        $detail = $this->getFileDetailByPath($slug);
        if (is_wp_error($detail)) return $detail;
        $source = wp_upload_dir()['basedir'] . '/' . $detail['relative_path'];
        $thumbnail = $this->ensureDocumentThumbnail($detail['name'], $source);
        if (!$thumbnail || !is_file($thumbnail)) {
            return new \WP_Error('thumbnail_not_found', 'Không thể tạo thumbnail cho tài liệu.', ['status' => 404]);
        }
        return ['path' => $thumbnail, 'name' => $detail['name']];
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public static function normalizeDocumentFiles($value) {
        $items = is_array($value) ? $value : [$value];
        $normalized = [];

        foreach ($items as $item) {
            if (!is_string($item)) continue;
            $clean = sanitize_text_field($item);
            if ($clean !== '' && !in_array($clean, $normalized, true)) {
                $normalized[] = $clean;
            }
        }

        return $normalized;
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public function bulkAssignMeta($order_ids, $relative_path, $doc_type) {
        $meta_key = '_assigned_doc_' . sanitize_text_field($doc_type);
        $type_map = ['invoice' => 'vatDocument', 'quotation' => 'orderDocument', 'delivery' => 'deliveryDocument'];
        $legacy_map = ['vatDocument' => 'vatdoc', 'orderDocument' => 'cus_orders', 'deliveryDocument' => 'delivery_doc'];
        $target_key = $type_map[$doc_type] ?? $doc_type;
        $legacy_key = $legacy_map[$target_key] ?? null;
        $is_multi = ($target_key === 'deliveryDocument');
        $incoming_files = self::normalizeDocumentFiles($relative_path);
        $success_count = 0;

        foreach ($order_ids as $order_id) {
            $order = wc_get_order(absint($order_id));
            if (!$order) continue;
            $current_docs = $order->get_meta('orders', true);
            $current_docs = is_array($current_docs) ? $current_docs : [];

            if (empty($incoming_files)) {
                $value = $is_multi ? [] : '';
            } elseif ($is_multi) {
                $existing_raw = $current_docs[$target_key] ?? ($legacy_key ? ($current_docs[$legacy_key] ?? []) : []);
                $value = array_values(array_unique(array_merge(self::normalizeDocumentFiles($existing_raw), $incoming_files)));
            } else {
                $value = $incoming_files[0];
            }

            $order->update_meta_data($meta_key, $value ?: '');
            $current_docs[$target_key] = $value;
            if ($legacy_key && isset($current_docs[$legacy_key])) unset($current_docs[$legacy_key]);
            $order->update_meta_data('orders', $current_docs);
            $order->save();
            $success_count++;
        }
        return $success_count;
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public function bulkUnassignMeta($order_ids, $doc_type, $relative_path = '') {
        $clean_target_path = is_string($relative_path) ? sanitize_text_field($relative_path) : '';
        if ($clean_target_path === '') return $this->bulkAssignMeta($order_ids, '', $doc_type);

        $meta_key = '_assigned_doc_' . sanitize_text_field($doc_type);
        $type_map = ['invoice' => 'vatDocument', 'quotation' => 'orderDocument', 'delivery' => 'deliveryDocument'];
        $legacy_map = ['vatDocument' => 'vatdoc', 'orderDocument' => 'cus_orders', 'deliveryDocument' => 'delivery_doc'];
        $target_key = $type_map[$doc_type] ?? $doc_type;
        $legacy_key = $legacy_map[$target_key] ?? null;
        $is_multi = ($target_key === 'deliveryDocument');
        $success_count = 0;

        foreach ($order_ids as $order_id) {
            $order = wc_get_order(absint($order_id));
            if (!$order) continue;
            $current_docs = $order->get_meta('orders', true);
            $current_docs = is_array($current_docs) ? $current_docs : [];
            $existing_raw = $current_docs[$target_key] ?? ($legacy_key ? ($current_docs[$legacy_key] ?? []) : []);
            $remaining = array_values(array_filter(
                self::normalizeDocumentFiles($existing_raw),
                fn($file) => $file !== $clean_target_path
            ));
            $value = $is_multi ? $remaining : ($remaining[0] ?? '');
            $order->update_meta_data($meta_key, $value ?: '');
            $current_docs[$target_key] = $value;
            if ($legacy_key && isset($current_docs[$legacy_key])) unset($current_docs[$legacy_key]);
            $order->update_meta_data('orders', $current_docs);
            $order->save();
            $success_count++;
        }
        return $success_count;
    }
    // Defines getNewDirPath method behavior for DocumentModel.php.
    public function getNewDirPath() {
        return $this->new_dir;
    }

    // Defines getNewRelativePrefix method behavior for DocumentModel.php.
    public function getNewRelativePrefix() {
        return $this->new_relative_prefix;
    }

    /* Executes documented symbol logic in DocumentModel.php. */
    public function getOrdersWithoutDoc($doc_type) {
        $type_map = [
            'invoice'   => 'vatDocument',
            'quotation' => 'orderDocument',
            'delivery'  => 'deliveryDocument'
        ];
        $target_key = $type_map[$doc_type] ?? $doc_type;

        // Executes documented symbol logic in DocumentModel.php.
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

            // Executes documented symbol logic in DocumentModel.php.
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

    /* Executes documented symbol logic in DocumentModel.php. */
    public function getFileDetailByPath($slug) {
        // Executes documented symbol logic in DocumentModel.php.
        $is_debug = defined('WP_DEBUG') && WP_DEBUG;

        // Executes documented symbol logic in DocumentModel.php.
        $clean_slug = basename(urldecode($slug));

        if ($is_debug) error_log('getFileDetailByPath: Processing slug: ' . $clean_slug);

        $filename = $clean_slug;
        if (substr(strtolower($filename), -4) !== '.pdf') {
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

    /* Executes documented symbol logic in DocumentModel.php. */
    public function deleteFileSafely($path) {
        $clean_path = wp_normalize_path(sanitize_text_field($path));

        // Executes documented symbol logic in DocumentModel.php.
        if (strpos($clean_path, '..') !== false || empty($clean_path)) {
            return new \WP_Error('security_error', 'Đường dẫn file không hợp lệ hoặc không an toàn.', ['status' => 400]);
        }

        $upload_dir = wp_upload_dir();
        $absolute_path = wp_normalize_path($upload_dir['basedir'] . '/' . $clean_path);

        // Executes documented symbol logic in DocumentModel.php.
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

        // Executes documented symbol logic in DocumentModel.php.
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
