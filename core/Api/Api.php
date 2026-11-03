<?php

namespace App\Api;

use App\Middlewares\JwtAuthenticate;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

if (!defined('ABSPATH')) {
   exit;
}

class Api {

   /**
    * @var string $namespace The namespace for the API routes.
    */
   public static $namespace = NAME_SPACE_DOCUMENT;
   public $route;
   public $model;

   /**
    * Constructor method that initializes the API routes.
    */
   public function __construct() {
      $this->routesRegister();
   }

   /**
    * Method to register the API routes.
    * This method should be overridden in child classes to define specific routes.
    */
   public function routesRegister() {
      return true;
   }

   /**
    * Helper chuẩn hóa phản hồi thành công theo cấu trúc status.{code, message, data}.
    *
    * @param mixed    $data       Dữ liệu trả về trong status.data.
    * @param string   $message    Thông báo trạng thái.
    * @param int      $statusCode Mã trạng thái trong status.code (mặc định 200).
    * @param int|null $httpStatus Mã HTTP response (mặc định lấy theo $statusCode).
    * @param bool     $includeData Có đưa trường 'data' vào status hay không.
    * @return WP_REST_Response
    */
   protected function sendSuccess($data = null, $message = 'Thành công.', $statusCode = 200, $httpStatus = null, $includeData = true) {
      $httpStatus = $httpStatus ?? $statusCode;
      $statusPayload = [
         'code'    => $statusCode,
         'message' => $message,
      ];

      if ($includeData) {
         $statusPayload['data'] = $data;
      }

      return new WP_REST_Response([
         'status' => $statusPayload,
      ], $httpStatus);
   }

   /**
    * Helper chuẩn hóa phản hồi lỗi WP_Error.
    *
    * @param string $code    Mã lỗi định danh.
    * @param string $message Thông báo lỗi.
    * @param int    $status  Mã trạng thái HTTP (mặc định 400).
    * @param mixed  $details Chi tiết lỗi bổ sung (tùy chọn).
    * @return WP_Error
    */
   protected function sendError($code, $message, $status = 400, $details = null) {
      $errorData = ['status' => $status];
      if (!is_null($details)) {
         $errorData['details'] = $details;
      }
      return new WP_Error($code, $message, $errorData);
   }

   /**
    * Helper kiểm tra xác thực JWT kết hợp capability của WordPress.
    *
    * @param WP_REST_Request $request
    * @param string|null     $capability
    * @param string          $forbiddenMessage
    * @return bool|WP_Error
    */
   protected function checkJwtAndCapability(WP_REST_Request $request, $capability = null, $forbiddenMessage = 'Bạn không có quyền thực hiện thao tác này.') {
      $authenticated = JwtAuthenticate::JwtAuthenticate($request);
      if (is_wp_error($authenticated)) {
         return $authenticated;
      }
      if (!$authenticated) {
         return false;
      }

      if ($capability && !current_user_can($capability)) {
         return $this->sendError('rest_forbidden', $forbiddenMessage, 403);
      }

      return true;
   }

   /**
    * Helper function để định nghĩa các tham số cho việc lấy danh sách (collection).
    *
    * @return array
    */
   public function getCollectionParams() {
      return [
         'page' => [
            'description'       => 'Trang hiện tại của danh sách.',
            'type'              => 'integer',
            'default'           => 1,
            'sanitize_callback' => 'absint',
            'validate_callback' => fn($param) => is_numeric($param) && $param > 0
         ],
         'count' => [
            'description'       => 'Số lượng item trên mỗi trang.',
            'type'              => 'integer',
            'default'           => 10,
            'sanitize_callback' => 'absint',
            'validate_callback' => fn($param) => is_numeric($param) && $param > 0
         ],
      ];
   }
}
