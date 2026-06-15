<?php
namespace App\Controllers\Woocommerce\Vat;

use App\Models\Woocommerce\Vat\VatModel;


class VatController {
   protected static $instance;

   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }
   
   public function __construct() {
      VatModel::init();
   }
}
