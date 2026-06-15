<?php
namespace App\Controllers\Menus;

class MenuItemController {
   protected static $instance;

   public $pageTitle = ''; 
   public $menuTitle = '';
   public $menuSlug = '';  
   public $parentSlug = ''; 
   
   public $iconUrl = '';
   public $position = 32;
   public $subMenu = false;
   public $capability = '';

      //xây dựng class
   public function __construct() {
      global $pagenow;
      add_action('admin_menu', [$this, 'adminMenuRegister']);
   }
   
   /** 
   * Đăng ký một mục vào menu admin
   */
   public function adminMenuRegister() {

      if ($this->menuSlug == '' || $this->parentSlug == '') {
         return;
      }
      if ( $this->subMenu === false)       
         add_menu_page(
            $this->pageTitle,
            $this->menuTitle, // tên hiển thị trên thanh menu         
            $this->capability, // menu hiển thị với các người dùng được chỉ định: admin, shopper ...
            $this->parentSlug, // tên của trang hiển thị trên thanh địa chỉ
            [$this, 'pageContent'], // function xử lý
            $this->iconUrl,
            32
         );
      else 
      //$this->menuSlug,
      add_submenu_page(
         $this->parentSlug,         
         $this->pageTitle,
         $this->menuTitle, // tên menu hiện trên thanh side bar
         $this->capability,
         $this->menuSlug,
         [$this, 'pageContent'],
         null
      );

   }

   /**
   * chức năng hiển & xử lý trang
   */
   public function pageContent() {
      return;
   }
}
