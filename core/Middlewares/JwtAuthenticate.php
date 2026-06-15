<?php
namespace App\Middlewares;

use App\Controllers\Authenticate\JwtController;
use App\Support\AuthSupport;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use WP_REST_Request;
use WP_Error;
use WP_User;

class JwtAuthenticate {

   public static function JwtAuthenticate(WP_REST_Request $request) {
      // 1. Lấy và kiểm tra Header Authorization
      $auth_header = $request->get_header('authorization');
      if ( ! preg_match('/Bearer\s+(.+)/i',  $auth_header, $matches) ) {
        return new WP_Error('rest_forbidden', 'Định dạng Authorization phải là Bearer Token.', array('status' => 401));
      }

      $token = trim($matches[1], '"');

      if ( empty($token) ) {
         return new WP_Error('rest_forbidden', 'Token không được để trống.', array('status' => 401));
      }

      try {
         // 2. Giải mã Token
         $payload = JWT::decode($token, new Key(SECRET_KEY_DOCUMENT, 'HS256'));
         
         if (!isset($payload->sub) || !is_numeric($payload->sub)) {
            return new WP_Error('rest_forbidden', 'Token không hợp lệ.', array('status' => 401));
         } 

         $userId = (int) $payload->sub;
         $user = get_userdata($userId);

         // 3. Kiểm tra người dùng có tồn tại không
         if (!$user instanceof WP_User) {
            return new WP_Error('rest_forbidden', 'Người dùng không tồn tại trên hệ thống.', array('status' => 401));
         }

         // 4. Kiểm tra quyền truy cập (Dựa trên dữ liệu DB thực tế để đảm bảo an toàn)
         if (!AuthSupport::is_allowed_role($user)) {
            return new WP_Error('rest_forbidden', 'Bạn không có quyền truy cập vào tài nguyên này.', array('status' => 403));
         }

         // 5. Kiểm tra xem đã cài đặt API Key chưa
         if (!AuthSupport::has_required_settings($userId)) {
            return new WP_Error('rest_forbidden', 'Tài khoản chưa được cấu hình thông tin API Key/Secret.', array('status' => 403));
         }

         // 5. THIẾT LẬP CURRENT USER CHO WORDPRESS
         // Giúp các hàm current_user_can() hoạt động chính xác trong REST API
         wp_set_current_user($userId);
         $request->set_param('current_user_id', $userId);

         return true;

      } catch (\Exception $e) {
         return new WP_Error('rest_forbidden', 'Token đã hết hạn hoặc không hợp lệ: ' . $e->getMessage(), array('status' => 401));
      }
   }
}
