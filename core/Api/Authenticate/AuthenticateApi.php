<?php

namespace App\Api\Authenticate;

use App\Api\Api;
use App\Controllers\Authenticate\JwtController;
use App\Support\AuthSupport;
use WP_REST_Request;

if (!defined('ABSPATH')) {
   exit;
}

class AuthenticateApi extends Api {

   protected static $instance;

   /**
    * Singleton pattern to get the instance of AuthenticateApi.
    *
    * @return AuthenticateApi
    */
   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

   public function __construct() {
      self::$instance = $this;
      parent::__construct();
   }

   public function routesRegister() {
      register_rest_route(
         self::$namespace,
         '/auth/login',
         [
            [
               'methods'             => 'POST',
               'callback'            => [$this, 'authenticateLogin'],
               'permission_callback' => '__return_true',
            ],
         ]
      );
   }

   public function authenticateLogin(WP_REST_Request $request) {
      $username = trim((string) $request->get_param('username'));
      $password = trim((string) $request->get_param('password'));

      if (empty($username) || empty($password)) {
         return $this->sendSuccess(null, 'Vui lòng cung cấp đầy đủ tài khoản và mật khẩu.', 400, 400, false);
      }

      // Sử dụng cơ chế xác thực gốc bảo mật của WordPress
      $creds = [
         'user_login'    => $username,
         'user_password' => $password,
         'remember'      => true
      ];

      $user = wp_signon($creds, is_ssl());

      if (is_wp_error($user)) {
         return $this->sendSuccess(null, 'Tài khoản hoặc mật khẩu không chính xác.', 401, 401, false);
      }

      if (!AuthSupport::is_allowed_role($user)) {
         return $this->sendSuccess(null, 'Bạn không có quyền truy cập vào hệ thống này.', 403, 403, false);
      }

      try {
         $token = JwtController::createJWTToken($user);
         return $this->sendSuccess($token, 'Login successfully', 200);
      } catch (\Exception $e) {
         error_log("[Auth API Error]: Không thể sinh Token JWT: " . $e->getMessage());
         return $this->sendSuccess(null, 'Lỗi hệ thống khi tạo token.', 500, 500, false);
      }
   }
}
