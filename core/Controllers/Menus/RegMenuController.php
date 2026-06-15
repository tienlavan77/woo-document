<?php 
namespace App\Controllers\Menus;

use App\Support\MenuRegistry;

class RegMenuController {
   private $menu_registry;
   
   public function __construct(MenuRegistry $menu_registry = null) {
      $this->menu_registry = $menu_registry ?? new MenuRegistry();
      $this->registerMenus();
   }
   
   private function registerMenus() {
      $menu_classes = [
         RegMasterMenuController::class, 
         RegMenuQuotationController::class,
         RegMenuDeliveryController::class,
         RegMenuInvoiceController::class,
         RegSettingMenuController::class,
      ];
      
      $this->menu_registry->registerMultiple($menu_classes);
   }
   
   public function getMenuRegistry() {
      return $this->menu_registry;
   }
}