<?php
// Provides module declarations and business logic for OrderController.php.


namespace App\Controllers\Woocommerce\Order;

use App\Support\HookManager;
use App\Models\Woocommerce\Order\OrderModel;

if (!defined('ABSPATH')) {
   exit;
}

// Defines OrderController class behavior for OrderController.php.
class OrderController {
   protected static $instance;
   private $hooks;

   /* Executes documented symbol logic in OrderController.php. */
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for OrderController.php.
   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      $this->hooks->addAction('admin_init', [$this, 'addCustomerIdIntoCheckbox'], 10);
      OrderModel::prepareOrders();
   }

   // Defines addCustomerIdIntoCheckbox method behavior for OrderController.php.
   public function addCustomerIdIntoCheckbox() {
      global $pagenow;
      // Executes documented symbol logic in OrderController.php.
      if (is_admin() && $pagenow === 'edit.php' && ($_GET['post_type'] ?? '') === 'shop_order') {
         ob_start([$this, 'renderCustomerIdIntoCheckbox']);
      }
   }

   // Defines renderCustomerIdIntoCheckbox method behavior for OrderController.php.
   public function renderCustomerIdIntoCheckbox($buffer) {
      // Executes documented symbol logic in OrderController.php.
      return preg_replace_callback(
         '/<input id="cb-select-(\d+)"[^>]*value="(\d+)"[^>]*>/',
         function ($matches) {
            $order_id = $matches[1];
            $order = wc_get_order($order_id);

            if ($order) {
               $customer_id = $order->get_customer_id();
               // Executes documented symbol logic in OrderController.php.
               return str_replace('<input', '<input data-customerid="' . esc_attr($customer_id) . '"', $matches[0]);
            }
            return $matches[0];
         },
         $buffer
      );
   }
}
