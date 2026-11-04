<?php
// Provides module declarations and business logic for DocumentApi.php.


namespace App\Api\Documents;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use App\Controllers\Documents\DocumentController;
use App\Support\HookManager;
use WP_REST_Request;

if (!defined('ABSPATH')) {
   exit;
}

// Defines DocumentApi class behavior for DocumentApi.php.
class DocumentApi extends Api {

   protected static $instance;
   protected $controller;

   // Defines get_instance method behavior for DocumentApi.php.
   public static function get_instance(?DocumentController $controller = null, ?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($controller, $hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for DocumentApi.php.
   public function __construct(?DocumentController $controller = null, ?HookManager $hooks = null) {
      $this->controller = $controller ?? DocumentController::get_instance($hooks);
      parent::__construct();
   }

   // Defines routesRegister method behavior for DocumentApi.php.
   public function routesRegister() {
      register_rest_route(
         self::$namespace,
         '/documents/files',
         [
            [
               'methods'  => 'GET', // lấy file để hiển thị
               'callback' => [$this->controller, 'handleGetFiles'],
               'args'     => $this->getCollectionParams(), // Dùng bộ validate phân trang có sẵn
               'permission_callback' => function (WP_REST_Request $request) {
                  return JwtAuthenticate::JwtAuthenticate($request) && current_user_can('edit_shop_orders');
               }
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/files/(?P<slug>[^/]+)/delete',
         [
            [
               'methods'             => 'DELETE',
               'callback'            => [$this->controller, 'handleDeleteFile'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/files/(?P<slug>[^/]+)',
         [
            [
               'methods'             => \WP_REST_Server::READABLE,
               'callback'            => [$this->controller, 'handleGetFileDetail'],
               'args'                => [
                  'slug' => [
                     'description' => 'Tên định danh của file (slug), không bao gồm phần mở rộng .pdf.',
                     'type'        => 'string',
                     'required'    => true,
                  ],
               ],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/stream/(?P<slug>[^/]+)',
         [
            [
               'methods'             => \WP_REST_Server::READABLE,
               'callback'            => [$this->controller, 'handleStreamFile'],
               'args'                => [
                  'slug' => [
                     'description' => 'Tên định danh của file PDF, không bao gồm phần mở rộng .pdf.',
                     'type'        => 'string',
                     'required'    => true,
                  ],
               ],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/orders/(?P<order_id>\d+)',
         [
            [
               'methods'             => \WP_REST_Server::READABLE,
               'callback'            => [$this->controller, 'handleGetOrderDocuments'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );

      register_rest_route(
         self::$namespace,
         '/documents/thumbnail/(?P<slug>[^/]+)',
         [
            [
               'methods'             => \WP_REST_Server::READABLE,
               'callback'            => [$this->controller, 'handleThumbnailFile'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/upload',
         [
            [
               'methods'             => 'POST',
               'callback'            => [$this->controller, 'handleUploadFile'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/assign',
         [
            [
               'methods'             => 'POST',
               'callback'            => [$this->controller, 'handleBulkAssign'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ],
            [
               'methods'             => 'DELETE',
               'callback'            => [$this->controller, 'handleBulkUnassign'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
      register_rest_route(
         self::$namespace,
         '/documents/orders-without-doc',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this->controller, 'handleGetOrdersWithoutDoc'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
   }
}
