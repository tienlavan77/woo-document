<?php

namespace App\Controllers\Woocommerce\Invoice;

use App\Support\HookManager;
use App\Views\Woocommerce\Invoice\SubInvoiceViewer;

if (!defined('ABSPATH')) {
   exit;
}

class SubInvoiceController {
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

      $this->hooks->addAction('manage_posts_extra_tablenav', [$this, 'invoiceButton'], 30, 1);
   }

   public function invoiceButton($which) {
      global $post;
      if ($post && $post->post_type == 'shop_order') SubInvoiceViewer::vatInvoiceButton();
   }
}
