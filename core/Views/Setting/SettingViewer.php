<?php
namespace App\Views\Setting;

class SettingViewer {

   public static function show() { 
      $is_admin = current_user_can('manage_options');
      ?>
         <div class="tsp__content setting" id="tsp_setting" data-admin="<?php echo $is_admin ? '1' : '0'; ?>">
            <div class="header__cover"></div>
            <div class="body__cover"></div>
         </div>
      <?php 
   }
 
}
