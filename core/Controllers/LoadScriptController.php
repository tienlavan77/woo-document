<?php
// Provides module declarations and business logic for LoadScriptController.php.

namespace App\Controllers;

use App\Support\HookManager;

// Defines LoadScriptController class behavior for LoadScriptController.php.
class LoadScriptController {
    private $hooks;
    public $handle = 'app';
    public $typeJS = true;
    public $jsFile = 'assets/script/app.min.js';
    public $cssFile = 'assets/scss/app.min.css';
    public $pluginName = 'document';
    public $pages = ['edit', 'post', 'users','useredit', 'admin', 'wplogin'];
    public $type = ['product','order','user','setting','quotation','delivery', 'invoice','wplogin'];
    
    // Defines __construct method behavior for LoadScriptController.php.
    public function __construct(HookManager $hooks) {
        $this->hooks = $hooks;
        $this->registerHooks();
    }
    
    /* Executes documented symbol logic in LoadScriptController.php. */
    private function registerHooks() {
        $this->hooks->addAction('admin_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('login_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('wp_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('admin_head', [$this, 'printConfig']);
        $this->hooks->addAction('login_head', [$this, 'printConfig']);
        $this->hooks->addFilter('script_loader_tag', [$this,'moduleScript'], 10, 3);
    }
    
    /* Executes documented symbol logic in LoadScriptController.php. */
    public function importScript($hook_suffix = '') {
        global $pagenow;
        $page_name = is_string($pagenow) ? $pagenow : '';
        if (!$page_name && !empty($_SERVER['PHP_SELF'])) {
            $page_name = basename((string) $_SERVER['PHP_SELF']);
        }
        if (!$page_name && is_string($hook_suffix)) {
            $page_name = $hook_suffix . '.php';
        }
        $rightPage = $this->getPagenow($page_name);
        if (empty($rightPage['page'])) return;
        
        $link = plugins_url() . '/' . \PLUGIN_NAME . '/';
        
        $is_dev = defined('WP_DEBUG') && WP_DEBUG;
        $script_handle = null;

        if ($is_dev) {
            // Executes documented symbol logic in LoadScriptController.php.
            $dev_version = (string) time();
            $dev_server = defined('DOCUMENT_VITE_DEV_SERVER') && DOCUMENT_VITE_DEV_SERVER
                ? rtrim((string) DOCUMENT_VITE_DEV_SERVER, '/')
                : 'https://192.168.1.181:5173';
            wp_enqueue_script('document-client', $dev_server . '/@vite/client', [], $dev_version, true);
            wp_enqueue_script('document-plugin', $dev_server . '/src/main.js', [], $dev_version, true);
            $script_handle = 'document-plugin';
        } else {
            $manifest_path = PLUGIN_DIR_DOCUMENT . 'dist/.vite/manifest.json';

            if (file_exists($manifest_path)) {
                $manifest = json_decode(file_get_contents($manifest_path), true);
                $js_file = $manifest['src/main.js']['file'] ?? '';
                $asset_version = (string) filemtime($manifest_path);
                wp_enqueue_script('my-vite-plugin', PLUGIN_URL_DOCUMENT . 'dist/' . $js_file, [], $asset_version, true);
                $script_handle = 'my-vite-plugin';

                if (!empty($js_file) && isset($manifest['src/main.js']['css'])) {
                    foreach ($manifest['src/main.js']['css'] as $css_file) {
                        wp_enqueue_style('my-vite-style', PLUGIN_URL_DOCUMENT . 'dist/' . $css_file, [], $asset_version);
                    }
                }
            }
        }

        if ($script_handle) {
            $config = [
                'page' => $rightPage['page'],
                'type' => $rightPage['type'],
                'nonce' => wp_create_nonce('wp_rest'),
            ];
            wp_localize_script($script_handle, 'DocumentPluginConfig', $config);
        }

        if (in_array($rightPage['type'], ['setting'])) wp_enqueue_media();
    }
    
    /**
     * Prints the page configuration before the plugin module executes.
     */
    public function printConfig() {
        global $pagenow;
        $page_name = is_string($pagenow) ? $pagenow : '';
        if (!$page_name && !empty($_SERVER['PHP_SELF'])) {
            $page_name = basename((string) $_SERVER['PHP_SELF']);
        }
        $rightPage = $this->getPagenow($page_name);
        if (empty($rightPage['page'])) return;

        $config = [
            'page' => $rightPage['page'],
            'type' => $rightPage['type'],
            'nonce' => wp_create_nonce('wp_rest'),
        ];
        $json = wp_json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        echo '<script>window.DocumentPluginConfig = ' . $json . ';</script>';
    }

    /**
     * Module script
     */
    public function moduleScript($tag, $handle, $src) {
        if (in_array($handle, ['document-plugin', 'document-client', 'my-vite-plugin'])) {
            return '<script type="module" src="' . esc_url($src) . '" defer></script>';
        }
        return $tag;
    }
    
    /* Executes documented symbol logic in LoadScriptController.php. */
    public function getPagenow($pagenow) {
        $pagenow = is_string($pagenow) ? $pagenow : '';
        if (!$pagenow && function_exists('get_current_screen')) {
            $screen = get_current_screen();
            $base = $screen ? $screen->base : '';
            $pagenow = $base ? $base . '.php' : '';
        }
        $type = '';
        
        switch ($pagenow) {
            case 'edit.php':
                $type = $this->getEditPHPKindof();
                break;
            case 'admin.php':
                $type = isset($_GET['page']) ? $_GET['page'] : '';
                if (in_array($type, ['wc-orders', 'wc-orders--custom-view'], true)) {
                    $pagenow = 'edit.php';
                    $type = 'order';
                }
                break;
            case 'wp-login.php':
                $type = isset($_GET['page']) ? $_GET['page'] : 'wplogin';
                break;
            case 'post.php':
                $type = $this->getPostPHPKindof();
                break;
            case 'users.php':
            case 'user-edit.php':
                $type = 'user';
                break;
        }
        
        $page = str_replace('.php', '', $pagenow);
        $page = str_replace('-', '', $page);
        return ['page' => $page, 'type' => $type];
    }
    
    /**
     * Get edit php kindof
     */
    private function getEditPHPKindof() {
        $postType = $_GET['post_type'] ?? '';
        if (!$postType && function_exists('get_current_screen')) {
            $screen = get_current_screen();
            $postType = $screen ? $screen->post_type : '';
        }
        return ($postType == 'shop_order') ? 'order' : (($postType == 'product') ? 'product' : '');
    }
    
    /**
     * Get post php kindof
     */
    private function getPostPHPKindof() {
        return isset($_GET['post']) ? $this->checkPostType($_GET['post']) : '';
    }
    
    /**
     * Check post type
     */
    private function checkPostType($postId) {
        $gPost = get_post($postId);
        if (!$gPost) return '';
        if ($gPost->post_type == 'product') return 'product';
        if ($gPost->post_type == 'shop_order') return 'order';
        return '';
    }
}
