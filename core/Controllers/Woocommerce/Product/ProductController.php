<?php

namespace App\Controllers\Woocommerce\Product;

use App\Views\Woocommerce\Product\ProductViewer;
use App\Models\Woocommerce\Product\ProductModel;

class ProductController {
   protected static $instance;    
   /**
    * khởi tạo 1 class
   */
   public static function get_instance(){
      if( is_null( self::$instance ) ){ 
            self::$instance = new self();
      }
      return self::$instance;
   }

   public function __construct() {
      add_action( 'woocommerce_product_options_general_product_data',[ProductViewer::class,'productUnit'],10);
      add_action( 'woocommerce_product_options_general_product_data',[ProductViewer::class,'productNameInvoice'],20);
      add_action( 'save_post', [$this,'saveCostPriceSingleProduct']); 
      ProductModel::init();
     
   }     

   // method lưu đơn vị tính và tên trong hoá đơn của sản phẩm
   public function saveCostPriceSingleProduct($product_id) {
      if (wp_verify_nonce(isset($_POST['_inline_edit']), 'inlineeditnonce'))
         return;   
      if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE )
         return;        
      
      if (isset($_POST['_unit_product']))               
         $result = ProductModel::metaUpdate( $product_id, '_unit_product', $_POST['_unit_product'] ); 
       
      if (isset($_POST['_name_invoice']))       
         $result = ProductModel::metaUpdate( $product_id, '_name_invoice', $_POST['_name_invoice'] ); 
               
   }  

   

}
