<?php
// Provides module declarations and business logic for LoadingApi.php.


namespace App\Api;

use App\Support\HookManager;
use App\Support\ServiceContainer;
use App\Api\Setting\SettingApi;
use App\Api\Templates\TemplatesApi;
use App\Api\Authenticate\AuthenticateApi;
use App\Api\Documents\DocumentApi;
use App\Api\PrintFiles\PrintFileApi;

if (!defined('ABSPATH')) {
	exit;
}

// Defines LoadingApi class behavior for LoadingApi.php.
class LoadingApi {
	private $hooks;
	private $container;
	private $api_classes = [
		'settingApi'      => SettingApi::class,
		'templatesApi'    => TemplatesApi::class,
		'authenticateApi' => AuthenticateApi::class,
		'documentApi'     => DocumentApi::class,
		'printFileApi'    => PrintFileApi::class,
	];
	
	// Defines __construct method behavior for LoadingApi.php.
	public function __construct(HookManager $hooks, ?ServiceContainer $container = null) {
		$this->hooks = $hooks;
		$this->container = $container;
		$this->registerApis();
	}
	
	// Defines registerApis method behavior for LoadingApi.php.
	private function registerApis() {
		$this->hooks->addAction('rest_api_init', [$this, 'initializeApis']);
	}
	
	// Defines initializeApis method behavior for LoadingApi.php.
	public function initializeApis() {
		foreach ($this->api_classes as $service_name => $api_class) {
			if ($this->container && $this->container->has($service_name)) {
				$this->container->get($service_name);
				continue;
			}
			if (class_exists($api_class) && method_exists($api_class, 'get_instance')) {
				$api_class::get_instance();
			}
		}
	}
}
