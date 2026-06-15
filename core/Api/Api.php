<?php

namespace App\Api;

use App\Middlewares\JwtAuthenticate;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * The Api class serves as a base class for creating REST API endpoints.
 * It provides a common namespace and a constructor that registers the routes
 * when the REST API is initialized.
 */
class Api {

   /**
    * @var string $namespace The namespace for the API routes.
    */
   public static $namespace = NAME_SPACE_DOCUMENT;
   public $route;
   public $model;

   /**
    * Constructor method that adds an action to initialize the API routes.
    */
   public function __construct() {
      $this->routesRegister();      
   }
 
   /**
    * Method to register the API routes.
    * This method should be overridden in the child classes to define specific routes.
    *
    * @return bool Always returns true.
    */
   public function routesRegister() {
      register_rest_route(
         self::$namespace,
         $this->route, 
         [
            [
               'methods' => 'GET',
               'callback' => [$this, 'gets'],
               'args'   => $this->getCollectionParams(), // Thêm validation cho tham số pagination
            ],
            [
               'methods' => 'POST',
               'callback' => [$this, 'create'],
            ]
         ]
      );  
      
   }  

   /**
   * Handles the request to get all accountants.
   * 
   * @param WP_REST_Request $request The request object.
   * @return array The response indicating the result of the request.
   */
   // public function gets(WP_REST_Request $request) { 
   //    //get all
   //    $currentPage = $request->get_param('page');
   //    $rowsPerPage = $request->get_param('count');
   //    $data = $this->model->gets($currentPage, $rowsPerPage);
   //    $pages = $this->model->pages($rowsPerPage);

   //    $reponseData = ['data' => $data, 'pages' => $pages];
   //    return new WP_REST_Response(200, $reponseData);
      
   // }
   public function gets(WP_REST_Request $request) {  
      return false;
   }
   public function create(WP_REST_Request $request) {
      return false;
   }

   /**
   * Handles the request to create a new accountant.
   * It creates a new accountant with the provided data.
   * 
   * @param WP_REST_Request $request The request object.
   * @return array The response indicating the result of the request.
   */   
   // public function create(WP_REST_Request $request) {
      
   //    $data = $request->get_json_params();

   //    if (empty($data)) {
   //       return new WP_Error('bad_request', 'Invalid request',  ['status' => 400]);
   //    }
      
   //    try {
   //       $new_id = $this->model->create($data);
   //       if (!$new_id) {
   //          return new WP_Error('creation_failed', 'Không thể tạo mới.', ['status' => 500]);
   //       }
         
   //       // Trả về response với status 201 Created là chuẩn cho việc tạo mới thành công
   //       return new WP_REST_Response(['message' => 'Thêm thành công', 'id' => $new_id], 201);
   //    } catch (\Exception $e) {
   //       // Log lỗi để debug
   //       // error_log($e->getMessage());
   //       return new WP_Error('internal_error', 'Lỗi máy chủ nội bộ.', ['status' => 500]);
   //    }
     
   // }

   /**
   * Handles the request to update an existing accountant.
   * It updates the accountant with the provided ID and data.
   * 
   * @param WP_REST_Request $request The request object.
   * @return array The response indicating the result of the request.
   */   
   public function update(WP_REST_Request $request) { //update by Id
      $id = $request->get_param('id');
      $data = $request->get_json_params();
     
      try {
         $data = $this->model->update($id, $data);
         return ['code' => 200, 'message' => 'Cập nhật thành công', 'id' => $data];
      } catch (\Exception $e) {
         return ['code' => 500, 'message' => 'Cập nhật thất bại', 'error' => $e->getMessage()];
      }
      return $data;
   }  

   /**
   * Handles the request to delete an accountant.
   * It deletes the accountant with the provided ID.
   * 
   * @param WP_REST_Request $request The request object.
   * @return array The response indicating the result of the request.
   */   
   public function delete(WP_REST_Request $request) { //delete by Id

      $id = $request->get_param('id');
      try {
         $this->model->delete($id);
         // Trả về response không có body với status 204 No Content là chuẩn cho việc xóa thành công
         return new WP_REST_Response(['message' => 'Xóa thành công'], 200);
      } catch (\Exception $e) {
         // error_log($e->getMessage());
         return new WP_Error('delete_failed', 'Xóa thất bại.', ['status' => 500]);
      }
   }

   /**
   * Handles the request to get a specific accountant by their ID.
   * It retrieves the accountant information with the provided ID.
   * 
   * @param WP_REST_Request $request The request object.
   * @return array The response indicating the result of the request.
   */   
   public function getById(WP_REST_Request $request) { //get by Id
      $id = $request->get_param('id');
      $data = $this->model->getById($id);

      if (empty($data)) {
         return new WP_Error('bad_request', 'Invalid request',  ['status' => 400]);
      }

      try {
         $result = $this->model->update($id, $data);
         return new WP_REST_Response(['message' => 'Cập nhật thành công', 'id' => $result], 200);
      } catch (\Exception $e) {
         // error_log($e->getMessage());
         return new WP_Error('update_failed', 'Cập nhật thất bại.', ['status' => 500]);
      }
      
   }

   /**
    * Helper function để định nghĩa các tham số cho việc lấy danh sách (collection).
   * @return array
   */
   public function getCollectionParams() {
      return [
         'page' => [
            'description'       => 'Trang hiện tại của danh sách.',
            'type'              => 'integer',
            'default'           => 1,
            'sanitize_callback' => 'absint', // Chuyển thành số nguyên dương
            'validate_callback' => fn($param) => is_numeric($param) && $param > 0
         ],
         'count' => [
            'description'       => 'Số lượng item trên mỗi trang.',
            'type'              => 'integer',
            'default'           => 10,
            'sanitize_callback' => 'absint',
            'validate_callback' => fn($param) => is_numeric($param) && $param > 0
         ],
      ];
   }   
}
