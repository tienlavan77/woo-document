<?php
// Provides module declarations and business logic for VatController.php.


namespace App\Controllers\Woocommerce\Vat;

use App\Support\HookManager;
use App\Models\Woocommerce\Vat\VatModel;

if (!defined('ABSPATH')) {
   exit;
}

// Defines VatController class behavior for VatController.php.
class VatController {
   protected static $instance;
   private $hooks;

   // Defines get_instance method behavior for VatController.php.
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for VatController.php.
   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      VatModel::init();
   }
}
