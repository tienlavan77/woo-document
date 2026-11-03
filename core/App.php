<?php

namespace App;

use App\Support\ServiceContainer;
use App\Support\PluginManager;
use App\Support\MenuRegistry;
use App\Support\HookManager;
use App\Controllers\Admin\CheckTokenController;
use App\Controllers\LoadScriptController;
use App\Controllers\Woocommerce\MasterSupporterController;
use App\Controllers\Woocommerce\Product\ProductController;
use App\Controllers\Woocommerce\User\UserController;
use App\Controllers\Woocommerce\Order\OrderController;
use App\Controllers\Woocommerce\Vat\VatController;
use App\Controllers\Woocommerce\Quotation\SubQuotationController;
use App\Controllers\Woocommerce\Delivery\SubDeliveryController;
use App\Controllers\Woocommerce\Invoice\SubInvoiceController;
use App\Controllers\Documents\DocumentController;
use App\Support\SystemFolderManager;
use App\Support\PrintDatabase;
use App\Api\LoadingApi;
use App\Api\Setting\SettingApi;
use App\Api\Templates\TemplatesApi;
use App\Api\Authenticate\AuthenticateApi;
use App\Api\Documents\DocumentApi;
use App\Api\PrintFiles\PrintFileApi;

if (!defined('ABSPATH')) {
   exit;
}

class App {
   protected static $instance;
   protected $container;
   protected $plugin_manager;
   protected $menu_registry;
   protected $hook_manager;
   
   public static function get_instance() {
      if (is_null(self::$instance)) {
          self::$instance = new self();
      }
      return self::$instance;
   }

   public function __construct() {
      $this->initializeContainer(); 
      $this->registerServices();
      $this->bootstrap();
   }
   
   /**
    * Khởi tạo DI Container
    */
   private function initializeContainer() {
      $this->container = new ServiceContainer();
      $this->hook_manager = new HookManager();
      $this->plugin_manager = new PluginManager();
      $this->menu_registry = new MenuRegistry();
   }
   
   /**
    * Đăng ký tất cả services
    */
   private function registerServices() {
      $this->container->singleton('hooks', fn($c) => $this->hook_manager);
      $this->container->singleton('checkToken', fn($c) => new CheckTokenController($c->get('hooks')));
      $this->container->singleton('loadScript', fn($c) => new LoadScriptController($c->get('hooks')));
      $this->container->singleton('documentController', fn($c) => new DocumentController($c->get('hooks')));

      // WooCommerce sub-controllers managed through container & HookManager
      $this->container->singleton('woo.product', fn($c) => new ProductController($c->get('hooks')));
      $this->container->singleton('woo.user', fn($c) => new UserController($c->get('hooks')));
      $this->container->singleton('woo.order', fn($c) => new OrderController($c->get('hooks')));
      $this->container->singleton('woo.vat', fn($c) => new VatController($c->get('hooks')));
      $this->container->singleton('woo.subQuotation', fn($c) => new SubQuotationController($c->get('hooks')));
      $this->container->singleton('woo.subDelivery', fn($c) => new SubDeliveryController($c->get('hooks')));
      $this->container->singleton('woo.subInvoice', fn($c) => new SubInvoiceController($c->get('hooks')));
      $this->container->singleton('masterSupporter', fn($c) => new MasterSupporterController($c->get('hooks'), $c));

      // REST APIs managed through container
      $this->container->singleton('settingApi', fn($c) => new SettingApi());
      $this->container->singleton('templatesApi', fn($c) => new TemplatesApi());
      $this->container->singleton('authenticateApi', fn($c) => new AuthenticateApi());
      $this->container->singleton('documentApi', fn($c) => new DocumentApi($c->get('documentController'), $c->get('hooks')));
      $this->container->singleton('printFileApi', fn($c) => new PrintFileApi());
      $this->container->singleton('loadingApi', fn($c) => new LoadingApi($c->get('hooks'), $c));
   }
    
   /**
    * Khởi động plugin
    */
   private function bootstrap() {
      $this->plugin_manager->require('WooCommerce', 'woocommerce/woocommerce.php');
      
      if ($this->plugin_manager->validate()) {
         PrintDatabase::ensureTables();
         SystemFolderManager::ensureConfigured();

         $this->menu_registry->registerMultiple([
            'App\Controllers\Menus\RegMasterMenuController',
            'App\Controllers\Menus\RegMenuQuotationController',
            'App\Controllers\Menus\RegMenuDeliveryController',
            'App\Controllers\Menus\RegMenuInvoiceController',
            'App\Controllers\Menus\RegSettingMenuController',
         ]);
         
         $this->container->get('checkToken');
         $this->container->get('documentController');
         $this->container->get('loadingApi');
         $this->container->get('loadScript');
         $this->container->get('masterSupporter');
      } else {
         $this->hook_manager->addAction('admin_notices', function() {
            echo $this->plugin_manager->getErrorHTML();
         });
      }
   }
   
   /**
    * Lấy container (cho testing)
    */
   public function getContainer() {
      return $this->container;
   }
   
   /**
    * Lấy plugin manager
    */
   public function getPluginManager() {
      return $this->plugin_manager;
   }
   
   /**
    * Lấy menu registry
    */
   public function getMenuRegistry() {
      return $this->menu_registry;
   }
}
