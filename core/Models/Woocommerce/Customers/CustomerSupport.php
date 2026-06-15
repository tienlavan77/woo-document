<?php
namespace App\Models\Woocommerce\Customers;

class CustomerSupport {

   public static function extractCustomer($id) {
      $meta = get_user_meta($id);

      // Định nghĩa: 'meta_key' => 'tên_muốn_hiển_thị'
      $mapping = [
         'first_name'         => 'first_name',
         'last_name'          => 'last_name',
         'billing_first_name' => 'first_name',
         'billing_last_name'  => 'last_name',
         'billing_company'    => 'company',
         'billing_address_1'  => 'billing',
         'shipping_address_1' => 'shipping',
         'billing_phone'      => 'phone',
         'billing_email'      => 'email',
         'billing_fax'        => 'fax',
         'billing_taxcode'    => 'taxcode',
         'billing_sex'        => 'sex'
      ];

      $result = ['id' => $id];

      foreach ($mapping as $meta_key => $result_key) {
         // Sử dụng toán tử ?? để tránh lỗi nếu meta không tồn tại
         $result[$result_key] = $meta[$meta_key][0] ?? '';
      }

      return $result;
      
   }
  
}
