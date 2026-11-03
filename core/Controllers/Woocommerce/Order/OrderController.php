<?php

namespace App\Controllers\Woocommerce\Order;

use App\Support\HookManager;
use App\Models\Woocommerce\Order\OrderModel;

if (!defined('ABSPATH')) {
   exit;
}

class OrderController {
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

      $this->hooks->addAction('admin_init', [$this, 'addCustomerIdIntoCheckbox'], 10);
      OrderModel::prepareOrders();
   }

   public function addCustomerIdIntoCheckbox() {
      global $pagenow;
      // Chỉ kích hoạt khi đang ở trang danh sách đơn hàng
      if (is_admin() && $pagenow === 'edit.php' && ($_GET['post_type'] ?? '') === 'shop_order') {
         ob_start([$this, 'renderCustomerIdIntoCheckbox']);
      }
   }

   public function renderCustomerIdIntoCheckbox($buffer) {
      // Regex tìm thẻ input có ID là cb-select-{ID}
      return preg_replace_callback(
         '/<input id="cb-select-(\d+)"[^>]*value="(\d+)"[^>]*>/',
         function ($matches) {
            $order_id = $matches[1];
            $order = wc_get_order($order_id);

            if ($order) {
               $customer_id = $order->get_customer_id();
               // Chèn data-customer-id vào ngay sau chữ <input
               return str_replace('<input', '<input data-customerid="' . esc_attr($customer_id) . '"', $matches[0]);
            }
            return $matches[0];
         },
         $buffer
      );
   }
}
