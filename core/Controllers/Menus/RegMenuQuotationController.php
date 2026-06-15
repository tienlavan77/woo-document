<?php
namespace App\Controllers\Menus;

use App\Controllers\Menus\MenuItemController;
use App\Views\Quotation\QuotationViewer;

class RegMenuQuotationController extends MenuItemController {
   protected static $instance;

   public $pageTitle = 'Quotation Document';
   public $menuTitle = 'Quotation';
   public $parentSlug = 'quotation';   
   public $iconUrl = 'dashicons-portfolio';
   public $capability = 'manage_woocommerce';
   public $subMenu = true;
   public $menuSlug = 'quotation';

   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

     /**
   * chức năng hiển & xử lý trang
   */
   public function pageContent() {
      QuotationViewer::show();
   }

}


