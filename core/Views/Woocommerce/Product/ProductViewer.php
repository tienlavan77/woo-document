<?php

namespace App\Views\Woocommerce\Product;

class ProductViewer {

   public static function productUnit() {
      woocommerce_wp_text_input( [ 'id' => '_unit_product', 'class' => 'short', 'label' => __( 'Đơn vị', 'woocommerce' )]);
   }

   public static function productNameInvoice() {
      woocommerce_wp_text_input( [ 'id' => '_name_invoice', 'class' => 'short', 'label' => __( 'Tên trong hóa đơn', 'woocommerce' )]);
   }
}