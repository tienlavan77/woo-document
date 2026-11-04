<?php
// Provides module declarations and business logic for SubQuotationController.php.


namespace App\Controllers\Woocommerce\Quotation;

use App\Support\HookManager;
use App\Views\Woocommerce\Quotation\SubQuotationViewer;

if (!defined('ABSPATH')) {
   exit;
}

// Defines SubQuotationController class behavior for SubQuotationController.php.
class SubQuotationController {
   protected static $instance;
   private $hooks;

   // Defines get_instance method behavior for SubQuotationController.php.
   public static function get_instance(?HookManager $hooks = null) {
      if (is_null(self::$instance)) {
         self::$instance = new self($hooks);
      }
      return self::$instance;
   }

   // Defines __construct method behavior for SubQuotationController.php.
   public function __construct(?HookManager $hooks = null) {
      $this->hooks = $hooks ?? new HookManager();
      self::$instance = $this;

      // Executes documented symbol logic in SubQuotationController.php.
      $this->hooks->addFilter('user_row_actions', [$this, 'addUserToQuotation'], 30, 2);

      // Executes documented symbol logic in SubQuotationController.php.
      $this->hooks->addAction('manage_posts_extra_tablenav', [$this, 'addOrdersToQuotation'], 10, 1);

      // Executes documented symbol logic in SubQuotationController.php.
      $this->hooks->addAction('woocommerce_product_options_general_product_data', [$this, 'addParentProductToQuotation'], 30);

      // Executes documented symbol logic in SubQuotationController.php.
      $this->hooks->addAction('woocommerce_product_after_variable_attributes', [$this, 'addVariationProductToQuotation'], 10, 3);
   }

   /* Executes documented symbol logic in SubQuotationController.php. */
   public function addUserToQuotation($actions, $user) {
      if ($user->roles[0] == 'customer') {
         $datajs = ['id' => $user->ID, 'type' => 'user'];
         $addtopplink = SubQuotationViewer::addObjectToQuotationLink($datajs, '');
         $actions = array_merge($actions, array('addtopp' => $addtopplink));
      }
      return $actions;
   }

   /* Executes documented symbol logic in SubQuotationController.php. */
   public function addOrdersToQuotation($which) {
      global $typenow;
      if (('shop_order' === $typenow || 'product' === $typenow) && 'top' === $which) {
         SubQuotationViewer::quotationButtonOnToolbarOrder($typenow);
      }
   }

   /* Executes documented symbol logic in SubQuotationController.php. */
   public function addParentProductToQuotation() {
      $data = array('id' => (int) $_GET['post'], 'type' => 'product', 'parent_id' => 0);
      echo SubQuotationViewer::addProductToQuotationAtGeneral($data, 'button');
   }

   /* Executes documented symbol logic in SubQuotationController.php. */
   public function addVariationProductToQuotation($loop, $variation_data, $variation) {
      $datajs = array('id' => $variation->ID, 'type' => 'product', 'parent_id' => $variation->post_parent);
      echo SubQuotationViewer::addObjectToQuotationLink($datajs, 'button');
   }
}
