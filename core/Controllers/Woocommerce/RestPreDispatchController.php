<?php
namespace App\Controllers\Woocommerce;

class RestPreDispatchController {
   protected static $instance; 

	public static function get_instance() {
		if (is_null(self::$instance)) {
				self::$instance = new self();
		}
		return self::$instance;
	}

   public function __construct() {
      // add_filter('woocommerce_rest_check_permissions', [$this, 'restPreDispatch'], 10, 3);
   }

   public static function restPreDispatch($permission, $context, $object_id) {            
      global $wp;      

      // $request = rest_get_request();
      if ( strpos(  $wp->request, '/wc/v3' ) !== false ) {
         return isset($_COOKIE[ACCESS_KEY]);
      } 
      return $permission;
   }

}

