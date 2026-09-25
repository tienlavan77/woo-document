<?php
namespace App\Api;

use App\Support\HookManager;
use App\Api\Setting\SettingApi;
use App\Api\Templates\TemplatesApi;
use App\Api\Authenticate\AuthenticateApi;
use App\Api\Documents\DocumentApi;
use App\Api\PrintFiles\PrintFileApi;

class LoadingApi {
	private $hooks;
	private $api_classes = [
		SettingApi::class,
		TemplatesApi::class,
		AuthenticateApi::class,
		DocumentApi::class,
		PrintFileApi::class,
	];
	
	public function __construct(HookManager $hooks) {
		$this->hooks = $hooks;
		$this->registerApis();
	}
	
	private function registerApis() {
		$this->hooks->addAction('rest_api_init', [$this, 'initializeApis']);
	}
	
	public function initializeApis() {
		foreach ($this->api_classes as $api_class) {
			if (class_exists($api_class) && method_exists($api_class, 'get_instance')) {				
				$api_class::get_instance();
			}
		}
	}
}
