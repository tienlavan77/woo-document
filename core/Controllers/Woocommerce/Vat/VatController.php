<?php

namespace App\Controllers\Woocommerce\Vat;

use App\Support\HookManager;
use App\Models\Woocommerce\Vat\VatModel;

if (!defined('ABSPATH')) {
   exit;
}

class VatController {
   protected static $instance;
   private $hooks;

   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      VatModel::init();
   }
}
