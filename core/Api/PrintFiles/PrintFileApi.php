<?php

namespace App\Api\PrintFiles;

use App\Api\Api;
use App\Models\PrintFiles\PrintFileModel;
use WP_REST_Request;

if (!defined('ABSPATH')) {
    exit;
}

class PrintFileApi extends Api {
    protected static $instance;

    public static function get_instance() {
        if (is_null(self::$instance)) self::$instance = new self();
        return self::$instance;
    }

    public function __construct() {
        self::$instance = $this;
        $this->model = new PrintFileModel();
        parent::__construct();
    }

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

    public function permission(WP_REST_Request $request) {
        return $this->checkJwtAndCapability(
            $request,
            'edit_shop_orders',
            'Bạn không có quyền quản lý file in.'
        );
    }

    public function listFiles(WP_REST_Request $request) {
        return $this->sendSuccess($this->model->listAssets($request->get_param('page'), $request->get_param('count'), $request->get_param('search')));
    }

    public function listMaterials() {
        $result = $this->model->listMaterials();
        return is_wp_error($result) ? $result : $this->sendSuccess(['materials' => $result]);
    }

    public function listPrintOptions() {
        $result = $this->model->listPrintOptions();
        return is_wp_error($result) ? $result : $this->sendSuccess($result);
    }

    public function uploadFile(WP_REST_Request $request) {
        $result = $this->model->uploadAsset($_FILES['file'] ?? null);
        return is_wp_error($result) ? $result : $this->sendSuccess($this->model->assetPayloadForApi($result), 'Tải file in thành công.', 201);
    }

    public function getFile(WP_REST_Request $request) {
        $result = $this->model->getAsset($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess($this->model->assetPayloadForApi($result));
    }

    public function deleteFile(WP_REST_Request $request) {
        $result = $this->model->deleteAsset($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã xóa file khỏi thư viện.');
    }

    public function listJobs(WP_REST_Request $request) {
        $result = $this->model->getOrderJobs($request->get_param('order_id'));
        return is_wp_error($result) ? $result : $this->sendSuccess($result);
    }

    public function createJob(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->createJob($request->get_param('order_id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã gắn file và lưu phiếu in.', 201);
    }

    public function createProductTicket(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->createProductTicket($request->get_param('order_id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã lưu phiếu thành phẩm.', 201);
    }

    public function detachAsset(WP_REST_Request $request) {
        $result = $this->model->detachAssetFromOrder(
            $request->get_param('order_id'),
            $request->get_param('asset_id')
        );
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ file khỏi đơn hàng.');
    }

    public function updateJob(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->updateJob($request->get_param('id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã cập nhật phiếu in.');
    }

    public function updateProductTicket(WP_REST_Request $request) {
        $data = $request->get_json_params();
        $result = $this->model->updateProductTicket($request->get_param('id'), is_array($data) ? $data : []);
        return is_wp_error($result) ? $result : $this->sendSuccess($result, 'Đã cập nhật phiếu thành phẩm.');
    }

    public function deleteJob(WP_REST_Request $request) {
        $result = $this->model->deleteJob($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ file khỏi đơn hàng.');
    }

    public function deleteProductTicket(WP_REST_Request $request) {
        $result = $this->model->deleteProductTicket($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ phiếu thành phẩm.');
    }

    public function deletePrintTicket(WP_REST_Request $request) {
        $result = $this->model->deletePrintTicket($request->get_param('id'));
        return is_wp_error($result) ? $result : $this->sendSuccess(null, 'Đã gỡ phiếu in.');
    }

    public function thumbnail(WP_REST_Request $request) {
        return $this->streamBinary($request->get_param('id'), 'thumbnail', 'image/png', '', true);
    }

    public function stream(WP_REST_Request $request) {
        $asset = $this->model->getAsset($request->get_param('id'));
        if (is_wp_error($asset)) return $asset;
        return $this->streamBinary($request->get_param('id'), 'original', $asset['mime_type'] ?: 'application/octet-stream', $asset['original_name']);
    }

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
