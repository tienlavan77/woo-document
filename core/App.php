<?php
namespace App;

use App\Support\ServiceContainer;
use App\Support\PluginManager;
use App\Support\MenuRegistry;
use App\Support\HookManager;
use App\Controllers\Admin\CheckTokenController;
use App\Controllers\LoadScriptController;
use App\Controllers\Menus\RegMenuController;
use App\Controllers\Woocommerce\MasterSupporterController;
use App\Controllers\Documents\DocumentController;
use App\Api\LoadingApi;

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
      $this->container->singleton('documentController', fn($c) => DocumentController::get_instance($c->get('hooks')));
      $this->container->singleton('masterSupporter', fn($c) => new MasterSupporterController($c->get('hooks')));
      $this->container->singleton('loadingApi', fn($c) => new LoadingApi($c->get('hooks')));
   }
    
   /**
    * Khởi động plugin
    */
   private function bootstrap() {
      $this->plugin_manager->require('WooCommerce', 'woocommerce/woocommerce.php');
      
      if ($this->plugin_manager->validate()) {
         $this->menu_registry->registerMultiple([
            'App\Controllers\Menus\RegMasterMenuController',
            'App\Controllers\Menus\RegMenuQuotationController',
            'App\Controllers\Menus\RegMenuDeliveryController',
            'App\Controllers\Menus\RegMenuInvoiceController',
            'App\Controllers\Menus\RegSettingMenuController',
         ]);
         
         $this->container->get('checkToken');
         $this->container->get('loadingApi');
         $this->container->get('loadScript');
         $this->container->get('masterSupporter');
         $this->container->get('documentController');
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
