<?php 
namespace App\Controllers\Woocommerce;

use App\Support\HookManager;
use App\Controllers\Woocommerce\Product\ProductController;
use App\Controllers\Woocommerce\Quotation\SubQuotationController;
use App\Controllers\Woocommerce\Delivery\SubDeliveryController;
use App\Controllers\Woocommerce\Invoice\SubInvoiceController;
use App\Controllers\Woocommerce\User\UserController;
use App\Controllers\Woocommerce\Order\OrderController;
use App\Controllers\Woocommerce\Vat\VatController;

class MasterSupporterController {
   private $hooks;
   private $woo_controllers = [
      ProductController::class,
      UserController::class,
      OrderController::class,
      VatController::class,
      SubQuotationController::class,
      SubDeliveryController::class,
      SubInvoiceController::class,
   ];

   public function __construct(HookManager $hooks) {
      $this->hooks = $hooks;
      $this->registerControllers();
   }
   
   private function registerControllers() {
      foreach ($this->woo_controllers as $controller_class) {
         if (class_exists($controller_class) && method_exists($controller_class, 'get_instance')) {
            $controller_class::get_instance();
         }
      }
   }
}