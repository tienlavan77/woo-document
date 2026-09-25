<?php
namespace App\Api\Setting;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use App\Models\Setting\SettingModel;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error; 
/**
 * SettingApi class handles the API endpoints related to settings.
 * It extends the base Api class and provides methods to register routes
 * and handle requests for settings.
 */
class SettingApi extends Api {
   
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
            
   /**
    * Registers the routes for the Setting API.
    * Defines routes for getting all settings, saving settings, deleting settings,
    * and getting a specific setting by its name.
    */
   public function routesRegister() {
      register_rest_route(
         self::$namespace, 
         '/settings/company', 
         [
            [ 'methods' => 'GET', 
               'callback' => [$this,'getCompanySetting'],
               'permission_callback' => [$this, 'adminPermission']
            ],
            [
               'methods' => 'POST', 
               'callback' => [$this,'setCompanySetting'],
               'permission_callback' => [$this, 'adminPermission']
            ],            
         ]
      );
      register_rest_route(
         self::$namespace,
         '/settings/system',
         [
            [
               'methods' => 'GET',
               'callback' => [$this, 'getSystemSetting'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
            [
               'methods' => 'POST',
               'callback' => [$this, 'setSystemSetting'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
         ]
      );
      register_rest_route(
         self::$namespace,
         '/settings/system/browse',
         [
            [
               'methods' => 'GET',
               'callback' => [$this, 'browseSystemFolder'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
         ]
      );
      register_rest_route( 
         self::$namespace, 
         '/settings/user',
         [
            [
               'methods' => 'GET', 
               'callback' => [$this,'getUserSetting'],
               'permission_callback' =>[JwtAuthenticate::class, 'JwtAuthenticate']
            ],
            [
               'methods' => 'POST', 
               'callback' => [$this,'setUserSetting'],
               'permission_callback' =>[JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
   }

   public function adminPermission(WP_REST_Request $request) {
      $authenticated = JwtAuthenticate::JwtAuthenticate($request);
      if (is_wp_error($authenticated)) {
         return $authenticated;
      }

      if (!current_user_can('manage_options')) {
         return new WP_Error('rest_forbidden', 'Chỉ admin mới được quản lý cấu hình này.', ['status' => 403]);
      }

      return true;
   }

   /**
    * Admin-only system folder settings.
    */
   public function getSystemSetting(WP_REST_Request $request) {
      return new WP_REST_Response([
         'status' => [
            'code' => 200,
            'message' => 'Lấy cấu hình System thành công.',
            'data' => SettingModel::getSystemSetting(),
         ],
      ], 200);
   }

   public function setSystemSetting(WP_REST_Request $request) {
      $data = $request->get_json_params();
      $result = SettingModel::setSystemSetting(is_array($data) ? $data : []);

      if (is_wp_error($result)) {
         return $result;
      }

      return new WP_REST_Response([
         'status' => [
            'code' => 200,
            'message' => 'Lưu cấu hình System thành công.',
            'data' => $result,
         ],
      ], 200);
   }

   public function browseSystemFolder(WP_REST_Request $request) {
      $result = SettingModel::browseSystemFolder($request->get_param('path'));
      if (is_wp_error($result)) {
         return $result;
      }

      return new WP_REST_Response([
         'status' => [
            'code' => 200,
            'message' => 'Lấy danh sách folder thành công.',
            'data' => $result,
         ],
      ], 200);
   }

   /**
    * Handles the request to get all settings. 
    * It decodes the JWT to get the user ID and retrieves the settings for that user.
    * 
    * @param WP_REST_Request $req The request object.
    * @return array The list of settings.
    */
   public function getCompanySetting(WP_REST_Request $requets) {  
     
      $status = [];      
      $result = SettingModel::getCompanySetting();     
      if ($result === false) {
         $status = ['status'=>['code'=> 201, 'message'=>'Read failed', 'data'=>[]]];
      } else {
         $status = ['status'=>['code'=> 200, 'message'=>'Read successfully', 'data'=> json_decode($result)]];      
      } 
  
      return new WP_REST_Response( $status, 200);
      
   }
   
   public function setCompanySetting(WP_REST_Request $requets){
      // data chuẩn ['status'=> ['code' => 200, 'message'=>'Write successfully', 'data'=> $data]]
      $status = [];
      $data = json_decode($requets->get_body());

      if (empty($data)) {
         $status = ['status'=>['code'=> 201, 'message'=>'No data', 'data'=>[]]];

      } else {
         $result = SettingModel::setCompanySetting($data);  
         if ($result === false) 
            $status = ['status'=>['code'=> 202, 'message'=>'Write failed or data not changed', 'data'=>$data]];         
         else 
            $status = ['status'=>['code'=> 200, 'message'=>'Write successfully', 'data'=>$data]];
      }

      return new WP_REST_Response($status, 200);  
   }
   
   public function getUserSetting(WP_REST_Request $requets) {
      $status = [];
      $userId = $requets->get_param('current_user_id');
      
      $result = SettingModel::getUserSetting($userId);
      if (empty($result)) { 
         $status = ['status'=>['code'=> 201, 'message'=>'not exist data', 'data'=> $result]];
      } else {
         $status = ['status'=>['code'=> 200, 'message'=>'get data successfully', 'data'=> $result]];
      }

      return new WP_REST_Response($status, 200);   
   }

   public function setUserSetting(WP_REST_Request $requets) {
      $status = [];
     
      $userId = $requets->get_param('current_user_id'); 
      $data = json_decode($requets->get_body());

      if (empty($data)) {
         $status = ['status'=>['code'=> 202, 'message'=>'No data', 'data'=>[]]];

      } else {
         $result = SettingModel::setUserSetting($userId, $data);
         if ($result === false) 
            $status = ['status'=>['code'=> 201, 'message'=>'Write failed or data not changed', 'data'=> $data]];
         else 
            $status = ['status'=>['code'=> 200, 'message'=>'update successfully', 'data'=> $data]];
      }
      return new WP_REST_Response($status, 200);
   }
}
