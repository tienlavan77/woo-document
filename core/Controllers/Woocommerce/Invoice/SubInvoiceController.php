<?php 

namespace App\Controllers\Woocommerce\Invoice;

use App\Views\Woocommerce\Invoice\SubInvoiceViewer;

class SubInvoiceController {
   protected static $instance; 

	public static function get_instance() {
		if (is_null(self::$instance)) {
				self::$instance = new self();
		}
		return self::$instance;
	}

   public function __construct() {
      add_action('manage_posts_extra_tablenav', [$this, 'invoiceButton'], 30, 1);
   }

   public function invoiceButton($which) {
      global $post;
      if ($post->post_type == 'shop_order') SubInvoiceViewer::vatInvoiceButton();
   }
}
