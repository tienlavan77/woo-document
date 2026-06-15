<?php 
namespace App\Views\Woocommerce\Order;

class OrderViewer {
   public static function addHiddenInput( $value) {
      return '<input type="hidden" name="customerid" value="' . $value . '"/>';
   }
}
