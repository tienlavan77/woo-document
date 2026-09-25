<?php
namespace App\Models\Woocommerce\Order;

use App\Models\Woocommerce\Customers\CustomerSupport;
use App\Support\PluginRequest;
class OrderModel {  
   // Đổi tên hàm từ 'repareOrders' thành 'prepareOrders'
   public static function prepareOrders() {
      add_filter('rest_post_dispatch', [self::class,'prepareOrdersObject'], 10, 3);
   }

   public static function prepareOrdersObject($response, $order, $request) { 
      if (!PluginRequest::is($request)) {
         return $response;
      }

      if (strpos($request->get_route(), '/wc/v3/orders') !== false) {
         $data = $response->get_data();
         if (empty($data)) return $response;

         // Kiểm tra xem là danh sách đơn hàng hay là một đơn hàng đơn lẻ
         $first_order = isset($data[0]) ? $data[0] : $data;
         $orders_to_process = isset($data[0]) ? $data : [$data];

         // Xử lý thông tin khách hàng từ đơn hàng đầu tiên/duy nhất
         $customerId = $first_order['customer_id'] ?? 0;
         $customer = CustomerSupport::extractCustomer($customerId); 

         // xử lý thông tin sản phẩm
         $type = $request->get_param('type');
         $products = self::extractProductsForQuotation($orders_to_process, $type);
         $response->set_data(['customer' => $customer, 'products'=>  $products, ]);

      }
      return $response;
   }

   public static function extractProductsForQuotation($data, $type) {
      $products = [];
      foreach ($data as $order) {
         $orderId = $order['id'];
         $lines = $order['line_items'];
         foreach ($lines as $line) {
            
            $productId = $line['product_id'];           
            $productClass = wc_get_product($productId);
            $productData = $productClass->get_data();

            // nếu là quotation thì $id là product_id, ngược lại là id của line trong order
            $id = $type == 'quotation'? $line['product_id'] : $line['id'];
            $meta = self::extractMetadata($productData['meta_data']);

            $products[$id] = [
               'id' => $id, // id sản phẩm  
               'line' => $line['id'], // id dòng item trong đơn hàng
               'order' => $orderId,  // id đơn hàng                 
               'name' =>  $meta['_name_invoice'] ?? $productData['name'],
               'unit' =>  $meta['_unit_product'] ?? 'pcs',
               'type' => $productClass->get_type(),               
               'variations' => self::extractVariations($line),               
            ];
                                                                            
            if ($type == 'quotation') $products[$id]['attributes'] = self::extractAttributes($productClass);
         }
      }
           
      return $products;   
   } 
   
    
   /**
    * Lọc Meta Data: Chỉ lấy các key quan trọng
    */
   public static function extractMetadata($meta_data) {
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

   public static function extractAttributes($product) {
      $attributes = [];
      $attrs = $product->get_attributes();
      foreach ( $attrs as $index => $attr ) {
			 
         $attrData = $attr->get_data();
         if ( $attrData['is_variation'] != 1) {
            $temp = [
               'id' => $attr->get_id(),
               'position' => $attr->get_position(),               
               // lấy nhãn của thuộc tính sản phẩm
               'name' => wc_attribute_label($attrData['name']),
               // trả lại nội dung của thuộc tính sản phẩm theo nhãn
               'option'=> $product->get_attribute($attr['name']),
               'slug'=> $attr['name']]; // trả lại nội dung của thuộc tính sản phẩm theo nhãn                   
            $attributes[] = $temp;
         }
         // $attributes[] =   $attrData;
		}    

      return $attributes;
   }

   public static function extractVariations($line) { 
      $variation = [];
      $id = $line['variation_id'] ?? $line['product_id'];
      $variation[$id] =
         [
            'id' => $id,                 
            'quantity' => $line['quantity'],
            'price' => $line['price'],
            'total' => $line['total'],
            'type' => 'variation',
         ];         
      return $variation;
   }

   public static function getOrderMeta($id, $key, $single = false) {
      return get_post_meta($id, $key, $single);
   }

   public static function updateOrderMeta($id, $key, $value) {
      return update_post_meta($id, $key, $value);
   }

}
