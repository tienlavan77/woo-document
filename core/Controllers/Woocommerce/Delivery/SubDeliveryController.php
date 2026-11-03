<?php

namespace App\Controllers\Woocommerce\Delivery;

use App\Support\HookManager;
use App\Views\Woocommerce\Delivery\SubDeliveryViewer;

if (!defined('ABSPATH')) {
   exit;
}

class SubDeliveryController {
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

      $this->hooks->addAction('manage_posts_extra_tablenav', [$this, 'AddOrdersTodelivery'], 30, 1);
   }

   /**
    * Tạo nút lập phiếu giao hàng trên thanh toolbar của orderlist
    */
   public function AddOrdersTodelivery($which) {
      global $typenow;
      if ('shop_order' === $typenow && 'top' === $which) SubDeliveryViewer::addDeliveryInToolbar();
   }
}
