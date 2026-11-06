<?php
// Provides module declarations and business logic for JwtAuthenticate.php.

namespace App\Middlewares;

use App\Controllers\Authenticate\JwtController;
use App\Support\AuthSupport;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use WP_REST_Request;
use WP_Error;
use WP_User;

// Defines JwtAuthenticate class behavior for JwtAuthenticate.php.
class JwtAuthenticate {

   // Defines JwtAuthenticate method behavior for JwtAuthenticate.php.
   public static function JwtAuthenticate(WP_REST_Request $request, $require_settings = true) {
      // Executes documented symbol logic in JwtAuthenticate.php.
      $auth_header = $request->get_header('authorization');
      if ( ! preg_match('/Bearer\s+(.+)/i',  $auth_header, $matches) ) {
        return new WP_Error('rest_forbidden', 'Định dạng Authorization phải là Bearer Token.', array('status' => 401));
      }

      $token = trim($matches[1], '"');

      if ( empty($token) ) {
         return new WP_Error('rest_forbidden', 'Token không được để trống.', array('status' => 401));
      }

      try {
         // Executes documented symbol logic in JwtAuthenticate.php.
         $payload = JWT::decode($token, new Key(SECRET_KEY_DOCUMENT, 'HS256'));
         
         if (!isset($payload->sub) || !is_numeric($payload->sub)) {
            return new WP_Error('rest_forbidden', 'Token không hợp lệ.', array('status' => 401));
         } 

         $userId = (int) $payload->sub;
         $user = get_userdata($userId);

         // Executes documented symbol logic in JwtAuthenticate.php.
         if (!$user instanceof WP_User) {
            return new WP_Error('rest_forbidden', 'Người dùng không tồn tại trên hệ thống.', array('status' => 401));
         }

         // Executes documented symbol logic in JwtAuthenticate.php.
         if (!AuthSupport::is_allowed_role($user)) {
            return new WP_Error('rest_forbidden', 'Bạn không có quyền truy cập vào tài nguyên này.', array('status' => 403));
         }

         // Executes documented symbol logic in JwtAuthenticate.php.
         if ($require_settings && !AuthSupport::has_required_settings($userId)) {
            return new WP_Error('rest_forbidden', 'Tài khoản chưa được cấu hình thông tin API Key/Secret.', array('status' => 403));
         }

         // Executes documented symbol logic in JwtAuthenticate.php.
         wp_set_current_user($userId);
         $request->set_param('current_user_id', $userId);

         return true;

      } catch (\Exception $e) {
         return new WP_Error('rest_forbidden', 'Token đã hết hạn hoặc không hợp lệ: ' . $e->getMessage(), array('status' => 401));
      }
   }
}
