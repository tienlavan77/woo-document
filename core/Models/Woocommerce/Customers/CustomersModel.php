<?php 
namespace App\Models\Woocommerce\Customers;

use App\Models\Woocommerce\Customers\CustomerSupport;
use App\Support\PluginRequest;

class CustomersModel {
   
   public static function init() {
      add_filter('rest_post_dispatch', [self::class,'prepareCustomerObject'], 10, 3);
   }

   public static function prepareCustomerObject($response, $customer, $request) { 
     if (!PluginRequest::is($request)) {
         return $response;
     }

     if (strpos($request->get_route(), '/wc/v3/customers') !== false) {
         $data = $response->get_data();
         $id = $data['id'];
         $extract = CustomerSupport::extractCustomer($id);        
         $response->set_data( $extract);
      }
    return $response;
   }
  
}
