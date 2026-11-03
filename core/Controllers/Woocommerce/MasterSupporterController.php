<?php

namespace App\Controllers\Woocommerce;

use App\Support\HookManager;
use App\Support\ServiceContainer;
use App\Controllers\Woocommerce\Product\ProductController;
use App\Controllers\Woocommerce\Quotation\SubQuotationController;
use App\Controllers\Woocommerce\Delivery\SubDeliveryController;
use App\Controllers\Woocommerce\Invoice\SubInvoiceController;
use App\Controllers\Woocommerce\User\UserController;
use App\Controllers\Woocommerce\Order\OrderController;
use App\Controllers\Woocommerce\Vat\VatController;

if (!defined('ABSPATH')) {
   exit;
}

class MasterSupporterController {
   private $hooks;
   private $container;
   private $woo_controllers = [
      'woo.product'      => ProductController::class,
      'woo.user'         => UserController::class,
      'woo.order'        => OrderController::class,
      'woo.vat'          => VatController::class,
      'woo.subQuotation' => SubQuotationController::class,
      'woo.subDelivery'  => SubDeliveryController::class,
      'woo.subInvoice'   => SubInvoiceController::class,
   ];

   public function __construct(HookManager $hooks, ?ServiceContainer $container = null) {
      $this->hooks = $hooks;
      $this->container = $container;
      $this->registerControllers();
   }
   
   private function registerControllers() {
      foreach ($this->woo_controllers as $service_name => $controller_class) {
         if ($this->container && $this->container->has($service_name)) {
            $this->container->get($service_name);
            continue;
         }
         if (class_exists($controller_class) && method_exists($controller_class, 'get_instance')) {
            $controller_class::get_instance($this->hooks);
         }
      }
   }
}
