<?php
namespace App\Controllers;

use WP_REST_Response;
use WP_Error;

/**
 * Controller
 * Cung cấp các phương thức helper để chuẩn hóa phản hồi API (thành công/thất bại).
 * Các Controller khác nên kế thừa từ lớp này.
 */
class Controller {

    /**
     * Helper function để gửi phản hồi thành công theo cấu trúc chuẩn.
     *
     * @param mixed  $data    Dữ liệu cần trả về.
     * @param string $message Thông báo thành công.
     * @param int    $status  Mã trạng thái HTTP (mặc định 200).
     * @return WP_REST_Response
     */
    protected function sendSuccess($data = null, $message = 'Thành công.', $status = 200) {
        return new WP_REST_Response([
            'status' => [
                'code'    => $status,
                'message' => $message,
                'data'    => $data
            ]
        ], $status);
    }
 
    /**
     * Helper function để gửi phản hồi lỗi chuẩn WP_Error.
     * WordPress REST API sẽ tự động chuyển WP_Error thành JSON lỗi.
     *
     * @param string $code    Mã lỗi duy nhất (ví dụ: 'missing_param').
     * @param string $message Thông báo lỗi dễ đọc.
     * @param int    $status  Mã trạng thái HTTP (mặc định 400).
     * @param mixed  $details Dữ liệu chi tiết lỗi bổ sung (tùy chọn).
     * @return WP_Error
     */
    protected function sendError($code, $message, $status = 400, $details = null) {
        return new WP_Error($code, $message, ['status' => $status, 'details' => $details]);
    }
}