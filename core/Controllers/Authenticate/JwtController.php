<?php
// Provides module declarations and business logic for JwtController.php.

namespace App\Controllers\Authenticate;

use Firebase\JWT\JWT;
use DateTimeImmutable;
use Exception;

// Defines JwtController class behavior for JwtController.php.
class JwtController {
   protected static $instance;
   private $directto;
   // Defines get_instance method behavior for JwtController.php.
   public static function get_instance() {
      if (is_null(self::$instance)) {
          self::$instance = new self();
      }
      return self::$instance;
   }

   // Defines __construct method behavior for JwtController.php.
   public function __construct() {
     
   }
 
   // Defines createJWTToken method behavior for JwtController.php.
   public static function createJWTToken($user) {        
      
      try {
         $date = new DateTimeImmutable();
         $issued_at = $date->getTimestamp();
         // Executes documented symbol logic in JwtController.php.
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
         
         // Executes documented symbol logic in JwtController.php.
         
         // Executes documented symbol logic in JwtController.php.
         $jwt = JWT::encode( $payload, SECRET_KEY_DOCUMENT , 'HS256'); 
      } catch (Exception $e) {
         // Executes documented symbol logic in JwtController.php.
         error_log("Error creating JWT: " . $e->getMessage());
         throw new Exception("Could not create JWT."); // Ném ngoại lệ để xử lý ở tầng trên
      }
      $type = 'Bearer';
      return ['exp' => $expire_at , 'token' =>  $jwt, 'type' => $type];      
   }

}
