<?php
// Provides module declarations and business logic for SubDeliveryController.php.


namespace App\Controllers\Woocommerce\Delivery;

use App\Support\HookManager;
use App\Views\Woocommerce\Delivery\SubDeliveryViewer;

if (!defined('ABSPATH')) {
   exit;
}

// Defines SubDeliveryController class behavior for SubDeliveryController.php.
class SubDeliveryController {
   protected static $instance;
   private $hooks;

   // Defines get_instance method behavior for SubDeliveryController.php.
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for SubDeliveryController.php.
   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      $this->hooks->addAction('manage_posts_extra_tablenav', [$this, 'AddOrdersTodelivery'], 30, 1);
   }

   /* Executes documented symbol logic in SubDeliveryController.php. */
   public function AddOrdersTodelivery($which) {
      global $typenow;
      if ('shop_order' === $typenow && 'top' === $which) SubDeliveryViewer::addDeliveryInToolbar();
   }
}
