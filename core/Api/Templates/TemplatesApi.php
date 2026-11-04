<?php
// Provides module declarations and business logic for TemplatesApi.php.


namespace App\Api\Templates;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use WP_REST_Request;

if (!defined('ABSPATH')) {
   exit;
}

// Defines TemplatesApi class behavior for TemplatesApi.php.
class TemplatesApi extends Api {
   // Executes documented symbol logic in TemplatesApi.php.
   protected static $instance;

   /* Executes documented symbol logic in TemplatesApi.php. */
   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

   // Defines __construct method behavior for TemplatesApi.php.
   public function __construct() {
      self::$instance = $this;
      parent::__construct();
   }

   /* Executes documented symbol logic in TemplatesApi.php. */
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

   /* Executes documented symbol logic in TemplatesApi.php. */
   public function handleGetTemplate(WP_REST_Request $request) {
      $type_param = $request->get_param('type');
      $slug       = $request->get_param('slug');

      // Executes documented symbol logic in TemplatesApi.php.
      $type_mapping = [
         'deliveries' => 'delivery',
         'quotations' => 'quotation',
         'invoice'    => 'vatinvoice',
         'prints'     => 'prints',
      ];

      $folder = $type_mapping[$type_param] ?? $type_param;

      return $this->getTemplate($slug, $folder);
   }

   /* Executes documented symbol logic in TemplatesApi.php. */
   public function getTemplate($slug, $type) {
      // Executes documented symbol logic in TemplatesApi.php.
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
