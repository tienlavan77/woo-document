<?php
/**
 * Plugin Name: Documents for commercial
 * Plugin URI:  https://yourwebsite.com/
 * Description: Create quotation, delivery, VAT invoice ....
 * Version:     1.0.0
 * Author:      La Vn Tin
 * Author URI:  https://yourwebsite.com/
 * License:     GPL2
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: indepgiasi.com
 * Domain Path: /languages
 */

use App\App;

define('REQUIRED_PLUGIN_FILE', 'woocommerce/woocommerce.php');
define('REQUIRED_PLUGIN_NAME', 'WooCommerce');
define('PLUGIN_DIR_DOCUMENT', plugin_dir_path(__FILE__));
define('PLUGIN_URL_DOCUMENT', plugin_dir_url(__FILE__));
define('TEMPLATES_DIR_DOCUMENT', PLUGIN_DIR_DOCUMENT . '/templates' );
define('NAME_SPACE_DOCUMENT', 'tinsinhphat/v1');
define('ACCESS_KEY','access_jwt_token');
define('REFRESH_KEY','refresh_jwt_token');
define ('PLUGIN_NAME','document');

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('is_plugin_active')) {
    require_once ABSPATH . 'wp-admin/includes/plugin.php';
}

if (!class_exists('Tinsinhphat')) {
    class Tinsinhphat {
        protected static $instance;
        private $app;
        
        public static function get_instance() {
            if (is_null(self::$instance)) {
                self::$instance = new self();
            }
            return self::$instance;
        }
        
        public function __construct() {
            add_action('plugins_loaded', [$this, 'init']);
        }
        
        public function init() {
            if (file_exists(__DIR__ . '/vendor/autoload.php')) {
                require_once __DIR__ . '/vendor/autoload.php';
            }
            
           
            $this->app = App::get_instance();
            
            $plugin_basename = plugin_basename(__FILE__);
            add_filter("plugin_action_links_{$plugin_basename}", [$this, 'pluginSettingLink']);
        }
        
        public function pluginSettingLink($links) {
            $settings_url = admin_url('admin.php?page=setting');
            $settings_link = '<a href="' . esc_url($settings_url) . '">Setting</a>';
            array_push($links, $settings_link);
            return $links;
        }
    }
}

Tinsinhphat::get_instance();