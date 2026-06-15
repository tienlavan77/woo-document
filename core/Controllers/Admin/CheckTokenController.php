<?php
namespace App\Controllers\Admin;

use App\Support\HookManager;
use App\Support\AuthSupport;

class CheckTokenController {
    private $hooks;

    public function __construct(HookManager $hooks) {
        $this->hooks = $hooks;
        $this->registerHooks();
    }
    
    private function registerHooks() {
        $this->hooks->addAction('admin_notices', [$this, 'noticeForPlugin']);
    }
   
    public function checkSettingAlready() {
      if (! is_user_logged_in()) {
         return false;      
      }

      $user = wp_get_current_user();

      // Sử dụng AuthSupport để kiểm tra tập trung
      return AuthSupport::is_allowed_role($user) && AuthSupport::has_required_settings($user->ID);
   }

   public function createSettingLink() {
      return sprintf('<a href="%s">%s</a>', 
         esc_url(admin_url('admin.php?page=setting')), 
         __('Setting', 'document')
      );
   }

   public function notEnoughUserSetting() {
      $status =  $this->checkSettingAlready();
      $link = $this->createSettingLink();
      if ($status) {
         return;
      }

      ?>
      <div class="notice notice-warning">
         <p>
            <?php 
               printf(__('Document notice: User information is incomplete. Please go to %s to configure your API keys.', 'document'), $link);
            ?>  
          </p>
         </div>
         <?php
   }
   public function noticeForPlugin() {  
      $this->notEnoughUserSetting();
   }
}
