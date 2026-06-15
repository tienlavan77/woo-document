<?php
namespace App\Controllers\Menus;

use App\Controllers\Menus\MenuItemController;

class RegMasterMenuController extends MenuItemController { 

   protected static $instance;

   public $pageTitle = 'Quotation';
   public $menuTitle = 'Documents';
   public $parentSlug = 'quotation';   
   public $iconUrl = 'dashicons-portfolio';
   public $capability = 'manage_woocommerce';
   public $subMenu = false;
   public $menuSlug = 'default';

   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

   /**
   * chức năng hiển & xử lý trang
   */
   // public function pageContent() {
   //    QuotationViewer::show();
   // }
}