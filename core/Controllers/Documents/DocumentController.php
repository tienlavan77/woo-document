<?php
namespace App\Controllers\Documents;

use App\Controllers\Controller; // Import Controller
use App\Support\HookManager;
use App\Views\Documents\DocumentViewer;
use App\Models\Woocommerce\Order\OrderModel;
use App\Models\Documents\DocumentModel;

use WP_REST_Request;
use WP_Error;

class DocumentController extends Controller { // Kế thừa từ Controller
   private $hooks;
   private $model;
   protected static $instance;
   
   private $uploaddir;
   private $uploaduri;

   public static function get_instance(HookManager $hooks) {
      if (is_null(self::$instance)) {
          self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   private function __construct(HookManager $hooks) {
      $this->hooks = $hooks;
      $this->model = new DocumentModel();
  
      $this->registerHooks();
   }
      
   private function registerHooks() {
      $this->hooks->addAction('manage_shop_order_posts_custom_column', [$this, 'addFunctionUnderOrderName'], 30, 2);
      $this->hooks->addFilter('orderLink', [$this, 'addOrderLink'], 30, 2);
   }

   public function addFunctionUnderOrderName($column, $postid) {
      if ('order_number' === $column) { 
         $link = '';  
         echo DocumentViewer::functionsLink($link, $postid);
      }      
   }

   public function addOrderLink($link, $postid) {
      $default = ['vatDocument'=>['title'=>'Tải Hoá đơn', 'file' =>''], 
                  'orderDocument'=> ['title'=>'Tải Đơn hàng', 'file' =>''],
                  'deliveryDocument'=>['title'=>'Tải Phiếu Giao hàng', 'file' =>'']]; 

      $existDoc = OrderModel::getOrderMeta($postid, 'orders', true);  
      if (! empty($existDoc)) $default = self::pushDocInDefault( $existDoc, $default);
      $links = '';
      foreach ($default as $key => $linkData) {
         $links .= $this->createDocumentLink($linkData, $key, $postid);
      }                  			
      return $link . $links ;
   }

   public static function pushDocInDefault($exitDoc, $default) {
      $changeKey = ['vatdoc'=>'vatDocument', 'cus_orders'=>'orderDocument', 'delivery_doc'=>'deliveryDocument'];
      foreach ($exitDoc as $key => $content) {
         $newKey = $changeKey[$key] ?? $key;
         $default[$newKey]['file'] = $content;
      } 
      return $default;
   }

   public function createDocumentLink($linkData, $key, $postid) {    
      $data = ['ID' => $postid, 'name' => $key, 'file'=>$linkData['file'], 'title'=>$linkData['title']];                     
      return DocumentViewer::documentLink($data, $key);
   }

   /**
     * Điều hướng lấy danh sách file phân trang
     */
    public function handleGetFiles(WP_REST_Request $request) {
        // Kiểm tra quyền hạn của người dùng (Chỉ cho phép nhân viên/admin)
        if (!current_user_can('edit_shop_orders')) {
            return $this->sendError('rest_forbidden', 'Bạn không có quyền truy cập danh sách file.', 403);
        }

        $page     = absint($request->get_param('page'));
        $per_page = absint($request->get_param('count'));
        
        if ($page === 0) $page = 1; // Mặc định trang 1
        if ($per_page === 0) $per_page = 10; // Mặc định 10 file theo yêu cầu

        $result = $this->model->getCompiledFiles($page, $per_page);
        return $this->sendSuccess($result, 'Lấy danh sách file thành công.');
    }

    /**
     * Điều hướng xử lý file upload thủ công từ máy tính (luôn lưu vào thư mục mới)
     */
    public function handleUploadFile(WP_REST_Request $request) {
        if (!current_user_can('edit_shop_orders')) {
            return $this->sendError('rest_forbidden', 'Bạn không có quyền tải lên tài liệu.', 403);
        }

        if (empty($_FILES['file'])) {
             return $this->sendError('no_file', 'Vui lòng đính kèm file.', 400);
        }

        $file = $_FILES['file'];
        $file_name = sanitize_file_name($file['name']);
        $ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION)); // Lấy đuôi file

        // 👉 WORLD CLASS SECURITY: Sử dụng Whitelist thay vì Blacklist
        $allowed_extensions = ['pdf']; 
        if (!in_array($ext, $allowed_extensions)) {
            return $this->sendError('invalid_type', 'Chỉ cho phép tải lên tệp tin định dạng PDF.', 400);
        }

        $destination = $this->model->getNewDirPath() . $file_name;
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            // 👉 BƯỚC QUAN TRỌNG: Xóa cache ngay khi file mới xuất hiện trên ổ cứng
            $this->model->clearFileCache();

            $upload_dir = wp_upload_dir();
            return $this->sendSuccess([
                'name'          => $file_name,
                'relative_path' => 'order_documents/' . $file_name,
                'url'           => $upload_dir['baseurl'] . '/order_documents/' . $file_name,
                'ext'           => $ext,
                'size'          => size_format($file['size'])
            ], 'Tải lên kho thành công!');
        }
        return $this->sendError('move_failed', 'Lỗi lưu trữ file trên server.', 500);
    }

   /**
    * Điều hướng gán tài liệu hàng loạt cho các Order
    */
   public function handleBulkAssign(WP_REST_Request $request) {
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền gán tài liệu.', 403);
      }

      $relative_path = $request->get_param('relative_path');
      $order_ids     = $request->get_param('order_ids');
      $doc_type      = $request->get_param('doc_type'); // invoice | quotation | delivery

      if (empty($relative_path) || empty($order_ids) || !is_array($order_ids)) {
         return $this->sendError('missing_data', 'Dữ liệu yêu cầu không hợp lệ.', 400);
      }
      $count = $this->model->bulkAssignMeta($order_ids, $relative_path, $doc_type);
      return $this->sendSuccess(['count' => $count], "Đã gán thành công tài liệu cho {$count} đơn hàng được chọn.");
   }
   /**
    * Điều hướng gỡ bỏ tài liệu hàng loạt cho các Order
    */
   public function handleBulkUnassign(WP_REST_Request $request) {
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền gỡ bỏ tài liệu.', 403);
      }

      $order_ids = $request->get_param('order_ids');
      $doc_type  = $request->get_param('doc_type'); // invoice | quotation | delivery

      if (empty($order_ids) || !is_array($order_ids) || empty($doc_type)) {
         return $this->sendError('missing_data', 'Dữ liệu yêu cầu không hợp lệ.', 400);
      }
      // Gọi model để cập nhật meta về chuỗi rỗng
      $count = $this->model->bulkAssignMeta($order_ids, '', $doc_type);
      return $this->sendSuccess(['count' => $count], "Đã gỡ bỏ tài liệu thành công cho {$count} đơn hàng.");
   }

   /**
    * Lấy danh sách các đơn hàng chưa có loại tài liệu cụ thể (Yêu cầu 2a)
    */
   public function handleGetOrdersWithoutDoc(WP_REST_Request $request) {
      $doc_type = $request->get_param('doc_type'); // invoice | quotation | delivery
      
      if (empty($doc_type)) {
         return $this->sendError('missing_type', 'Vui lòng cung cấp loại tài liệu.', 400);
      }
      $orders = $this->model->getOrdersWithoutDoc($doc_type);
      return $this->sendSuccess(['orders' => $orders], 'Lấy danh sách đơn hàng thành công.');
   }

   /**
    * Lấy thông tin chi tiết một file dựa trên relative_path (Yêu cầu 1 - Popup xem thông tin)
    */
   public function handleGetFileDetail(WP_REST_Request $request) {
      $slug = $request->get_param('slug'); // Lấy slug từ dynamic route regex
      error_log('handleGetFileDetail: Slug received: ' . $slug); // Log slug nhận được
      if (empty($slug)) return $this->sendError('missing_slug', 'Thiếu tên định danh file.', 400);

      $result = $this->model->getFileDetailByPath($slug);
      // Nếu model trả về WP_Error (ví dụ: không tìm thấy file), trả về trực tiếp để WordPress xử lý lỗi
      if (is_wp_error($result)) {
         error_log('handleGetFileDetail: File not found for slug: ' . $slug . ' - Error: ' . $result->get_error_message());
         return $result;
      }
      // Sử dụng WP_REST_Response để tường minh hóa phản hồi thành công
      return $this->sendSuccess($result, 'Lấy thông tin file thành công.');
   }

   /**
    * API Proxy: Xác thực và stream nội dung file PDF
    */
   public function handleStreamFile(WP_REST_Request $request) {
      // 1. Xác thực thủ công vì trình xem PDF không gửi Header
      $token = $request->get_param('token');
      if (!$token || !JwtAuthenticate::validateToken($token)) { // Giả định bạn có hàm validateToken
         return new WP_Error('rest_forbidden', 'Phiên làm việc hết hạn hoặc không hợp lệ.', ['status' => 403]);
      }

      // 2. Kiểm tra quyền hạn
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền xem tài liệu này.', 403);
      }

      $slug = $request->get_param('slug');
      $result = $this->model->getFileDetailByPath($slug);

      if (is_wp_error($result)) return $result;

      $file_path = wp_upload_dir()['basedir'] . '/' . $result['relative_path'];

      // 3. Thiết lập Header và Stream file
      header('Content-Type: application/pdf');
      header('Content-Disposition: inline; filename="' . basename($file_path) . '"');
      header('Cache-Control: private, max-age=86400');
      readfile($file_path);
      exit;
   }
}
