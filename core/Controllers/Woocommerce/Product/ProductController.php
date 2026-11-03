<?php

namespace App\Controllers\Woocommerce\Product;

use App\Support\HookManager;
use App\Views\Woocommerce\Product\ProductViewer;
use App\Models\Woocommerce\Product\ProductModel;

if (!defined('ABSPATH')) {
   exit;
}

class ProductController {
   protected static $instance;
   private $hooks;

   /**
    * Khởi tạo 1 class
    */
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      $this->hooks->addAction('woocommerce_product_options_general_product_data', [ProductViewer::class, 'productUnit'], 10);
      $this->hooks->addAction('woocommerce_product_options_general_product_data', [ProductViewer::class, 'productNameInvoice'], 20);
      $this->hooks->addAction('save_post', [$this, 'saveCostPriceSingleProduct']);
      ProductModel::init();
   }

   // method lưu đơn vị tính và tên trong hoá đơn của sản phẩm
   public function saveCostPriceSingleProduct($product_id) {
      if (wp_verify_nonce(isset($_POST['_inline_edit']), 'inlineeditnonce'))
         return;
      if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
         return;

      if (isset($_POST['_unit_product']))
         $result = ProductModel::metaUpdate($product_id, '_unit_product', $_POST['_unit_product']);

      if (isset($_POST['_name_invoice']))
         $result = ProductModel::metaUpdate($product_id, '_name_invoice', $_POST['_name_invoice']);
   }
}
