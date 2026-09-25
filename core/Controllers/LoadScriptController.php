<?php
namespace App\Controllers;

use App\Support\HookManager;

class LoadScriptController {
    private $hooks;
    public $handle = 'app';
    public $typeJS = true;
    public $jsFile = 'assets/script/app.min.js';
    public $cssFile = 'assets/scss/app.min.css';
    public $pluginName = 'document';
    public $pages = ['edit', 'post', 'users','useredit', 'admin', 'wplogin'];
    public $type = ['product','order','user','setting','quotation','delivery', 'invoice','wplogin'];
    
    public function __construct(HookManager $hooks) {
        $this->hooks = $hooks;
        $this->registerHooks();
    }
    
    /**
     * Đăng ký hooks thay vì trong constructor
     */
    private function registerHooks() {
        $this->hooks->addAction('admin_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('login_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('wp_enqueue_scripts', [$this, 'importScript']);
        $this->hooks->addAction('admin_head', [$this, 'setPagename']);
        $this->hooks->addAction('login_head', [$this, 'setPagename']);
        $this->hooks->addFilter('script_loader_tag', [$this,'moduleScript'], 10, 3);
    }
    
    /**
     * Kiểm tra trang và load javascript
     */
    public function importScript() {
        global $pagenow;
        $rightPage = $this->getPagenow($pagenow);
        
        $link = plugins_url() . '/' . \PLUGIN_NAME . '/';
        
        $is_dev = defined('WP_DEBUG') && WP_DEBUG;
        
        if ($is_dev) {
            // WP_DEBUG dùng Vite dev server. Luôn đổi version để trình duyệt
            // không giữ lại module cũ sau khi sửa source frontend.
            $dev_version = (string) time();
            wp_enqueue_script('document-client', 'https://192.168.1.181:5173/@vite/client', [], $dev_version, true);
            wp_enqueue_script('document-plugin', 'https://192.168.1.181:5173/src/main.js', [], $dev_version, true);
        } else {
            $manifest_path = PLUGIN_DIR_DOCUMENT . 'dist/.vite/manifest.json';
            
            if (file_exists($manifest_path)) {
                $manifest = json_decode(file_get_contents($manifest_path), true);
                $js_file = $manifest['src/main.js']['file'] ?? '';
                $asset_version = (string) filemtime($manifest_path);
                wp_enqueue_script('my-vite-plugin', PLUGIN_URL_DOCUMENT . 'dist/' . $js_file, [], $asset_version, true);
                
                if (!empty($js_file) && isset($manifest['src/main.js']['css'])) {
                    foreach ($manifest['src/main.js']['css'] as $css_file) {
                        wp_enqueue_style('my-vite-style', PLUGIN_URL_DOCUMENT . 'dist/' . $css_file, [], $asset_version);
                    }
                }
            }
        }
        
        if (in_array($rightPage['type'], ['setting'])) wp_enqueue_media();
    }
    
    /**
     * Set page name
     */
    public function setPagename() {
        global $pagenow;
        $rightPage = $this->getPagenow($pagenow);
        if (in_array($rightPage['page'], $this->pages)) {
            echo '<meta name="wp-api-nonce" content="' . wp_create_nonce('wp_rest') . '">';
            echo '<meta data-page=' . json_encode($rightPage) . ' id=pagenow>';
        }
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
    
    /**
     * Lấy page hiện tại
     */
    public function getPagenow($pagenow) {
        $type = '';
        
        switch ($pagenow) {
            case 'edit.php':
                $type = $this->getEditPHPKindof();
                break;
            case 'admin.php':
                $type = isset($_GET['page']) ? $_GET['page'] : '';
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
        if (isset($_GET['post_type'])) {
            $postType = $_GET['post_type'];
            return ($postType == 'shop_order') ? 'order' : (($postType == 'product') ? 'product' : '');
        }
        return '';
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
        if ($gPost->post_type == 'product') return 'product';
        if ($gPost->post_type == 'shop_order') return 'order';
        return '';
    }
}
