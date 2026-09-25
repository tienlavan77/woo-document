<?php
namespace App\Api\Documents;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use App\Controllers\Documents\DocumentController;
use App\Models\Woocommerce\Order\OrderModel; // Đồng bộ namespace với Controller
use App\Support\HookManager;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

class DocumentApi extends Api {
   
   protected static $instance;
   protected $controller;
   

   public static function get_instance() {
      if (is_null(self::$instance)) {
            self::$instance = new self();
      }
      return self::$instance;
   }    
   public function __construct() {
      $this->controller = DocumentController::get_instance(new HookManager()); 
      $this->routesRegister();
   }

   public function routesRegister() {     
      register_rest_route(
         self::$namespace, 
         '/documents/files', 
         [
            [  'methods' => 'GET', // lấy file để hiện thị  
               'callback' => [$this->controller, 'handleGetFiles'],
               'args'     => $this->getCollectionParams(), // Dùng bộ validate phân trang có sẵn
               'permission_callback' => function(WP_REST_Request $request) {
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
      ]);    
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
   
   public function getDocs(WP_REST_Request $req) {
      global $wpdb;
      $ids = $req->get_param('ids');
      
      if (empty($ids)) {
         return $this->sendError('missing_ids', 'Thiếu danh sách ID đơn hàng.', 400);
      }

      $parsed_ids = is_array($ids) ? $ids : json_decode($ids, true);
      $idsStr = '(' . implode(',', array_map('absint', $parsed_ids)) . ')';
      
      $queries = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}postmeta WHERE meta_key='orders' AND post_id IN {$idsStr};", OBJECT);
      $queries = array_map(function ($query) {
         return [
            'post_id' => $query->post_id,
            'document' => unserialize($query->meta_value),
         ];
      }, $queries);

      return new WP_REST_Response([
         'status' => [
            'code'    => 200,
            'message' => 'Lấy danh sách tài liệu thành công.',
            'data'    => $queries
         ]
      ], 200);
   }
}
