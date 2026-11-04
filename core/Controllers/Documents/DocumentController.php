<?php
// Provides module declarations and business logic for DocumentController.php.

namespace App\Controllers\Documents;

use App\Controllers\Controller; // Import Controller
use App\Support\HookManager;
use App\Views\Documents\DocumentViewer;
use App\Models\Woocommerce\Order\OrderModel;
use App\Models\Documents\DocumentModel;

use WP_REST_Request;
use WP_Error;

// Defines DocumentController class behavior for DocumentController.php.
class DocumentController extends Controller { // Kế thừa từ Controller
   private $hooks;
   private $model;
   protected static $instance;
   
   private $uploaddir;
   private $uploaduri;

   // Defines get_instance method behavior for DocumentController.php.
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
          self::$instance = new self($hooks ?? new HookManager());
      }
      return self::$instance;
   }

   // Defines __construct method behavior for DocumentController.php.
   public function __construct(HookManager $hooks) {
      $this->hooks = $hooks;
      $this->model = new DocumentModel();
      self::$instance = $this;
  
      $this->registerHooks();
   }
      
   // Defines registerHooks method behavior for DocumentController.php.
   private function registerHooks() {
      $this->hooks->addAction('manage_shop_order_posts_custom_column', [$this, 'addFunctionUnderOrderName'], 30, 2);
      $this->hooks->addFilter('orderLink', [$this, 'addOrderLink'], 30, 2);
   }

   // Defines addFunctionUnderOrderName method behavior for DocumentController.php.
   public function addFunctionUnderOrderName($column, $postid) {
      if ('order_number' === $column) { 
         $link = '';  
         echo DocumentViewer::functionsLink($link, $postid);
      }      
   }

   // Defines addOrderLink method behavior for DocumentController.php.
   public function addOrderLink($link, $postid) {
      $default = ['vatDocument'=>['title'=>'Tải Hoá đơn', 'file' =>'', 'files' => []], 
                  'orderDocument'=> ['title'=>'Tải Đơn hàng', 'file' =>'', 'files' => []],
                  'deliveryDocument'=>['title'=>'Tải Phiếu Giao hàng', 'file' =>'', 'files' => []]]; 

      $existDoc = OrderModel::getOrderMeta($postid, 'orders', true);  
      if (! empty($existDoc)) $default = self::pushDocInDefault( $existDoc, $default);
      $links = '';
      foreach ($default as $key => $linkData) {
         $links .= $this->createDocumentLink($linkData, $key, $postid);
      }                  			
      return $link . $links ;
   }

   // Defines pushDocInDefault method behavior for DocumentController.php.
   public static function pushDocInDefault($exitDoc, $default) {
      $changeKey = ['vatdoc'=>'vatDocument', 'cus_orders'=>'orderDocument', 'delivery_doc'=>'deliveryDocument'];
      foreach ($exitDoc as $key => $content) {
         $newKey = $changeKey[$key] ?? $key;
         if (!isset($default[$newKey])) continue;
         $files = DocumentModel::normalizeDocumentFiles($content);
         $default[$newKey]['files'] = $files;
         $default[$newKey]['file'] = $files[0] ?? '';
      } 
      return $default;
   }

   // Defines createDocumentLink method behavior for DocumentController.php.
   public function createDocumentLink($linkData, $key, $postid) {    
      $files = $linkData['files'] ?? DocumentModel::normalizeDocumentFiles($linkData['file'] ?? '');
      $data = [
         'ID' => $postid,
         'name' => $key,
         'file' => $files[0] ?? '',
         'files' => $files,
         'title' => $linkData['title']
      ];                     
      return DocumentViewer::documentLink($data, $key);
   }

   /* Executes documented symbol logic in DocumentController.php. */
    public function handleGetFiles(WP_REST_Request $request) {
        // Executes documented symbol logic in DocumentController.php.
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

    /* Executes documented symbol logic in DocumentController.php. */
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

        // Executes documented symbol logic in DocumentController.php.
        $allowed_extensions = ['pdf']; 
        if (!in_array($ext, $allowed_extensions)) {
            return $this->sendError('invalid_type', 'Chỉ cho phép tải lên tệp tin định dạng PDF.', 400);
        }

        $destination = $this->model->getNewDirPath() . $file_name;
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            // Executes documented symbol logic in DocumentController.php.
            $this->model->clearFileCache();

            $upload_dir = wp_upload_dir();
            $relative_path = $this->model->getNewRelativePrefix() . $file_name;
            return $this->sendSuccess([
                'name'          => $file_name,
                'relative_path' => $relative_path,
                'url'           => $upload_dir['baseurl'] . '/' . $relative_path,
                'ext'           => $ext,
                'size'          => size_format($file['size'])
            ], 'Tải lên kho thành công!');
        }
        return $this->sendError('move_failed', 'Lỗi lưu trữ file trên server.', 500);
    }

   /* Executes documented symbol logic in DocumentController.php. */
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
   /* Executes documented symbol logic in DocumentController.php. */
   public function handleBulkUnassign(WP_REST_Request $request) {
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền gỡ bỏ tài liệu.', 403);
      }

      $order_ids     = $request->get_param('order_ids');
      $doc_type      = $request->get_param('doc_type'); // invoice | quotation | delivery
      $relative_path = $request->get_param('relative_path');

      if (empty($order_ids) || !is_array($order_ids) || empty($doc_type)) {
         return $this->sendError('missing_data', 'Dữ liệu yêu cầu không hợp lệ.', 400);
      }
      // Executes documented symbol logic in DocumentController.php.
      $count = $this->model->bulkUnassignMeta($order_ids, $doc_type, $relative_path);
      return $this->sendSuccess(['count' => $count], "Đã gỡ bỏ tài liệu thành công cho {$count} đơn hàng.");
   }

   /* Executes documented symbol logic in DocumentController.php. */
   public function handleGetOrdersWithoutDoc(WP_REST_Request $request) {
      $doc_type = $request->get_param('doc_type'); // invoice | quotation | delivery
      
      if (empty($doc_type)) {
         return $this->sendError('missing_type', 'Vui lòng cung cấp loại tài liệu.', 400);
      }
      $orders = $this->model->getOrdersWithoutDoc($doc_type);
      return $this->sendSuccess(['orders' => $orders], 'Lấy danh sách đơn hàng thành công.');
   }

   /* Executes documented symbol logic in DocumentController.php. */
   public function handleGetFileDetail(WP_REST_Request $request) {
      $slug = $request->get_param('slug'); // Lấy slug từ dynamic route regex
      error_log('handleGetFileDetail: Slug received: ' . $slug); // Log slug nhận được
      if (empty($slug)) return $this->sendError('missing_slug', 'Thiếu tên định danh file.', 400);

      $result = $this->model->getFileDetailByPath($slug);
      // Executes documented symbol logic in DocumentController.php.
      if (is_wp_error($result)) {
         error_log('handleGetFileDetail: File not found for slug: ' . $slug . ' - Error: ' . $result->get_error_message());
         return $result;
      }
      // Executes documented symbol logic in DocumentController.php.
      return $this->sendSuccess($result, 'Lấy thông tin file thành công.');
   }

   /**
    * Return the three document assignments for an order edit screen.
    */
   public function handleGetOrderDocuments(WP_REST_Request $request) {
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền xem tài liệu của đơn hàng.', 403);
      }

      $order_id = absint($request->get_param('order_id'));
      if (!$order_id || !wc_get_order($order_id)) {
         return $this->sendError('order_not_found', 'Không tìm thấy đơn hàng.', 404);
      }

      $stored = OrderModel::getOrderMeta($order_id, 'orders', true);
      $stored = is_array($stored) ? $stored : [];
      $legacy_map = ['invoice' => 'vatdoc', 'quotation' => 'cus_orders', 'delivery' => 'delivery_doc'];
      $document_map = [
         'invoice' => ['name' => 'vatDocument', 'title' => 'Hóa đơn'],
         'quotation' => ['name' => 'orderDocument', 'title' => 'Đơn hàng'],
         'delivery' => ['name' => 'deliveryDocument', 'title' => 'Phiếu giao hàng'],
      ];

      foreach ($document_map as $type => &$document) {
         $raw = $stored[$document['name']] ?? $stored[$legacy_map[$type]] ?? '';
         $files = DocumentModel::normalizeDocumentFiles($raw);
         $document['files'] = $files;
         $document['file'] = $files[0] ?? '';
         $document['multiple'] = ($type === 'delivery');
      }
      unset($document);

      return $this->sendSuccess([
         'order_id'  => $order_id,
         'documents' => $document_map,
      ], 'Lấy tài liệu của đơn hàng thành công.');
   }

   /* Executes documented symbol logic in DocumentController.php. */
   // Streams an authenticated PNG thumbnail generated from the requested PDF's first page.
   public function handleThumbnailFile(WP_REST_Request $request) {
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền xem thumbnail này.', 403);
      }
      $result = $this->model->getThumbnailByPath($request->get_param('slug'));
      if (is_wp_error($result)) return $result;

      clearstatcache(true, $result['path']);
      header('Cache-Control: private, max-age=86400');
      header('Content-Type: image/png');
      header('Content-Length: ' . filesize($result['path']));
      readfile($result['path']);
      exit;
   }

   // Defines handleStreamFile method behavior for DocumentController.php.
   public function handleStreamFile(WP_REST_Request $request) {
      // Executes documented symbol logic in DocumentController.php.
      if (!current_user_can('edit_shop_orders')) {
         return $this->sendError('rest_forbidden', 'Bạn không có quyền xem tài liệu này.', 403);
      }

      $slug = $request->get_param('slug');
      $result = $this->model->getFileDetailByPath($slug);

      if (is_wp_error($result)) return $result;

      $file_path = wp_upload_dir()['basedir'] . '/' . $result['relative_path'];

      clearstatcache(true, $file_path);
      $etag = '"' . md5($file_path . '|' . filemtime($file_path) . '|' . filesize($file_path)) . '"';
      header('Cache-Control: private, max-age=86400');
      header('ETag: ' . $etag);
      header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($file_path)) . ' GMT');

      if (trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '')) === $etag) {
         status_header(304);
         exit;
      }

      // Executes documented symbol logic in DocumentController.php.
      header('Content-Type: application/pdf');
      header('Content-Disposition: inline; filename="' . basename($file_path) . '"');
      header('Content-Length: ' . filesize($file_path));
      readfile($file_path);
      exit;
   }

   /* Executes documented symbol logic in DocumentController.php. */
   public function handleDeleteFile(WP_REST_Request $request) {
      $path = $request->get_param('path');
     
      if (empty($path)) {
         return $this->sendError('missing_param', 'Thiếu đường dẫn file cần xóa.', 400);
      }

      $result = $this->model->deleteFileSafely($path);

      if (is_wp_error($result)) {
         return $result; // Trả về lỗi WP_Error chuẩn kèm mã HTTP Status tương ứng
      }

      return $this->sendSuccess($result, 'Đã xóa file ra khỏi kho lưu trữ thành công! ' . $path);      
   }
}
