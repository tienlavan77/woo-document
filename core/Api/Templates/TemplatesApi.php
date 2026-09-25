<?php
namespace App\Api\Templates;

use App\Api\Api;
use App\Middlewares\JwtAuthenticate;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Class TemplatesApi
 * Quản lý các API liên quan đến việc lấy mã nguồn HTML giao diện mẫu (Templates)
 * Kế thừa từ lớp Api cha để tự động đăng ký route khi khởi tạo.
 */
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

   /**
    * ĐĂNG KÝ CÁC ĐƯỜNG DẪN API (ROUTES)
    * TỐI ƯU: Gộp 3 endpoint cũ thành 1 endpoint động duy nhất bằng Regular Expression (Regex)
    * URL mẫu: /wp-json/document/v1/template/deliveries/mau-don-hang
    */
	public function routesRegister() {
		register_rest_route(
			self::$namespace,
         // (?P<type>...) bắt group loại template: chỉ chấp nhận 1 trong 3 chữ: deliveries, quotations, hoặc invoice
         // (?P<slug>...) bắt group tên file template: chấp nhận chữ, số và dấu gạch ngang (-)
			'/template/(?P<type>deliveries|quotations|invoice|prints)/(?P<slug>[a-zA-Z0-9-]+)',
			[
				[
					'methods'             => 'GET', // Phương thức HTTP GET
					'callback'            => [$this, 'handleGetTemplate'], // Hàm xử lý logic chính
               // Middleware xác thực Token JWT trước khi cho phép đọc file giao diện
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
      // Lấy tham số động 'type' và 'slug' từ URL đã bắt được ở bộ lọc Regex phía trên
		$type_param = $request->get_param('type');
		$slug       = $request->get_param('slug');

      // Mảng ánh xạ (Mapping) từ tên trên URL sang tên thư mục thực tế trong source code
		$type_mapping = [
			'deliveries' => 'delivery',
			'quotations' => 'quotation',
			'invoice'    => 'vatinvoice',
			'prints'     => 'prints',
		];

      // Nếu tìm thấy trong mảng mapping thì lấy, nếu không (dự phòng) thì giữ nguyên giá trị
		$folder = $type_mapping[$type_param] ?? $type_param;
      
      // Gọi hàm đọc file vật lý và trả về kết quả
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
      
      // Kiểm tra file có tồn tại trên máy chủ hay không
		if (!file_exists($template)) { 
         // Nếu không thấy file, trả về mã lỗi 404 chuẩn REST API thay vì mảng tự chế
			return new WP_Error('template_not_found', 'Không tìm thấy file giao diện mẫu yêu cầu.', ['status' => 404]);
		} 

      // Nếu file tồn tại, đọc nội dung file và đóng gói vào WP_REST_Response với mã 200 (Thành công)
		$response = new WP_REST_Response([
			'status' => [
				'code'    => 200, 
				'message' => 'Lấy file giao diện thành công.', 
				'data'    => [
					'template' => file_get_contents($template), // Đọc toàn bộ nội dung text/HTML của file
					'name'     => $slug
				]
			]
		], 200);
		$response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
		$response->header('Pragma', 'no-cache');
		$response->header('Expires', '0');
		return $response;
	}   
}
