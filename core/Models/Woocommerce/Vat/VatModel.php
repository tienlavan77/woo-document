<?php 
namespace App\Models\Woocommerce\Vat;

class VatModel {
   public static function init() {
      // add_filter('woocommerce_rest_prepare_customer_object', [self::class,'prepareCustomerObject'], 999, 3);
      add_filter('rest_post_dispatch', [self::class,'prepareVatObject'], 10, 3);
   }

   public static function prepareVatObject($response, $customer, $request) {
      if (strpos($request->get_route(), '/wc/v3/taxes') !== false) { 
         $data = $response->get_data();
         $vat = self::extractVat($data); 
         $status = ['status'=>['code'=> 200, 'message'=>'get VAT successfully', 'data'=>$vat]];        
         $response->set_data( $status);
      }
      return $response;
   }

   public static function extractVat($data) {
     $inData = $data[0];

      return ['id' => $inData['id'], 'name' => $inData['name'], 'rate' => $inData['rate']];

   }
}

