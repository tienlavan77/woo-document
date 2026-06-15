<?php
namespace App\Api\Authenticate;

use App\Api\Api;
use App\Controllers\Authenticate\JwtController;
use App\Support\AuthSupport;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error; 

class AuthenticateApi extends Api {
   
   protected static $instance;   

   /**
    * Singleton pattern to get the instance of SettingApi.
    * 
    * @return SettingApi
    */
   public static function get_instance(){
      if( is_null( self::$instance ) ){
         self::$instance = new self();
      }
      return self::$instance;
   }

   public function routesRegister() {
      register_rest_route(
         self::$namespace, 
         '/auth/login', 
         [
            [
               'methods' => 'POST', 
               'callback' => [$this,'authenticateLogin'],
               'permission_callback' => '__return_true',   
             
            ],            
         ]
      );    
   }

   public function authenticateLogin(WP_REST_Request $request) {
      $username = trim($request->get_param('username'));
      $password = trim($request->get_param('password'));

      if (empty($username) || empty($password)) {
         return new WP_REST_Response([
             'status' => [
                 'code'    => 400,
                 'message' => 'Vui lòng cung cấp đầy đủ tài khoản và mật khẩu.'
             ]
         ], 400);
     }

     // 2. Sử dụng cơ chế xác thực gốc bảo mật của WordPress
      $creds = array(
         'user_login'    => $username,
         'user_password' => $password,
         'remember'      => true
      );   
        
      // Hàm này tự kiểm tra hash password, brute force...
      $user = wp_signon($creds, is_ssl());
     
        // Nếu sai tài khoản hoặc mật khẩu
        if (is_wp_error($user)) {
            return new WP_REST_Response([
                'status' => ['code' => 401, 'message' => 'Tài khoản hoặc mật khẩu không chính xác.']
            ], 401);
        }

        if (!AuthSupport::is_allowed_role($user)) {
            return new WP_REST_Response([
                'status' => ['code' => 403, 'message' => 'Bạn không có quyền truy cập vào hệ thống này.']
            ], 403);
        }

        try {
            $token = JwtController::createJWTToken($user);
            return new WP_REST_Response([
                'status' => ['code' => 200, 'message' => 'Login successfully', 'data' => $token]
            ], 200);
        } catch (\Exception $e) {
            error_log("[Auth API Error]: Không thể sinh Token JWT: " . $e->getMessage());
            return new WP_REST_Response([
                'status' => ['code' => 500, 'message' => 'Lỗi hệ thống khi tạo token.']
            ], 500);
        }
   }
}
