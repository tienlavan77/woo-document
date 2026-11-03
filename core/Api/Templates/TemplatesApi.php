<?php

namespace App\Api\Templates;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use WP_REST_Request;

if (!defined('ABSPATH')) {
   exit;
}

class TemplatesApi extends Api {
   // Lưu trữ instance duy nhất của class (Mô hình Singleton)
   protected static $instance;

   /**
    * Khởi tạo hoặc lấy ra instance duy nhất của TemplatesApi
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

   /**
    * ĐĂNG KÝ CÁC ĐƯỜNG DẪN API (ROUTES)
    * TỐI ƯU: Gộp 3 endpoint cũ thành 1 endpoint động duy nhất bằng Regular Expression (Regex)
    * URL mẫu: /wp-json/tinsinhphat/v1/template/deliveries/mau-don-hang
    */
   public function routesRegister() {
      register_rest_route(
         self::$namespace,
         '/template/(?P<type>deliveries|quotations|invoice|prints)/(?P<slug>[a-zA-Z0-9-]+)',
         [
            [
               'methods'             => 'GET',
               'callback'            => [$this, 'handleGetTemplate'],
               'permission_callback' => [JwtAuthenticate::class, 'JwtAuthenticate']
            ]
         ]
      );
   }

   /**
    * Hàm điều hướng và xử lý Request lấy dữ liệu Template
    * @param WP_REST_Request $request Đối tượng chứa toàn bộ thông tin Client gửi lên
    */
   public function handleGetTemplate(WP_REST_Request $request) {
      $type_param = $request->get_param('type');
      $slug       = $request->get_param('slug');

      // Mảng ánh xạ (Mapping) từ tên trên URL sang tên thư mục thực tế trong source code
      $type_mapping = [
         'deliveries' => 'delivery',
         'quotations' => 'quotation',
         'invoice'    => 'vatinvoice',
         'prints'     => 'prints',
      ];

      $folder = $type_mapping[$type_param] ?? $type_param;

      return $this->getTemplate($slug, $folder);
   }

   /**
    * Đọc file HTML từ ổ cứng và chuẩn hóa dữ liệu trả về cho Client
    * @param string $slug Tên file template (không bao gồm đuôi file)
    * @param string $type Tên thư mục chứa file
    */
   public function getTemplate($slug, $type) {
      // Bảo mật: Đảm bảo slug không chứa các ký tự điều hướng đường dẫn (../)
      $slug = basename($slug);
      $template = $type === ''
         ? sprintf("%s/%s.html", TEMPLATES_DIR_DOCUMENT, $slug)
         : sprintf("%s/%s/%s.min.html", TEMPLATES_DIR_DOCUMENT, $type, $slug);
      if ($type !== '' && !file_exists($template)) {
         $template = sprintf("%s/%s/%s.html", TEMPLATES_DIR_DOCUMENT, $type, $slug);
      }

      if (!file_exists($template)) {
         return $this->sendError('template_not_found', 'Không tìm thấy file giao diện mẫu yêu cầu.', 404);
      }

      $response = $this->sendSuccess(
         [
            'template' => file_get_contents($template),
            'name'     => $slug
         ],
         'Lấy file giao diện thành công.',
         200
      );
      $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      $response->header('Pragma', 'no-cache');
      $response->header('Expires', '0');
      return $response;
   }
}
