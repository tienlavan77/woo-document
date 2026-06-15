<?php
namespace App\Controllers\Woocommerce\Delivery;

use App\Views\Woocommerce\Delivery\SubDeliveryViewer;


class SubDeliveryController {
   protected static $instance;

   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   } 

   public function __construct() {
		add_action('manage_posts_extra_tablenav', [$this, 'AddOrdersTodelivery'], 30, 1);
	}
 
	/**
	* tạo nút lấp phiếu giao hàng trên thanh toolbar của orderlist
	*/
	public function AddOrdersTodelivery($which) {
		global $typenow;		
		if ('shop_order' === $typenow && 'top' === $which) SubDeliveryViewer::addDeliveryInToolbar();
	}
}


