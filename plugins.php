<?php
define('TEMPLATES_DIR_DOCUMENT', PLUGIN_DIR_DOCUMENT . '/templates' );
define('SECRET_KEY_DOCUMENT', '2hm3ePeIQ8u3aQQp9DYTXNt7uiWW4QcA');
define('NAME_SPACE_DOCUMENT', 'tinsinhphat/v1');
define('ACCESS_KEY','access_jwt_token');
define('REFRESH_KEY','refresh_jwt_token');
define ('PLUGIN_NAME','document');

// 1. Tải Autoloader (tuyệt đối cần thiết)
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
   require_once __DIR__ . '/vendor/autoload.php';
}
use App\App;
return App::get_instance();  
