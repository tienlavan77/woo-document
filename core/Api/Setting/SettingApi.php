<?php
// Provides module declarations and business logic for SettingApi.php.


namespace App\Api\Setting;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use App\Models\Setting\SettingModel;
use WP_REST_Request;

if (!defined('ABSPATH')) {
   exit;
}

// Defines SettingApi class behavior for SettingApi.php.
class SettingApi extends Api {

   protected static $instance;

   /**
    * Singleton pattern to get the instance of SettingApi.
    *
    * @return SettingApi
    */
   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

   // Defines __construct method behavior for SettingApi.php.
   public function __construct() {
      self::$instance = $this;
      parent::__construct();
   }

   /**
    * Registers the routes for the Setting API.
    */
   public function routesRegister() {
      register_rest_route(
         self::$namespace,
         '/settings/company',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this, 'getCompanySetting'],
               'permission_callback' => [$this, 'adminPermission']
            ],
            [
               'methods'             => 'POST',
               'callback'            => [$this, 'setCompanySetting'],
               'permission_callback' => [$this, 'adminPermission']
            ],
         ]
      );
      register_rest_route(
         self::$namespace,
         '/settings/system',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this, 'getSystemSetting'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
            [
               'methods'             => 'POST',
               'callback'            => [$this, 'setSystemSetting'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
         ]
      );
      register_rest_route(
         self::$namespace,
         '/settings/system/browse',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this, 'browseSystemFolder'],
               'permission_callback' => [$this, 'adminPermission'],
            ],
         ]
      );
      register_rest_route(
         self::$namespace,
         '/settings/user',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this, 'getUserSetting'],
               'permission_callback' => [$this, 'userPermission']
            ],
            [
               'methods'             => 'POST',
               'callback'            => [$this, 'setUserSetting'],
               'permission_callback' => [$this, 'userPermission']
            ]
         ]
      );
   }

   // Defines adminPermission method behavior for SettingApi.php.
   public function adminPermission(WP_REST_Request $request) {
      return $this->checkJwtAndCapability(
         $request,
         'manage_options',
         'Chỉ admin mới được quản lý cấu hình này.'
      );
   }

   // Authenticates allowed roles for per-user settings without requiring existing API credentials.
   public function userPermission(WP_REST_Request $request) {
      return JwtAuthenticate::JwtAuthenticate($request, false);
   }

   /**
    * Admin-only system folder settings.
    */
   public function getSystemSetting(WP_REST_Request $request) {
      return $this->sendSuccess(
         SettingModel::getSystemSetting(),
         'Lấy cấu hình System thành công.',
         200
      );
   }

   // Defines setSystemSetting method behavior for SettingApi.php.
   public function setSystemSetting(WP_REST_Request $request) {
      $data = $request->get_json_params();
      $result = SettingModel::setSystemSetting(is_array($data) ? $data : []);

      if (is_wp_error($result)) {
         return $result;
      }

      return $this->sendSuccess(
         $result,
         'Lưu cấu hình System thành công.',
         200
      );
   }

   // Defines browseSystemFolder method behavior for SettingApi.php.
   public function browseSystemFolder(WP_REST_Request $request) {
      $result = SettingModel::browseSystemFolder($request->get_param('path'));
      if (is_wp_error($result)) {
         return $result;
      }

      return $this->sendSuccess(
         $result,
         'Lấy danh sách folder thành công.',
         200
      );
   }

   /**
    * Handles the request to get company settings.
    */
   public function getCompanySetting(WP_REST_Request $request) {
      $result = SettingModel::getCompanySetting();
      if ($result === false) {
         return $this->sendSuccess([], 'Read failed', 201, 200);
      }

      return $this->sendSuccess(json_decode($result), 'Read successfully', 200, 200);
   }

   // Defines setCompanySetting method behavior for SettingApi.php.
   public function setCompanySetting(WP_REST_Request $request) {
      $data = json_decode($request->get_body());

      if (empty($data)) {
         return $this->sendSuccess([], 'No data', 201, 200);
      }

      $result = SettingModel::setCompanySetting($data);
      if ($result === false) {
         return $this->sendSuccess($data, 'Write failed or data not changed', 202, 200);
      }

      return $this->sendSuccess($data, 'Write successfully', 200, 200);
   }

   // Defines getUserSetting method behavior for SettingApi.php.
   public function getUserSetting(WP_REST_Request $request) {
      $userId = $request->get_param('current_user_id');

      $result = SettingModel::getUserSetting($userId);
      if (empty($result)) {
         return $this->sendSuccess($result, 'not exist data', 201, 200);
      }

      return $this->sendSuccess($result, 'get data successfully', 200, 200);
   }

   // Defines setUserSetting method behavior for SettingApi.php.
   public function setUserSetting(WP_REST_Request $request) {
      $userId = $request->get_param('current_user_id');
      $data = json_decode($request->get_body());

      if (empty($data)) {
         return $this->sendSuccess([], 'No data', 202, 200);
      }

      $result = SettingModel::setUserSetting($userId, $data);
      if ($result === false) {
         return $this->sendSuccess($data, 'Write failed or data not changed', 201, 200);
      }

      return $this->sendSuccess($data, 'update successfully', 200, 200);
   }
}
