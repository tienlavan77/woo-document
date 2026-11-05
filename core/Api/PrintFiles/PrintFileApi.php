<?php
// Provides module declarations and business logic for PrintFileApi.php.


namespace App\Api\PrintFiles;

use App\Api\Api;
use App\Models\PrintFiles\PrintFileModel;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

// Defines PrintFileApi class behavior for PrintFileApi.php.
class PrintFileApi extends Api {
    protected static $instance;

    // Defines get_instance method behavior for PrintFileApi.php.
    public static function get_instance() {
        if (is_null(self::$instance)) self::$instance = new self();
        return self::$instance;
    }

    // Defines __construct method behavior for PrintFileApi.php.
    public function __construct() {
        self::$instance = $this;
        $this->model = new PrintFileModel();
        parent::__construct();
    }

    // Defines routesRegister method behavior for PrintFileApi.php.
    public function routesRegister() {
        register_rest_route(self::$namespace, '/print-files', [
            ['methods' => 'GET', 'callback' => [$this, 'listFiles'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-materials', [
            ['methods' => 'GET', 'callback' => [$this, 'listMaterials'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-options', [
            ['methods' => 'GET', 'callback' => [$this, 'listPrintOptions'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-files/upload', [
            ['methods' => 'POST', 'callback' => [$this, 'uploadFile'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-files/(?P<id>\d+)/thumbnail', [
            ['methods' => 'GET', 'callback' => [$this, 'thumbnail'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-files/(?P<id>\d+)/stream', [
            ['methods' => 'GET', 'callback' => [$this, 'stream'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-files/(?P<id>\d+)', [
            ['methods' => 'GET', 'callback' => [$this, 'getFile'], 'permission_callback' => [$this, 'permission']],
            ['methods' => 'DELETE', 'callback' => [$this, 'deleteFile'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/orders/(?P<order_id>\d+)/print-jobs', [
            ['methods' => 'GET', 'callback' => [$this, 'listJobs'], 'permission_callback' => [$this, 'permission']],
            ['methods' => 'POST', 'callback' => [$this, 'createJob'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/orders/(?P<order_id>\d+)/product-tickets', [
            ['methods' => 'POST', 'callback' => [$this, 'createProductTicket'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/orders/(?P<order_id>\d+)/print-files/(?P<asset_id>\d+)', [
            ['methods' => 'DELETE', 'callback' => [$this, 'detachAsset'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-jobs/(?P<id>\d+)', [
            ['methods' => ['PUT', 'PATCH'], 'callback' => [$this, 'updateJob'], 'permission_callback' => [$this, 'permission']],
            ['methods' => 'DELETE', 'callback' => [$this, 'deleteJob'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/product-tickets/(?P<id>\d+)', [
            ['methods' => ['PUT', 'PATCH'], 'callback' => [$this, 'updateProductTicket'], 'permission_callback' => [$this, 'permission']],
            ['methods' => 'DELETE', 'callback' => [$this, 'deleteProductTicket'], 'permission_callback' => [$this, 'permission']],
        ]);
        register_rest_route(self::$namespace, '/print-jobs/(?P<id>\d+)/print-ticket', [
            ['methods' => 'DELETE', 'callback' => [$this, 'deletePrintTicket'], 'permission_callback' => [$this, 'permission']],
        ]);
    }

    // Defines permission method behavior for PrintFileApi.php.
    public function permission(WP_REST_Request $request) {
        return $this->checkJwtAndCapability(
            $request,
            'edit_shop_orders',
            'Bạn không có quyền quản lý file in.'
        );
    }

    // Defines listFiles method behavior for PrintFileApi.php.
    public function listFiles(WP_REST_Request $request) {
        return $this->sendSuccess($this->model->listAssets($request->get_param('page'), $request->get_param('count'), $request->get_param('search')));
    }

    // Defines listMaterials method behavior for PrintFileApi.php.
    public function listMaterials() {
        $result = $this->model->listMaterials();
        return is_wp_error($result) ? $result : $this->sendSuccess(['materials' => $result]);
    }

    // Defines listPrintOptions method behavior for PrintFileApi.php.
    public function listPrintOptions() {
        $result = $this->model->listPrintOptions();
        return is_wp_error($result) ? $result : $this->sendSuccess($result);
    }

    // Defines uploadFile method behavior for PrintFileApi.php.
    public function uploadFile(WP_REST_Request $request) {
        $result = $this->model->uploadAsset($_FILES['file'] ?? null);
        return is_wp_error($result) ? $result : $this->sendSuccess($this->model->assetPayloadForApi($result), 'Tải file in thành công.', 201);
    }

    // Defines getFile method behavior for PrintFileApi.php.
    public function getFile(WP_REST_Request $request) {
        $result = $this->model->getAsset($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess($this->model->assetPayloadForApi($result));
    }

    // Defines deleteFile method behavior for PrintFileApi.php.
    public function deleteFile(WP_REST_Request $request) {
        $result = $this->model->deleteAsset($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã xóa file khỏi thư viện.');
    }

    // Defines listJobs method behavior for PrintFileApi.php.
    public function listJobs(WP_REST_Request $request) {
        $result = $this->model->getOrderJobs($request->get_param('order_id'));
        return is_wp_error($result) ? $result : $this->sendSuccess($result);
    }

    // Defines createJob method behavior for PrintFileApi.php.
    public function createJob(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->createJob($request->get_param('order_id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã gắn file và lưu phiếu in.', 201);
    }

    // Defines createProductTicket method behavior for PrintFileApi.php.
    public function createProductTicket(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->createProductTicket($request->get_param('order_id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã lưu phiếu thành phẩm.', 201);
    }

    // Defines detachAsset method behavior for PrintFileApi.php.
    public function detachAsset(WP_REST_Request $request) {
        $result = $this->model->detachAssetFromOrder(
            $request->get_param('order_id'),
            $request->get_param('asset_id')
        );
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ file khỏi đơn hàng.');
    }

    // Defines updateJob method behavior for PrintFileApi.php.
    public function updateJob(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->updateJob($request->get_param('id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã cập nhật phiếu in.');
    }

    // Defines updateProductTicket method behavior for PrintFileApi.php.
    public function updateProductTicket(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->updateProductTicket($request->get_param('id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã cập nhật phiếu thành phẩm.');
    }

    // Defines deleteJob method behavior for PrintFileApi.php.
    public function deleteJob(WP_REST_Request $request) {
        $result = $this->model->deleteJob($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ file khỏi đơn hàng.');
    }

    // Defines deleteProductTicket method behavior for PrintFileApi.php.
    public function deleteProductTicket(WP_REST_Request $request) {
        $result = $this->model->deleteProductTicket($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ phiếu thành phẩm.');
    }

    // Defines deletePrintTicket method behavior for PrintFileApi.php.
    public function deletePrintTicket(WP_REST_Request $request) {
        $result = $this->model->deletePrintTicket($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ phiếu in.');
    }

    // Defines thumbnail method behavior for PrintFileApi.php.
    public function thumbnail(WP_REST_Request $request) {
        // Re-render once for clients requesting the thumbnail algorithm version.
        if ((string) $request->get_param('thumbnail_version') === '2') {
            global $wpdb;
            $id = absint($request->get_param('id'));
            $model = new \ReflectionClass($this->model);
            $assetMethod = $model->getMethod('getAsset');
            $asset = $assetMethod->invoke($this->model, $id);
            $directoriesMethod = $model->getMethod('ensureDirectories');
            $directories = $directoriesMethod->invoke($this->model);
            if (!is_wp_error($asset) && !is_wp_error($directories)) {
                $source = trailingslashit($directories['originals']) . basename((string) $asset['storage_key']);
                $name = basename((string) $asset['thumbnail_key']) ?: 'thumb-' . (($asset['sha256'] ?: md5($asset['original_name'])) . '.png');
                $destination = trailingslashit($directories['thumbnails']) . $name;
                $createMethod = $model->getMethod('createThumbnail');
                $thumbnail = $createMethod->invoke($this->model, $source, $destination, strtolower((string) $asset['extension']));
                if (($thumbnail['status'] ?? '') === 'ready') {
                    $wpdb->update(\App\Support\PrintDatabase::assetsTable(), [
                        'thumbnail_key' => 'thumbnails/' . $name,
                        'thumbnail_status' => 'ready',
                        'thumbnail_error' => '',
                        'updated_at' => gmdate('Y-m-d H:i:s'),
                    ], ['id' => $id], ['%s', '%s', '%s', '%s'], ['%d']);
                }
            }
        }
        return $this->streamBinary($request->get_param('id'), 'thumbnail', 'image/png', '', true);
    }

    // Defines stream method behavior for PrintFileApi.php.
    public function stream(WP_REST_Request $request) {
        $asset = $this->model->getAsset($request->get_param('id'));
        if (is_wp_error($asset)) return $asset;
        return $this->streamBinary($request->get_param('id'), 'original', $asset['mime_type'] ?: 'application/octet-stream', $asset['original_name']);
    }

    // Defines streamBinary method behavior for PrintFileApi.php.
    private function streamBinary($asset_id, $kind, $mime, $download_name = '', $cacheable = false) {
        $path = $this->model->getAssetFilePath($asset_id, $kind);
        if (is_wp_error($path)) return $path;

        if ($cacheable) {
            // Thumbnail files are content-addressed and do not change in place.
            $etag = '"' . md5($path . '|' . filemtime($path) . '|' . filesize($path)) . '"';
            header('Cache-Control: private, max-age=86400, immutable');
            header('ETag: ' . $etag);
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($path)) . ' GMT');

            if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
                status_header(304);
                exit;
            }
        } else {
            nocache_headers();
        }

        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . sanitize_file_name($download_name ?: basename($path)) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
}
