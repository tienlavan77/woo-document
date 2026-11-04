<?php
// Provides module declarations and business logic for SubInvoiceController.php.


namespace App\Controllers\Woocommerce\Invoice;

use App\Support\HookManager;
use App\Views\Woocommerce\Invoice\SubInvoiceViewer;

if (!defined('ABSPATH')) {
   exit;
}

// Defines SubInvoiceController class behavior for SubInvoiceController.php.
class SubInvoiceController {
   protected static $instance;
   private $hooks;

   // Defines get_instance method behavior for SubInvoiceController.php.
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for SubInvoiceController.php.
   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      $this->hooks->addAction('manage_posts_extra_tablenav', [$this, 'invoiceButton'], 30, 1);
   }

   // Defines invoiceButton method behavior for SubInvoiceController.php.
   public function invoiceButton($which) {
      global $post;
      if ($post && $post->post_type == 'shop_order') SubInvoiceViewer::vatInvoiceButton();
   }
}
