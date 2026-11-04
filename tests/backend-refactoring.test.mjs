/* Provides module implementation and exported declarations for backend-refactoring.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = process.cwd();

test('O1: Dead code, boilerplate, .khtml và package-lock.json đã được dọn sạch, giữ nguyên KEEP_PATHS', () => {
   const removedFiles = [
      'src/assets/scripts/Models/documentController.js',
      'core/Controllers/Menus/RegMenuController.php',
      'templates/quotation/templateone.min.khtml',
      'index.html',
      'src/assets/images/vite.svg',
      'src/assets/images/javascript.svg',
      'src/assets/images/hero.png',
      'package-lock.json',
      'src/assets/scripts/app.min.js',
   ];

   for (const file of removedFiles) {
      assert.equal(fs.existsSync(path.join(ROOT_DIR, file)), false, `File phải được xóa: ${file}`);
   }

   const keptFiles = [
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'src/assets/scripts/app.js',
      'src/assets/scripts/Vendor/helpers/loadModule.js',
      'src/assets/scripts/Vendor/helpers/broadcastChannel.js',
      'src/assets/scripts/Vendor/helpers/storageManager.js',
      'templates/quotation/templateone.min.html',
      'templates/quotation/templatetwo.min.html',
      'templates/delivery/delivery.min.html',
      'templates/vatinvoice/vatinvoice.min.html',
      'templates/prints/print-template-A4.html',
   ];

   for (const file of keptFiles) {
      assert.equal(fs.existsSync(path.join(ROOT_DIR, file)), true, `File bắt buộc phải tồn tại: ${file}`);
   }
});

test('O2: Kiểm tra cú pháp php -l cho toàn bộ file PHP trong core/ và plugin.php', () => {
   const phpFiles = [
      'plugin.php',
      'core/App.php',
      'core/Api/Api.php',
      'core/Api/LoadingApi.php',
      'core/Api/Documents/DocumentApi.php',
      'core/Api/Setting/SettingApi.php',
      'core/Api/PrintFiles/PrintFileApi.php',
      'core/Api/Templates/TemplatesApi.php',
      'core/Api/Authenticate/AuthenticateApi.php',
      'core/Controllers/Controller.php',
      'core/Controllers/LoadScriptController.php',
      'core/Controllers/Authenticate/JwtController.php',
      'core/Controllers/Documents/DocumentController.php',
      'core/Controllers/Woocommerce/MasterSupporterController.php',
      'core/Controllers/Woocommerce/Product/ProductController.php',
      'core/Controllers/Woocommerce/User/UserController.php',
      'core/Controllers/Woocommerce/Order/OrderController.php',
      'core/Controllers/Woocommerce/Vat/VatController.php',
      'core/Controllers/Woocommerce/Quotation/SubQuotationController.php',
      'core/Controllers/Woocommerce/Delivery/SubDeliveryController.php',
      'core/Controllers/Woocommerce/Invoice/SubInvoiceController.php',
   ];

   for (const file of phpFiles) {
      const output = execFileSync('php', ['-l', file], { cwd: ROOT_DIR, encoding: 'utf8' });
      assert.match(output, /No syntax errors detected/);
   }
});

test('O2: Thực thi runtime PHP kiểm chứng DI Container, HookManager, REST API routes, Response format, JWT và Vite Dev Server URL', () => {
   const phpRunner = `
      error_reporting(E_ALL);
      define('ABSPATH', __DIR__ . '/');
      define('PLUGIN_NAME', 'document');
      define('PLUGIN_DIR_DOCUMENT', __DIR__ . '/');
      define('PLUGIN_URL_DOCUMENT', 'https://example.test/wp-content/plugins/document/');
      define('TEMPLATES_DIR_DOCUMENT', __DIR__ . '/templates');
      define('NAME_SPACE_DOCUMENT', 'tinsinhphat/v1');
      define('SECRET_KEY_DOCUMENT', 'test_secret_key_for_jwt_verification_1234567890');
      define('WP_DEBUG', true);

      require __DIR__ . '/vendor/autoload.php';

      class WP_REST_Server { const READABLE = 'GET'; }
      class WP_REST_Request {
         private $params = [];
         private $json = [];
         private $body = '';
         private $headers = [];
         public function __construct($params = [], $json = [], $body = '', $headers = []) {
            $this->params = $params;
            $this->json = $json;
            $this->body = $body;
            $this->headers = $headers;
         }
         public function get_param($key) { return $this->params[$key] ?? null; }
         public function set_param($key, $val) { $this->params[$key] = $val; }
         public function get_json_params() { return $this->json; }
         public function get_body() { return $this->body; }
         public function get_header($key) { return $this->headers[strtolower($key)] ?? ''; }
      }
      class WP_REST_Response {
         public $data;
         public $status;
         public $headers = [];
         public function __construct($data = null, $status = 200) {
            $this->data = $data;
            $this->status = $status;
         }
         public function header($k, $v) { $this->headers[$k] = $v; }
      }
      class WP_Error {
         public $code;
         public $message;
         public $data;
         public function __construct($code = '', $message = '', $data = '') {
            $this->code = $code;
            $this->message = $message;
            $this->data = $data;
         }
         public function get_error_message() { return $this->message; }
      }
      class WP_User {
         public $ID = 42;
         public $user_login = 'admin_user';
         public $roles = ['administrator'];
      }

      $GLOBALS['registered_routes'] = [];
      $GLOBALS['enqueued_scripts'] = [];
      $GLOBALS['current_can'] = true;

      function is_wp_error($thing) { return $thing instanceof WP_Error; }
      function add_action($hook, $cb, $prio = 10, $args = 1) {}
      function add_filter($hook, $cb, $prio = 10, $args = 2) {
         if ($hook === 'document_allowed_roles') return $cb(['administrator', 'shop_manager']);
      }
      function apply_filters($hook, $val) { return $val; }
      function remove_action($h, $c, $p = 10) {}
      function remove_filter($h, $c, $p = 10) {}
      function register_rest_route($ns, $route, $args) {
         $GLOBALS['registered_routes'][$ns . $route] = $args;
      }
      function absint($n) { return abs((int) $n); }
      function current_user_can($cap) { return $GLOBALS['current_can']; }
      function get_role($r) { return true; }
      function is_admin() { return false; }
      function plugins_url() { return 'https://example.test/wp-content/plugins'; }
      function wp_upload_dir() {
         return [
            'basedir' => sys_get_temp_dir(),
            'baseurl' => 'https://example.test/wp-content/uploads',
         ];
      }
      function wp_mkdir_p($dir) { return true; }
      function wp_normalize_path($p) { return str_replace('\\\\', '/', (string) $p); }
      function sanitize_file_name($f) { return preg_replace('/[^A-Za-z0-9._-]/', '', (string) $f); }
      function trailingslashit($s) { return rtrim($s, '/\\\\') . '/'; }
      function wp_enqueue_script($handle, $src) { $GLOBALS['enqueued_scripts'][$handle] = $src; }
      function wp_enqueue_style($handle, $src) {}
      function wp_enqueue_media() {}
      function get_option($k, $d = false) { return $d; }
      function update_option($k, $v) { return true; }
      function get_user_meta($uid, $k, $single = false) {
         if ($k === 'user_information') return json_encode(['key' => 'ck_123', 'secret' => 'cs_456']);
         return '';
      }
      function update_user_meta($uid, $k, $v) { return true; }
      function get_userdata($uid) { return $uid == 42 ? new WP_User() : false; }
      function wp_set_current_user($uid) {}
      function is_ssl() { return true; }
      function wp_signon($creds) {
         if ($creds['user_login'] === 'bad') return new WP_Error('invalid_login', 'Wrong');
         return new WP_User();
      }

      // 1. Kiểm tra JwtController::createJWTToken không sinh cảnh báo $type
      $warnings = [];
      set_error_handler(function($errno, $errstr) use (&$warnings) { $warnings[] = $errstr; });
      $jwtData = \\App\\Controllers\\Authenticate\\JwtController::createJWTToken(new WP_User());
      restore_error_handler();
      if (!empty($warnings)) throw new RuntimeException('Warnings in createJWTToken: ' . implode('; ', $warnings));
      if (empty($jwtData['token']) || $jwtData['type'] !== 'Bearer') throw new RuntimeException('Invalid JWT payload');

      // 2. Kiểm tra ServiceContainer + HookManager + LoadingApi + MasterSupporterController
      $container = new \\App\\Support\\ServiceContainer();
      $hooks = new \\App\\Support\\HookManager();
      $container->singleton('hooks', fn($c) => $hooks);
      $container->singleton('documentController', fn($c) => new \\App\\Controllers\\Documents\\DocumentController($c->get('hooks')));
      $container->singleton('woo.product', fn($c) => new \\App\\Controllers\\Woocommerce\\Product\\ProductController($c->get('hooks')));
      $container->singleton('woo.user', fn($c) => new \\App\\Controllers\\Woocommerce\\User\\UserController($c->get('hooks')));
      $container->singleton('woo.order', fn($c) => new \\App\\Controllers\\Woocommerce\\Order\\OrderController($c->get('hooks')));
      $container->singleton('woo.vat', fn($c) => new \\App\\Controllers\\Woocommerce\\Vat\\VatController($c->get('hooks')));
      $container->singleton('woo.subQuotation', fn($c) => new \\App\\Controllers\\Woocommerce\\Quotation\\SubQuotationController($c->get('hooks')));
      $container->singleton('woo.subDelivery', fn($c) => new \\App\\Controllers\\Woocommerce\\Delivery\\SubDeliveryController($c->get('hooks')));
      $container->singleton('woo.subInvoice', fn($c) => new \\App\\Controllers\\Woocommerce\\Invoice\\SubInvoiceController($c->get('hooks')));
      $container->singleton('masterSupporter', fn($c) => new \\App\\Controllers\\Woocommerce\\MasterSupporterController($c->get('hooks'), $c));
      $container->singleton('settingApi', fn($c) => new \\App\\Api\\Setting\\SettingApi());
      $container->singleton('templatesApi', fn($c) => new \\App\\Api\\Templates\\TemplatesApi());
      $container->singleton('authenticateApi', fn($c) => new \\App\\Api\\Authenticate\\AuthenticateApi());
      $container->singleton('documentApi', fn($c) => new \\App\\Api\\Documents\\DocumentApi($c->get('documentController'), $c->get('hooks')));
      $container->singleton('printFileApi', fn($c) => new \\App\\Api\\PrintFiles\\PrintFileApi());
      $container->singleton('loadingApi', fn($c) => new \\App\\Api\\LoadingApi($c->get('hooks'), $c));

      $container->get('documentController');
      $container->get('masterSupporter');
      $container->get('loadingApi')->initializeApis();

      if (method_exists(\\App\\Api\\Documents\\DocumentApi::class, 'getDocs')) {
         throw new RuntimeException('DocumentApi::getDocs should be removed');
      }
      foreach (['gets', 'create', 'update', 'delete', 'getById'] as $legacyMethod) {
         if (method_exists(\\App\\Api\\Api::class, $legacyMethod)) {
            throw new RuntimeException('Api::' . $legacyMethod . ' should be removed');
         }
      }

      // 3. Kiểm tra các route dưới tinsinhphat/v1
      $expectedRoutes = [
         'tinsinhphat/v1/auth/login',
         'tinsinhphat/v1/settings/company',
         'tinsinhphat/v1/settings/system',
         'tinsinhphat/v1/settings/system/browse',
         'tinsinhphat/v1/settings/user',
         'tinsinhphat/v1/template/(?P<type>deliveries|quotations|invoice|prints)/(?P<slug>[a-zA-Z0-9-]+)',
         'tinsinhphat/v1/documents/files',
         'tinsinhphat/v1/documents/files/(?P<slug>[^/]+)/delete',
         'tinsinhphat/v1/documents/files/(?P<slug>[^/]+)',
         'tinsinhphat/v1/documents/stream/(?P<slug>[^/]+)',
         'tinsinhphat/v1/documents/orders/(?P<order_id>\\d+)',
         'tinsinhphat/v1/documents/upload',
         'tinsinhphat/v1/documents/assign',
         'tinsinhphat/v1/documents/orders-without-doc',
         'tinsinhphat/v1/print-files',
      ];
      foreach ($expectedRoutes as $r) {
         if (!isset($GLOBALS['registered_routes'][$r])) throw new RuntimeException('Missing route: ' . $r);
      }

      // 4. Kiểm tra AuthenticateApi, TemplatesApi, SettingApi, LoadScriptController
      $loginRes = $container->get('authenticateApi')->authenticateLogin(new WP_REST_Request(['username' => 'admin', 'password' => 'secret']));
      if ($loginRes->status !== 200 || $loginRes->data['status']['code'] !== 200 || empty($loginRes->data['status']['data']['token'])) {
         throw new RuntimeException('AuthenticateApi login response invalid');
      }

      $tplRes = $container->get('templatesApi')->handleGetTemplate(new WP_REST_Request(['type' => 'quotations', 'slug' => 'templateone']));
      if ($tplRes->status !== 200 || $tplRes->data['status']['code'] !== 200 || empty($tplRes->data['status']['data']['template'])) {
         throw new RuntimeException('TemplatesApi response invalid');
      }

      $settingApi = $container->get('settingApi');
      $permOk = $settingApi->adminPermission(new WP_REST_Request([], [], '', ['authorization' => 'Bearer ' . $jwtData['token']]));
      if ($permOk !== true) throw new RuntimeException('SettingApi adminPermission failed');

      $compRes = $settingApi->getCompanySetting(new WP_REST_Request());
      if ($compRes->status !== 200 || $compRes->data['status']['code'] !== 201) {
         throw new RuntimeException('SettingApi getCompanySetting fallback code mismatch');
      }

      $pagenow = 'admin.php';
      $_GET['page'] = 'quotation';
      $loadScript = new \\App\\Controllers\\LoadScriptController($hooks);
      $loadScript->importScript();
      if ($GLOBALS['enqueued_scripts']['document-plugin'] !== 'https://192.168.1.181:5173/src/main.js') {
         throw new RuntimeException('Default Vite URL mismatch');
      }
      define('DOCUMENT_VITE_DEV_SERVER', 'https://localhost:5173/');
      $loadScript->importScript();
      if ($GLOBALS['enqueued_scripts']['document-plugin'] !== 'https://localhost:5173/src/main.js') {
         throw new RuntimeException('Custom DOCUMENT_VITE_DEV_SERVER URL mismatch');
      }

      echo "PHP_RUNTIME_OK:" . count($hooks->getHooks());
   `;

   const out = execFileSync('php', ['-r', phpRunner], { cwd: ROOT_DIR, encoding: 'utf8' });
   assert.match(out, /^PHP_RUNTIME_OK:\d+/);
});
