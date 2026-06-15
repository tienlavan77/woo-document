<?php
namespace App\Controllers\Authenticate;

use Firebase\JWT\JWT;
use DateTimeImmutable;
use Exception;

class JwtController {
   protected static $instance;
   private $directto;
   public static function get_instance() {
      if (is_null(self::$instance)) {
          self::$instance = new self();
      }
      return self::$instance;
   }

   public function __construct() {
     
   }
 
   public static function createJWTToken($user) {        
      
      try {
         $date = new DateTimeImmutable();
         $issued_at = $date->getTimestamp();
         // SỬA ĐỔI BẢO MẬT: Đặt thời gian hết hạn (ví dụ: 1 ngày)
         $expire_at = $date->modify('+30 day')->getTimestamp(); 
         
         $userName = $user->user_login;  
         $role = $user->roles[0];
         
         $payload = [
             'iat'  => $issued_at,                  // Issued at: thời gian tạo token
             'nbf'  => $issued_at,                  // Not before: không sử dụng trước thời gian này
             'exp'  => $expire_at,                  // SỬA ĐỔI QUAN TRỌNG: Expire time (Hết hạn)
             'sub'  => $user->ID,                   // Subject: Sử dụng 'sub' (Subject) cho ID người dùng
             'userName' => $userName,
             'role' => $role,           
         ];
         
         // BẢO MẬT: Tránh đưa 'user_pass' (hash) vào payload
         
         // SỬ DỤNG SECRET_KEY CỦA WP HOẶC MỘT KEY KHÁC CỰC KỲ MẠNH
         $jwt = JWT::encode( $payload, SECRET_KEY_DOCUMENT , 'HS256'); 
      } catch (Exception $e) {
         // Log lỗi
         error_log("Error creating JWT: " . $e->getMessage());
         throw new Exception("Could not create JWT."); // Ném ngoại lệ để xử lý ở tầng trên
      }
      return ['exp' => $expire_at , 'token' =>  $jwt, 'type' => $type];      
   }

}
