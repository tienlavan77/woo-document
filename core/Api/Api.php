<?php
// Provides module declarations and business logic for Api.php.


namespace App\Api;

use App\Middlewares\JwtAuthenticate;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

if (!defined('ABSPATH')) {
   exit;
}

// Defines Api class behavior for Api.php.
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

   /* Executes documented symbol logic in Api.php. */
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

   /* Executes documented symbol logic in Api.php. */
   protected function sendError($code, $message, $status = 400, $details = null) {
      $errorData = ['status' => $status];
      if (!is_null($details)) {
         $errorData['details'] = $details;
      }
      return new WP_Error($code, $message, $errorData);
   }

   /* Executes documented symbol logic in Api.php. */
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

   /* Executes documented symbol logic in Api.php. */
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
