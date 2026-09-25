<?php 
namespace App\Controllers\Menus;

use App\Controllers\Menus\MenuItemController;
use App\Views\Setting\SettingViewer;


class RegSettingMenuController extends MenuItemController {

   protected static $instance;

   public $pageTitle = 'Setting';
   public $menuTitle = 'Setting';
   public $parentSlug = 'quotation';   
   public $iconUrl = 'dashicons-portfolio';
   public $capability = 'manage_options';
   public $subMenu = true;
   public $menuSlug = 'setting';

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
      SettingViewer::show();
   }

}


