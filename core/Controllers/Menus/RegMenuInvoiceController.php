<?php
namespace App\Controllers\Menus;

use App\Controllers\Menus\MenuItemController;
use App\Views\Invoice\InvoiceViewer;

class RegMenuInvoiceController extends MenuItemController {
   protected static $instance;

   public $pageTitle = 'Invoice document';
   public $menuTitle = 'Invoice';
   public $parentSlug = 'quotation';   
   public $iconUrl = 'dashicons-portfolio';
   public $capability = 'manage_woocommerce';
   public $subMenu = true;
   public $menuSlug = 'invoice';

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
      InvoiceViewer::show();
   }

}


