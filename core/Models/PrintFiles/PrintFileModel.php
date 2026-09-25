<?php
namespace App\Models\PrintFiles;

use App\Support\PrintDatabase;
use App\Support\SystemFolderManager;
use App\Models\Setting\CompanySettingModel;
use App\Models\Setting\UserSettingModel;
use WP_Error;

/**
 * Storage and persistence for print assets and order print jobs.
 */
class PrintFileModel {
    private const ORIGINALS_DIR = 'originals';
    private const THUMBNAILS_DIR = 'thumbnails';
    private const THUMBNAIL_WIDTH = 900;

    public function listAssets($page = 1, $per_page = 24, $search = '') {
        global $wpdb;

        $page = max(1, absint($page));
        $per_page = min(100, max(1, absint($per_page)));
        $offset = ($page - 1) * $per_page;
        $table = PrintDatabase::assetsTable();
        $where = "deleted_at IS NULL";
        $params = [];

        if ($search !== '') {
            $where .= ' AND original_name LIKE %s';
            $params[] = '%' . $wpdb->esc_like(sanitize_text_field($search)) . '%';
        }

        $count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where}";
        $total = (int) ($params ? $wpdb->get_var($wpdb->prepare($count_sql, $params)) : $wpdb->get_var($count_sql));

        $params[] = $per_page;
        $params[] = $offset;
        $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d";
        $rows = $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A);

        return [
            'files' => array_map([$this, 'assetPayload'], $rows ?: []),
            'total_count' => $total,
            'has_more' => ($offset + $per_page) < $total,
            'page' => $page,
            'per_page' => $per_page,
        ];
    }

    public function listMaterials() {
        return $this->listTerms('pa_chat-lieu');
    }

    public function listPrintOptions() {
        $taxonomies = [
            'materials' => 'pa_chat-lieu',
            'printing_methods' => 'pa_hinh-thuc-in',
            'print_sides' => 'pa_so-mat-in',
            'laminations' => 'pa_can-mang',
            'product_forms' => 'pa_thanh-pham',
        ];
        $options = [];

        foreach ($taxonomies as $key => $taxonomy) {
            $terms = $this->listTerms($taxonomy);
            if (is_wp_error($terms)) return $terms;
            $options[$key] = $terms;
        }

        $options['suppliers'] = $this->listSuppliers();

        return $options;
    }

    private function listSuppliers() {
        $users = get_users([
            'role' => 'supplier',
            'orderby' => 'display_name',
            'order' => 'ASC',
        ]);

        return array_map(static function ($user) {
            $company = trim((string) get_user_meta($user->ID, 'billing_company', true));
            $address_parts = array_filter([
                trim((string) get_user_meta($user->ID, 'billing_address_1', true)),
                trim((string) get_user_meta($user->ID, 'billing_address_2', true)),
                trim((string) get_user_meta($user->ID, 'billing_city', true)),
                trim((string) get_user_meta($user->ID, 'billing_state', true)),
            ]);
            $email = trim((string) get_user_meta($user->ID, 'billing_email', true));
            return [
                'id' => (int) $user->ID,
                'name' => $company ?: ($user->display_name ?: $user->user_login),
                'company' => $company ?: ($user->display_name ?: $user->user_login),
                'address' => implode(', ', $address_parts),
                'phone' => (string) get_user_meta($user->ID, 'billing_phone', true),
                'email' => $email ?: $user->user_email,
            ];
        }, $users ?: []);
    }

    private function listTerms($taxonomy) {
        if (!taxonomy_exists($taxonomy)) return [];

        $terms = get_terms([
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
            'orderby' => 'name',
            'order' => 'ASC',
        ]);
        if (is_wp_error($terms)) return $terms;

        return array_map(static function ($term) {
            return [
                'id' => (int) $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
            ];
        }, $terms ?: []);
    }

    public function getAsset($asset_id) {
        global $wpdb;

        $table = PrintDatabase::assetsTable();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table} WHERE id = %d AND deleted_at IS NULL LIMIT 1",
            absint($asset_id)
        ), ARRAY_A);

        if (!$row) {
            return new WP_Error('print_asset_not_found', 'Không tìm thấy file in.', ['status' => 404]);
        }

        return $row;
    }

    public function assetPayloadForApi(array $row) {
        return $this->assetPayload($row);
    }

    public function uploadAsset($file) {
        global $wpdb;

        if (!is_array($file) || !isset($file['tmp_name'], $file['name'])) {
            return new WP_Error('print_file_missing', 'Vui lòng chọn file AI hoặc PDF.', ['status' => 400]);
        }

        if ((int) ($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            return new WP_Error('print_upload_failed', 'Upload file không thành công.', ['status' => 400]);
        }

        $original_name = sanitize_file_name($file['name']);
        $extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
        if (!in_array($extension, ['ai', 'pdf'], true)) {
            return new WP_Error('print_invalid_type', 'Chỉ cho phép file .ai hoặc .pdf.', ['status' => 400]);
        }

        if (!empty($file['size']) && (int) $file['size'] > wp_max_upload_size()) {
            return new WP_Error('print_file_too_large', 'File vượt quá dung lượng upload cho phép.', ['status' => 400]);
        }

        $directories = $this->ensureDirectories();
        if (is_wp_error($directories)) {
            return $directories;
        }

        $file_name = wp_unique_filename($directories['originals'], $original_name);
        $original_path = trailingslashit($directories['originals']) . $file_name;
        if (!move_uploaded_file($file['tmp_name'], $original_path)) {
            return new WP_Error('print_move_failed', 'Không thể lưu file vào Print folder.', ['status' => 500]);
        }

        $sha256 = hash_file('sha256', $original_path) ?: '';
        $existing_id = $wpdb->get_var($wpdb->prepare(
            'SELECT id FROM ' . PrintDatabase::assetsTable() . ' WHERE sha256 = %s AND deleted_at IS NULL LIMIT 1',
            $sha256
        ));
        if ($existing_id) {
            @unlink($original_path);
            return $this->getAsset($existing_id);
        }

        $thumbnail_name = 'thumb-' . ($sha256 ?: md5($file_name)) . '.png';
        $thumbnail_key = self::THUMBNAILS_DIR . '/' . $thumbnail_name;
        $thumbnail_path = trailingslashit($directories['thumbnails']) . $thumbnail_name;
        $thumbnail = $this->createThumbnail($original_path, $thumbnail_path, $extension);
        $dimensions = $this->readDimensions($original_path, $extension, $thumbnail['path'] ?? '');
        $now = gmdate('Y-m-d H:i:s');

        $inserted = $wpdb->insert(
            PrintDatabase::assetsTable(),
            [
                'original_name' => $file_name,
                'storage_key' => self::ORIGINALS_DIR . '/' . $file_name,
                'thumbnail_key' => $thumbnail['status'] === 'ready' ? $thumbnail_key : '',
                'extension' => $extension,
                'mime_type' => $this->detectMime($original_path, $extension),
                'size_bytes' => (int) filesize($original_path),
                'sha256' => $sha256,
                'page_count' => $dimensions['page_count'],
                'width' => $dimensions['width'],
                'height' => $dimensions['height'],
                'thumbnail_status' => $thumbnail['status'],
                'thumbnail_error' => $thumbnail['error'],
                'created_by' => get_current_user_id(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            ['%s', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%d', '%s', '%s', '%d', '%s', '%s']
        );

        if (!$inserted) {
            @unlink($original_path);
            if ($thumbnail['path']) @unlink($thumbnail['path']);
            return new WP_Error('print_asset_save_failed', 'Không thể lưu thông tin file in.', ['status' => 500]);
        }

        return $this->getAsset($wpdb->insert_id);
    }

    public function getOrderJobs($order_id) {
        global $wpdb;

        $order = wc_get_order(absint($order_id));
        if (!$order) {
            return new WP_Error('order_not_found', 'Không tìm thấy đơn hàng.', ['status' => 404]);
        }

        $jobs = $wpdb->get_results($wpdb->prepare(
            'SELECT j.*, p.id AS print_ticket_id, p.document_status AS print_ticket_status, p.specs_json AS print_ticket_specs_json,
                    a.original_name, a.storage_key, a.thumbnail_key, a.extension, a.mime_type, a.size_bytes, a.page_count, a.width, a.height, a.thumbnail_status, a.thumbnail_error
             FROM ' . PrintDatabase::jobsTable() . ' j
             LEFT JOIN ' . PrintDatabase::ticketsTable() . ' p ON p.order_id = j.order_id AND p.asset_id = j.asset_id
             INNER JOIN ' . PrintDatabase::assetsTable() . ' a ON a.id = j.asset_id
             WHERE j.order_id = %d AND a.deleted_at IS NULL
             ORDER BY j.created_at DESC, j.id DESC',
            absint($order_id)
        ), ARRAY_A);

        return [
            'jobs' => array_map([$this, 'jobPayload'], $jobs ?: []),
            'order_items' => $this->getOrderItemsPayload($order),
            'template_context' => $this->getPrintTemplateContext($order),
        ];
    }

    /**
     * Keep document header data in the same authenticated response as the order.
     * This avoids exposing the admin-only company settings endpoint to order users.
     */
    private function getPrintTemplateContext($order) {
        $company = CompanySettingModel::get();
        if (is_string($company)) $company = json_decode($company, true);
        if (is_object($company)) $company = (array) $company;
        if (!is_array($company)) $company = [];

        $user = UserSettingModel::get(get_current_user_id());
        if (is_object($user)) $user = (array) $user;
        if (!is_array($user)) $user = [];

        return [
            'company' => [
                'name' => (string) ($company['name'] ?? ''),
                'address' => (string) ($company['address'] ?? ''),
                'taxcode' => (string) ($company['taxcode'] ?? ''),
                'phone' => (string) ($company['phone'] ?? ''),
                'email' => (string) ($company['email'] ?? ''),
                'stamp' => esc_url_raw((string) ($company['stamp'] ?? '')),
            ],
            'user' => [
                'signature' => esc_url_raw((string) ($user['signature'] ?? '')),
            ],
            'order' => [
                'id' => $order ? (int) $order->get_id() : 0,
                'number' => $order ? (string) $order->get_order_number() : '',
            ],
        ];
    }

    private function getOrderItemsPayload($order) {
        $items = [];
        foreach ($order->get_items('line_item') as $item) {
            $product = method_exists($item, 'get_product') ? $item->get_product() : false;
            $dimensions = $product ? $this->getProductDimensions($product) : [];
            $items[] = [
                'id' => (int) $item->get_id(),
                'name' => $item->get_name(),
                'width_cm' => (float) ($dimensions['width_cm'] ?? 0),
                'height_cm' => (float) ($dimensions['height_cm'] ?? 0),
                'image_url' => $product && $product->get_image_id()
                    ? (string) wp_get_attachment_image_url($product->get_image_id(), 'full')
                    : '',
            ];
        }
        return $items;
    }

    public function createJob($order_id, array $data) {
        global $wpdb;

        $order_id = absint($order_id);
        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Không tìm thấy đơn hàng.', ['status' => 404]);
        }

        $asset = $this->getAsset($data['asset_id'] ?? 0);
        if (is_wp_error($asset)) return $asset;

        $order_item_id = absint($data['order_item_id'] ?? 0);
        if ($order_item_id && !$order->get_item($order_item_id)) {
            return new WP_Error('order_item_not_found', 'Sản phẩm trong đơn hàng không tồn tại.', ['status' => 400]);
        }

        $document_type = sanitize_key($data['document_type'] ?? '');
        $duplicate = $wpdb->get_var($wpdb->prepare(
            'SELECT id FROM ' . PrintDatabase::jobsTable() . ' WHERE asset_id = %d AND order_id = %d AND order_item_id = %d LIMIT 1',
            absint($data['asset_id']),
            $order_id,
            $order_item_id
        ));
        if ($duplicate) {
            // A print ticket is shared by every product job for the same file.
            if (in_array($document_type, ['print', 'both'], true) && !empty($data['create_document'])) {
                $print_specs = $this->extractSpecs($data['specs'] ?? [], 'print');
                $saved = $this->savePrintTicket($order_id, absint($data['asset_id']), $print_specs, 'ready');
                if (is_wp_error($saved)) return $saved;
            }
            if ($document_type === 'both' && !empty($data['create_document'])) {
                return $this->updateJob($duplicate, $data);
            }
            if ($document_type === 'product' && !empty($data['create_document'])) {
                return $this->updateJob($duplicate, $data);
            }
            $existing_job = $this->getJob($duplicate);
            if (is_wp_error($existing_job)) return $existing_job;
            return $existing_job;
        }

        $normalized_specs = $this->normalizeSpecs($data['specs'] ?? []);
        $product_specs = $this->extractSpecs($normalized_specs, 'product');
        $print_specs = $this->extractSpecs($normalized_specs, 'print');
        $product_status = in_array($document_type, ['product', 'both'], true) && !empty($data['create_document']) ? 'ready' : 'not_created';
        if (!$document_type && !empty($data['create_document'])) $product_status = 'ready';
        $ticket = $this->ensurePrintTicket($order_id, absint($data['asset_id']));
        if (is_wp_error($ticket)) return $ticket;
        if (in_array($document_type, ['print', 'both'], true) && !empty($data['create_document'])) {
            $ticket = $this->savePrintTicket($order_id, absint($data['asset_id']), $print_specs, 'ready');
            if (is_wp_error($ticket)) return $ticket;
        }
        $print_status = $ticket['document_status'];
        $document_status = $print_status === 'ready' && $product_status === 'ready'
            ? 'ready'
            : ($print_status === 'ready' || $product_status === 'ready' ? 'partial' : 'not_created');
        $now = gmdate('Y-m-d H:i:s');
        $inserted = $wpdb->insert(
            PrintDatabase::jobsTable(),
            [
                'order_id' => $order_id,
                'order_item_id' => $order_item_id,
                'asset_id' => absint($data['asset_id']),
                'quantity' => (float) ($data['quantity'] ?? 1),
                'status' => 'draft',
                'document_status' => $document_status,
                'document_key' => '',
                'print_document_status' => $ticket['document_status'],
                'product_document_status' => $product_status,
                'specs_json' => wp_json_encode($product_specs),
                'sheet_snapshot_json' => $product_status === 'ready' ? wp_json_encode($product_specs) : '',
                'created_by' => get_current_user_id(),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            ['%d', '%d', '%d', '%f', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s']
        );

        if (!$inserted) {
            return new WP_Error('print_job_save_failed', 'Không thể gắn file vào đơn hàng.', ['status' => 500]);
        }

        return $this->getJob($wpdb->insert_id);
    }

    public function updateJob($job_id, array $data) {
        global $wpdb;

        $job = $this->getJob($job_id);
        if (is_wp_error($job)) return $job;

        $document_type = sanitize_key($data['document_type'] ?? 'product');
        $is_print_only = $document_type === 'print';
        $order_item_id = $is_print_only
            ? absint($job['order_item_id'])
            : (array_key_exists('order_item_id', $data) ? absint($data['order_item_id']) : absint($job['order_item_id']));
        if ($order_item_id) {
            $order = wc_get_order($job['order_id']);
            if (!$order || !$order->get_item($order_item_id)) {
                return new WP_Error('order_item_not_found', 'Sản phẩm trong đơn hàng không tồn tại.', ['status' => 400]);
            }
        }

        $duplicate = $is_print_only ? 0 : $wpdb->get_var($wpdb->prepare(
            'SELECT id FROM ' . PrintDatabase::jobsTable() . ' WHERE asset_id = %d AND order_id = %d AND order_item_id = %d AND id <> %d LIMIT 1',
            absint($job['asset_id']),
            absint($job['order_id']),
            $order_item_id,
            absint($job_id)
        ));
        if ($duplicate) {
            return new WP_Error('print_job_duplicate', 'File này đã có phiếu cho sản phẩm được chọn.', ['status' => 409]);
        }

        $incoming_specs = array_key_exists('specs', $data)
            ? $this->normalizeSpecs($data['specs'])
            : ($job['specs'] ?? []);
        $print_ticket = $job['print_ticket'] ?? [];
        $print_status = $print_ticket['document_status'] ?? 'not_created';
        $product_status = $job['product_document_status'] ?? (($job['document_status'] ?? '') === 'ready' ? 'ready' : 'not_created');

        if (!empty($data['create_document']) && $document_type === 'print') {
            $print_status = 'ready';
        } elseif (!empty($data['create_document']) && $document_type === 'product') {
            $product_status = 'ready';
        } elseif (!empty($data['create_document']) && ($document_type === 'both' || $document_type === '')) {
            $print_status = 'ready';
            $product_status = 'ready';
        }

        if (!empty($data['create_document']) && $document_type === 'print') {
            $print_ticket = $this->savePrintTicket($job['order_id'], $job['asset_id'], $this->extractSpecs($incoming_specs, 'print'), 'ready');
            if (is_wp_error($print_ticket)) return $print_ticket;
            return $this->getJob($job_id);
        }

        if (!empty($data['create_document']) && $document_type === 'both') {
            $print_ticket = $this->savePrintTicket($job['order_id'], $job['asset_id'], $this->extractSpecs($incoming_specs, 'print'), 'ready');
            if (is_wp_error($print_ticket)) return $print_ticket;
        }

        $existing_specs = is_array($job['specs'] ?? null) ? $job['specs'] : [];
        $specs = $this->mergeSpecs($existing_specs, $incoming_specs, 'product');
        $document_status = $print_status === 'ready' && $product_status === 'ready'
            ? 'ready'
            : ($print_status === 'ready' || $product_status === 'ready' ? 'partial' : 'not_created');
        $snapshot = $job['sheet_snapshot'] ?? '';
        if (is_array($snapshot)) $snapshot = wp_json_encode($snapshot);
        $updated = $wpdb->update(
            PrintDatabase::jobsTable(),
            [
                'order_item_id' => $order_item_id,
                'quantity' => (float) ($data['quantity'] ?? $job['quantity']),
                'status' => sanitize_key($data['status'] ?? $job['status']),
                'document_status' => $document_status,
                'print_document_status' => $print_ticket['document_status'] ?? $print_status,
                'product_document_status' => $product_status,
                'specs_json' => wp_json_encode($specs),
                'sheet_snapshot_json' => $document_status === 'ready' ? wp_json_encode($specs) : $snapshot,
                'updated_at' => gmdate('Y-m-d H:i:s'),
            ],
            ['id' => absint($job_id)],
            ['%d', '%f', '%s', '%s', '%s', '%s', '%s', '%s', '%s'],
            ['%d']
        );

        if ($updated === false) {
            return new WP_Error('print_job_update_failed', 'Không thể cập nhật phiếu in.', ['status' => 500]);
        }

        return $this->getJob($job_id);
    }

    public function deleteJob($job_id) {
        global $wpdb;

        $job = $this->getJob($job_id);
        if (is_wp_error($job)) return $job;

        if (false === $wpdb->delete(PrintDatabase::jobsTable(), ['id' => absint($job_id)], ['%d'])) {
            return new WP_Error('print_job_delete_failed', 'Không thể gỡ file khỏi đơn hàng.', ['status' => 500]);
        }

        $remaining = (int) $wpdb->get_var($wpdb->prepare(
            'SELECT COUNT(*) FROM ' . PrintDatabase::jobsTable() . ' WHERE order_id = %d AND asset_id = %d',
            absint($job['order_id']),
            absint($job['asset_id'])
        ));
        if (!$remaining) {
            $wpdb->delete(PrintDatabase::ticketsTable(), [
                'order_id' => absint($job['order_id']),
                'asset_id' => absint($job['asset_id']),
            ], ['%d', '%d']);
        }

        return true;
    }

    public function deletePrintTicket($job_id) {
        global $wpdb;

        $job = $this->getJob($job_id);
        if (is_wp_error($job)) return $job;

        $deleted = $wpdb->delete(PrintDatabase::ticketsTable(), [
            'order_id' => absint($job['order_id']),
            'asset_id' => absint($job['asset_id']),
        ], ['%d', '%d']);
        if ($deleted === false) {
            return new WP_Error('print_ticket_delete_failed', 'Không thể gỡ phiếu in.', ['status' => 500]);
        }

        return true;
    }

    private function ensurePrintTicket($order_id, $asset_id) {
        global $wpdb;

        $table = PrintDatabase::ticketsTable();
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table} WHERE order_id = %d AND asset_id = %d LIMIT 1",
            absint($order_id),
            absint($asset_id)
        ), ARRAY_A);
        if ($row) return $this->printTicketPayload($row);

        $now = gmdate('Y-m-d H:i:s');
        $inserted = $wpdb->insert($table, [
            'order_id' => absint($order_id),
            'asset_id' => absint($asset_id),
            'document_status' => 'not_created',
            'specs_json' => '',
            'created_by' => get_current_user_id(),
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%d', '%d', '%s', '%s', '%d', '%s', '%s']);
        if (!$inserted) return new WP_Error('print_ticket_save_failed', 'Không thể tạo phiếu in.', ['status' => 500]);

        return $this->ensurePrintTicket($order_id, $asset_id);
    }

    private function savePrintTicket($order_id, $asset_id, array $specs, $status = 'ready') {
        $ticket = $this->ensurePrintTicket($order_id, $asset_id);
        if (is_wp_error($ticket)) return $ticket;

        global $wpdb;
        $updated = $wpdb->update(
            PrintDatabase::ticketsTable(),
            [
                'document_status' => $status,
                'specs_json' => wp_json_encode($specs),
                'updated_at' => gmdate('Y-m-d H:i:s'),
            ],
            ['id' => absint($ticket['id'])],
            ['%s', '%s', '%s'],
            ['%d']
        );
        if ($updated === false) return new WP_Error('print_ticket_update_failed', 'Không thể lưu phiếu in.', ['status' => 500]);

        return $this->ensurePrintTicket($order_id, $asset_id);
    }

    private function mergeSpecs(array $existing, array $incoming, $document_type) {
        if ($document_type === 'print') {
            $keys = ['supplier', 'material', 'width', 'height', 'print_size', 'printing_method', 'color_count', 'color_type', 'print_sheet_quantity', 'proof_quantity', 'print_sides', 'print_plan', 'print_note'];
        } elseif ($document_type === 'product') {
            $keys = ['supplier', 'product_width', 'product_height', 'product_form', 'lamination', 'product_sides', 'product_quantity', 'packaging', 'product_note'];
        } else {
            $keys = array_keys($incoming);
        }

        foreach ($keys as $key) {
            if (array_key_exists($key, $incoming)) $existing[$key] = $incoming[$key];
        }
        return $this->normalizeSpecs($existing);
    }

    private function extractSpecs($specs, $type) {
        $normalized = $this->normalizeSpecs($specs);
        $keys = $type === 'print'
            ? ['supplier', 'material', 'width', 'height', 'print_size', 'printing_method', 'color_count', 'color_type', 'print_sheet_quantity', 'proof_quantity', 'print_sides', 'print_plan', 'print_note']
            : ['supplier', 'product_width', 'product_height', 'product_form', 'lamination', 'product_sides', 'product_quantity', 'packaging', 'product_note'];
        $result = [];
        foreach ($keys as $key) $result[$key] = $normalized[$key] ?? '';
        return $this->normalizeSpecs($result);
    }

    public function deleteAsset($asset_id) {
        global $wpdb;

        $asset = $this->getAsset($asset_id);
        if (is_wp_error($asset)) return $asset;

        $usage = (int) $wpdb->get_var($wpdb->prepare(
            'SELECT COUNT(*) FROM ' . PrintDatabase::jobsTable() . ' WHERE asset_id = %d',
            absint($asset_id)
        ));
        if ($usage > 0) {
            return new WP_Error('print_asset_in_use', 'Không thể xóa file đang được gắn vào đơn hàng.', ['status' => 409]);
        }

        $original = $this->getAssetFilePath($asset_id, 'original');
        $thumbnail = $asset['thumbnail_key'] ? $this->getAssetFilePath($asset_id, 'thumbnail') : '';
        if (is_wp_error($original)) $original = '';
        if (is_wp_error($thumbnail)) $thumbnail = '';

        $updated = $wpdb->update(
            PrintDatabase::assetsTable(),
            ['deleted_at' => gmdate('Y-m-d H:i:s'), 'updated_at' => gmdate('Y-m-d H:i:s')],
            ['id' => absint($asset_id)],
            ['%s', '%s'],
            ['%d']
        );
        if ($updated === false) {
            return new WP_Error('print_asset_delete_failed', 'Không thể xóa file khỏi thư viện.', ['status' => 500]);
        }

        if ($original && is_file($original)) @unlink($original);
        if ($thumbnail && is_file($thumbnail)) @unlink($thumbnail);
        return true;
    }

    public function getJob($job_id) {
        global $wpdb;

        $row = $wpdb->get_row($wpdb->prepare(
            'SELECT j.*, p.id AS print_ticket_id, p.document_status AS print_ticket_status, p.specs_json AS print_ticket_specs_json,
                    a.original_name, a.storage_key, a.thumbnail_key, a.extension, a.mime_type, a.size_bytes, a.page_count, a.width, a.height, a.thumbnail_status, a.thumbnail_error
             FROM ' . PrintDatabase::jobsTable() . ' j
             LEFT JOIN ' . PrintDatabase::ticketsTable() . ' p ON p.order_id = j.order_id AND p.asset_id = j.asset_id
             INNER JOIN ' . PrintDatabase::assetsTable() . ' a ON a.id = j.asset_id
             WHERE j.id = %d AND a.deleted_at IS NULL LIMIT 1',
            absint($job_id)
        ), ARRAY_A);

        if (!$row) return new WP_Error('print_job_not_found', 'Không tìm thấy phiếu in.', ['status' => 404]);
        return $this->jobPayload($row);
    }

    public function getAssetFilePath($asset_id, $kind = 'original') {
        $asset = $this->getAsset($asset_id);
        if (is_wp_error($asset)) return $asset;

        $directories = $this->ensureDirectories();
        if (is_wp_error($directories)) return $directories;

        $key = $kind === 'thumbnail' ? $asset['thumbnail_key'] : $asset['storage_key'];
        if (!$key) return new WP_Error('print_file_unavailable', 'File chưa có bản xem trước.', ['status' => 404]);

        $root = $kind === 'thumbnail' ? $directories['thumbnails'] : $directories['originals'];
        $path = trailingslashit($root) . basename($key);
        if (!is_file($path)) return new WP_Error('print_file_missing', 'File không còn tồn tại trên ổ đĩa.', ['status' => 404]);
        return $path;
    }

    private function assetPayload(array $row) {
        $id = absint($row['id']);
        return [
            'id' => $id,
            'name' => $row['original_name'],
            'extension' => strtolower($row['extension']),
            'mime_type' => $row['mime_type'],
            'size_bytes' => (int) $row['size_bytes'],
            'size' => size_format((int) $row['size_bytes']),
            'page_count' => (int) $row['page_count'],
            'width' => (int) $row['width'],
            'height' => (int) $row['height'],
            'thumbnail_status' => $row['thumbnail_status'],
            'thumbnail_error' => $row['thumbnail_error'],
            'thumbnail_url' => rest_url(NAME_SPACE_DOCUMENT . '/print-files/' . $id . '/thumbnail'),
            'preview_url' => rest_url(NAME_SPACE_DOCUMENT . '/print-files/' . $id . '/stream'),
            'created_at' => $row['created_at'],
        ];
    }

    private function jobPayload(array $row) {
        $specs = json_decode((string) ($row['specs_json'] ?? ''), true);
        $print_specs = json_decode((string) ($row['print_ticket_specs_json'] ?? ''), true);
        $snapshot = json_decode((string) ($row['sheet_snapshot_json'] ?? ''), true);
        $print_status = !empty($row['print_ticket_id'])
            ? (string) $row['print_ticket_status']
            : 'not_created';
        $product_status = $row['product_document_status'] ?? (($row['document_status'] ?? '') === 'ready' ? 'ready' : 'not_created');
        $document_status = $print_status === 'ready' && $product_status === 'ready'
            ? 'ready'
            : ($print_status === 'ready' || $product_status === 'ready' ? 'partial' : 'not_created');
        $payload = [
            'id' => absint($row['id']),
            'order_id' => absint($row['order_id']),
            'order_item_id' => absint($row['order_item_id']),
            'asset_id' => absint($row['asset_id']),
            'quantity' => (float) $row['quantity'],
            'status' => $row['status'],
            'document_status' => $document_status,
            'print_document_status' => $print_status,
            'product_document_status' => $product_status,
            'specs' => is_array($specs) ? $specs : [],
            'print_specs' => is_array($print_specs) ? $print_specs : [],
            'print_ticket' => [
                'id' => absint($row['print_ticket_id'] ?? 0),
                'document_status' => $print_status,
                'specs' => is_array($print_specs) ? $print_specs : [],
            ],
            'sheet_snapshot' => is_array($snapshot) ? $snapshot : [],
            'product_dimensions' => $this->getOrderItemDimensions($row['order_id'], $row['order_item_id']),
        ];

        $payload['asset'] = $this->assetPayload([
            'id' => $row['asset_id'],
            'original_name' => $row['original_name'],
            'extension' => $row['extension'],
            'mime_type' => $row['mime_type'],
            'size_bytes' => $row['size_bytes'],
            'page_count' => $row['page_count'],
            'width' => $row['width'],
            'height' => $row['height'],
            'thumbnail_status' => $row['thumbnail_status'],
            'thumbnail_error' => $row['thumbnail_error'],
            'thumbnail_key' => $row['thumbnail_key'],
            'created_at' => $row['created_at'] ?? '',
        ]);

        return $payload;
    }

    private function printTicketPayload(array $row) {
        $specs = json_decode((string) ($row['specs_json'] ?? ''), true);
        return [
            'id' => absint($row['id']),
            'order_id' => absint($row['order_id']),
            'asset_id' => absint($row['asset_id']),
            'document_status' => $row['document_status'],
            'specs' => is_array($specs) ? $specs : [],
        ];
    }

    private function getOrderItemDimensions($order_id, $order_item_id) {
        if (!absint($order_item_id)) return [];

        $order = wc_get_order(absint($order_id));
        $item = $order ? $order->get_item(absint($order_item_id)) : false;
        $product = $item && method_exists($item, 'get_product') ? $item->get_product() : false;
        if (!$product) return [];

        return $this->getProductDimensions($product);
    }

    private function getProductDimensions($product) {
        $unit = get_option('woocommerce_dimension_unit', 'cm');
        $length = $product->get_length();
        $width = $product->get_width();

        return [
            // The print form labels product length as width and product width as height.
            'width_cm' => $length !== '' ? (float) wc_get_dimension((float) $length, $unit, 'cm') : 0,
            'height_cm' => $width !== '' ? (float) wc_get_dimension((float) $width, $unit, 'cm') : 0,
        ];
    }

    private function ensureDirectories() {
        $folder = SystemFolderManager::getFolder('print_folder');
        if (!$folder) return new WP_Error('print_folder_missing', 'Print folder chưa được cấu hình.', ['status' => 500]);

        $root = trailingslashit($folder['absolute_path']);
        $originals = $root . self::ORIGINALS_DIR;
        $thumbnails = $root . self::THUMBNAILS_DIR;
        if ((!is_dir($originals) && !wp_mkdir_p($originals)) || (!is_dir($thumbnails) && !wp_mkdir_p($thumbnails))) {
            return new WP_Error('print_folder_unwritable', 'Không thể tạo thư mục lưu file in.', ['status' => 500]);
        }

        if (!is_writable($originals) || !is_writable($thumbnails)) {
            return new WP_Error('print_folder_unwritable', 'Print folder không có quyền ghi.', ['status' => 500]);
        }

        return ['root' => $root, 'originals' => $originals, 'thumbnails' => $thumbnails];
    }

    private function createThumbnail($source, $destination, $extension) {
        $renderer = $this->findBinary('gs');
        if (!$renderer) {
            return ['status' => 'failed', 'error' => 'Không tìm thấy Ghostscript trên máy chủ.', 'path' => ''];
        }

        $command = escapeshellarg($renderer)
            . ' -q -dSAFER -dBATCH -dNOPAUSE -dFirstPage=1 -dLastPage=1'
            . ' -sDEVICE=pngalpha -r96 -sOutputFile=' . escapeshellarg($destination)
            . ' ' . escapeshellarg($source);
        [$exit_code, $output] = $this->runCommand($command);
        if ($exit_code !== 0 || !is_file($destination)) {
            return [
                'status' => 'failed',
                'error' => trim($output) ?: 'Không thể tạo thumbnail từ file.',
                'path' => '',
            ];
        }

        $resized = $this->resizeThumbnail($destination);
        if (!$resized) {
            return ['status' => 'failed', 'error' => 'Không thể chuẩn hóa kích thước thumbnail.', 'path' => ''];
        }

        return ['status' => 'ready', 'error' => '', 'path' => $destination];
    }

    private function resizeThumbnail($path) {
        if (!function_exists('imagecreatefrompng') || !function_exists('imagecreatetruecolor')) return true;
        $source = @imagecreatefrompng($path);
        if (!$source) return false;

        $width = imagesx($source);
        $height = imagesy($source);
        if (!$width || !$height) {
            imagedestroy($source);
            return false;
        }

        $scale = self::THUMBNAIL_WIDTH / $width;
        $target_width = self::THUMBNAIL_WIDTH;
        $target_height = max(1, (int) round($height * $scale));
        $target = imagecreatetruecolor($target_width, $target_height);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 255, 255, 255, 127);
        imagefill($target, 0, 0, $transparent);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $target_width, $target_height, $width, $height);
        $success = imagepng($target, $path, 6);
        imagedestroy($source);
        imagedestroy($target);
        return $success;
    }

    private function readDimensions($path, $extension, $thumbnail_path = '') {
        $result = ['page_count' => $extension === 'pdf' ? 1 : 0, 'width' => 0, 'height' => 0];
        $binary = $this->findBinary('pdfinfo');
        if ($binary && ($extension === 'pdf' || $extension === 'ai')) {
            [$exit_code, $output] = $this->runCommand(escapeshellarg($binary) . ' ' . escapeshellarg($path));
            if ($exit_code === 0) {
                if (preg_match('/^Pages:\s+(\d+)/mi', $output, $matches)) $result['page_count'] = (int) $matches[1];
                if (preg_match('/^Page size:\s+([0-9.]+)\s+x\s+([0-9.]+)/mi', $output, $matches)) {
                    $result['width'] = (int) round((float) $matches[1]);
                    $result['height'] = (int) round((float) $matches[2]);
                }
            }
        }

        if ($extension === 'ai' && (!$result['width'] || !$result['height'])) {
            $content = @file_get_contents($path, false, null, 0, 65536);
            if ($content && preg_match('/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/', $content, $matches)) {
                $result['width'] = abs((int) $matches[3] - (int) $matches[1]);
                $result['height'] = abs((int) $matches[4] - (int) $matches[2]);
            }
        }

        if ((!$result['width'] || !$result['height']) && $thumbnail_path && function_exists('getimagesize')) {
            $image = @getimagesize($thumbnail_path);
            if ($image) {
                $result['width'] = (int) $image[0];
                $result['height'] = (int) $image[1];
            }
        }

        return $result;
    }

    private function normalizeSpecs($specs) {
        if (!is_array($specs)) $specs = [];
        $supplier_id = absint($specs['supplier'] ?? 0);
        $supplier = $supplier_id ? get_user_by('id', $supplier_id) : false;
        if (!$supplier || !in_array('supplier', (array) $supplier->roles, true)) {
            $supplier_id = 0;
        }

        return [
            'supplier' => $supplier_id,
            'material' => sanitize_text_field($specs['material'] ?? ''),
            'width' => (float) ($specs['width'] ?? 0),
            'height' => (float) ($specs['height'] ?? 0),
            'print_size' => sanitize_text_field($specs['print_size'] ?? ''),
            'colors' => sanitize_text_field($specs['colors'] ?? ''),
            'color_count' => (float) ($specs['color_count'] ?? 0),
            'color_type' => sanitize_text_field($specs['color_type'] ?? ''),
            'printing_method' => sanitize_text_field($specs['printing_method'] ?? ''),
            'print_sheet_quantity' => (float) ($specs['print_sheet_quantity'] ?? 0),
            'proof_quantity' => (float) ($specs['proof_quantity'] ?? 0),
            'print_sides' => sanitize_text_field($specs['print_sides'] ?? ''),
            'print_plan' => sanitize_text_field($specs['print_plan'] ?? ''),
            'print_note' => sanitize_textarea_field($specs['print_note'] ?? ''),
            'finishing' => sanitize_text_field($specs['finishing'] ?? ''),
            'note' => sanitize_textarea_field($specs['note'] ?? ''),
            'product_width' => (float) ($specs['product_width'] ?? 0),
            'product_height' => (float) ($specs['product_height'] ?? 0),
            'product_form' => sanitize_text_field($specs['product_form'] ?? ''),
            'lamination' => sanitize_text_field($specs['lamination'] ?? ''),
            'product_sides' => sanitize_text_field($specs['product_sides'] ?? ''),
            'product_quantity' => (float) ($specs['product_quantity'] ?? 0),
            'packaging' => sanitize_text_field($specs['packaging'] ?? ''),
            'product_note' => sanitize_textarea_field($specs['product_note'] ?? ''),
        ];
    }

    private function detectMime($path, $extension) {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = $finfo ? finfo_file($finfo, $path) : '';
            if ($finfo) finfo_close($finfo);
            if ($mime) return $mime;
        }
        return $extension === 'pdf' ? 'application/pdf' : 'application/postscript';
    }

    private function findBinary($name) {
        foreach (['/usr/bin/' . $name, '/usr/local/bin/' . $name, '/bin/' . $name] as $candidate) {
            if (is_executable($candidate)) return $candidate;
        }
        return '';
    }

    private function runCommand($command) {
        if (!function_exists('proc_open')) return [1, 'proc_open is disabled.'];
        $pipes = [];
        $process = proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($process)) return [1, 'Không thể khởi chạy trình xử lý file.'];
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exit_code = proc_close($process);
        return [$exit_code, trim($stdout . "\n" . $stderr)];
    }
}
