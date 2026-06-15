<?php
namespace App\Models\Woocommerce\Product;

class ProductModel {

   public static function init() {
      add_filter( 'woocommerce_rest_prepare_product_object', [self::class, 'prepareProductObject'], 10, 3 );
   }

   /**
     * Hàm xử lý chính: Lọc dữ liệu trước khi trả về cho Client
     */
   public static function prepareProductObject($response, $product, $request) { 
      $data = $response->get_data();
    
      // 1. Whitelist các trường cần thiết cho sản phẩm cha
      $allowed_fields = ['id', 'name', 'type', 'price', 'meta_data', 'attributes', 'variations'];
      $filtered_data = array_intersect_key($data, array_flip($allowed_fields));
     
      // // 2. Tối ưu Meta Data
      if (!empty($filtered_data['meta_data'])) {
         $filtered_data['meta_data'] = self::filterMetaData($filtered_data['meta_data']);
      }

      // // 3. Xử lý chuyên sâu cho Variations    
      $filtered_data['variations'] = self::getFullVariationsData($product);

      if (!empty($filtered_data['attributes'])) {
         $filtered_data['attributes'] = self::extractAttributes($filtered_data['attributes']);
      }
     
      // 4. CHỈNH SỬA TẠI ĐÂY: Trả về mảng có key là ID
      // Lưu ý: Ép kiểu ID về string để đảm bảo JSON object key chuẩn xác
      $id = (string)$filtered_data['id'];
      
      // Gán lại dữ liệu vào response dưới dạng mảng kết hợp
      $response->set_data([
         $id => $filtered_data
      ]);
      
      return $response;
   }
   
   /**
     * Lọc Meta Data: Chỉ lấy các key quan trọng
     */
   public static function filterMetaData($meta_data) {
      $allowKeys = ['_unit_product', '_name_invoice'];
      $result = [];

      if (empty($meta_data) || !is_array($meta_data)) {
         return $result;
      }

      foreach ($meta_data as $meta) {
         // Ép kiểu về object để truy cập đồng nhất với các hàm trước của bạn
         $m = (object) $meta;

         // Kiểm tra xem meta key này có nằm trong danh sách cho phép không
         if (isset($m->key) && in_array($m->key, $allowKeys)) {
               $result[$m->key] = $m->value ?? '';
         }
      }

      return $result;
   }

   /**
     * Lấy và chuẩn hóa dữ liệu biến thể
     */
   public static function getFullVariationsData($product) {
      $full_variations = [];
      if ($product->is_type('simple')) {
         // Lấy dữ liệu cơ bản
        $p_id = $product->get_id();
        $price = (float)$product->get_price();

        // Tái sử dụng logic lấy số lượng từ thuộc tính 'pa_so-luong' giống như loại variation
        $qty_attr = $product->get_attribute('pa_so-luong');
        $quantity = !empty($qty_attr) ? (float)str_replace(',', '', $qty_attr) : 1;

        // Trả về object "gầy" cho sản phẩm đơn giản
        $full_variations[$p_id] = [
            'id'       => $p_id,
            'price'    => $price,
            'quantity' => $quantity,
            'total'    => $price * $quantity,
            'type'     => 'simple',
        ];
      } elseif ($product->is_type('variable')) {
         $variation_ids = $product->get_children();
   
         foreach ($variation_ids as $v_id) {
            $variation = wc_get_product($v_id);
            if ($variation) {
               $v_data = $variation->get_data();
                   
               // 1. Khởi tạo giá trị mặc định cho số lượng
               $quantity = !empty($v_data['attributes']['pa_so-luong'])?
                  (float)str_replace(',','',$variation->get_attribute('pa_so-luong')) : 1; // Giá trị mặc định
               
               // Trả về một object "gầy" (lean object) giúp giảm dung lượng JSON
               $full_variations[$v_data['id']] = [
                  'id'                => $v_data['id'],                 
                  'price'             => (float)$v_data['price'],
                  'quantity'          => (float)$quantity,
                  'total'             => (float)$quantity * (float)$v_data['price'],                 
                  'type'              => 'variation',
                  
               ];
            }
         }

      }

      return $full_variations;    
   }

   public static function extractAttributes($attributes) { 
      $result = [];

      // Kiểm tra nếu không phải mảng hoặc rỗng thì trả về mảng trống ngay lập tức
      if (!is_array($attributes) || empty($attributes)) {
         return $result;
      }

      foreach ($attributes as $attribute) {
         if ( $attribute['variation'] != 1) {
            $slug = $attribute['slug'];
            $result[$slug] = [
               'id'     => $attribute['id'] ?? 0,
               'name'   => $attribute['name'] ?? '',
               // Lấy phần tử đầu tiên của mảng options hoặc option
               'option' => $attribute['options'][0] ?? $attribute['option'][0] ?? '',
               'slug'   => $attribute['slug'] ?? '',
               'position' => $attribute['position'] ?? 0, 
                  
            ];
         }
      }

      return $result;
   }

   public static function metaUpdate($productId, $key, $value) {
      return update_post_meta( $productId, $key, $value ); 
   }

   public static function getMeta($productId, $key) {
      return get_post_meta($productId, $key, true);
   }
  
} 