<?php
namespace App\Support;

class PluginManager {
    private $required_plugins = [];
    private $errors = [];
    
    /**
     * Thêm plugin bắt buộc
     */
    public function require($plugin_name, $plugin_file) {
        $this->required_plugins[$plugin_name] = $plugin_file;
    }
    
    /**
     * Xác minh tất cả plugin
     */
    public function validate() { 
        $this->errors = [];
        
        foreach ($this->required_plugins as $name => $file) {
            if (!class_exists($name) && !$this->isPluginActive($file)) {
                $this->errors[$name] = "Plugin '{$name}' is required but not installed or activated";
            }
        }
        
        return empty($this->errors);
    }
    
    /**
     * Kiểm tra plugin có active
     */
    private function isPluginActive($plugin_file) {
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        return is_plugin_active($plugin_file);
    }
    
    /**
     * Lấy danh sách lỗi
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * Lấy thông báo lỗi HTML
     */
    public function getErrorHTML() {
        $html = '';
        foreach ($this->errors as $name => $message) {
            $html .= '<div class="error notice is-dismissible">';
            $html .= '<p><b>' . esc_html($name) . ':</b> ' . esc_html($message) . '</p>';
            $html .= '</div>';
        }
        return $html;
    }
}
