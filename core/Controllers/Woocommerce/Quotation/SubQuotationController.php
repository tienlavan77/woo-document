<?php
namespace App\Controllers\Woocommerce\Quotation;

use App\Views\Woocommerce\Quotation\SubQuotationViewer;

class SubQuotationController {
   protected static $instance;

   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   } 

   public function __construct() {

      // thêm dòng thêm người vào báo giá ở trang danh sách users
      add_filter('user_row_actions', [$this, 'addUserToQuotation'], 30, 2);

      // tạo 1 button lập báo giá vào toolbar order list
      add_action('manage_posts_extra_tablenav', [$this, 'addOrdersToQuotation'], 10, 1);

      //thêm một button lập báo giá dưới mỗi sản phẩm trong trang chỉnh sửa sản phẩm
      add_action('woocommerce_product_options_general_product_data', [$this, 'addParentProductToQuotation'], 30);

      //thêm một button vào mỗi biến thể của sản phẩm
      add_action('woocommerce_product_after_variable_attributes', [$this, 'addVariationProductToQuotation'], 10, 3);

   }
          
   /**
   * Thêm người mua vào thông tin báo giá
   */
   public function addUserToQuotation($actions, $user) {
      if ($user->roles[0] == 'customer') {
         $datajs = ['id' => $user->ID, 'type' => 'user'];
         $addtopplink = SubQuotationViewer::addObjectToQuotationLink($datajs,'');
         $actions = array_merge($actions, array('addtopp' => $addtopplink));
      }
      return $actions;
   }

   /** 
   * Tạo button lập báo giá tại toolbar của order list 
   *
   */
   public function addOrdersToQuotation($which) {
      global $typenow;
      if (('shop_order' === $typenow || 'product' === $typenow) && 'top' === $which) {
         SubQuotationViewer::quotationButtonOnToolbarOrder($typenow);
      }
   }

   /**
   * Thêm một button vào tab general để thêm 1 sản phẩm đơn
   * hoặc tất cả các biến thể vào báo giá
   */
   public function addParentProductToQuotation() {
      $data = array('id' => (int) $_GET['post'], 'type' => 'product', 'parent_id' => 0);
      echo SubQuotationViewer::addProductToQuotationAtGeneral( $data, 'button');      
   }

   /**
   * thêm một link thêm 1 biến thể vào báo giá
   */
   public function addVariationProductToQuotation($loop, $variation_data, $variation) {
      $datajs = array('id' => $variation->ID, 'type' => 'product', 'parent_id' => $variation->post_parent);
      echo SubQuotationViewer::addObjectToQuotationLink($datajs, 'button');      
   }

}

