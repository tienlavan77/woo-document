<?php
namespace App\Models\Setting;

class UserSettingModel {
   private static $metakey = 'user_information';

   public static function get($userId) {
      return json_decode(get_user_meta($userId, self::$metakey, true));            
   }

   public static function set($userId, $setting) {
     $settingJson = json_encode($setting);
     $result = update_user_meta($userId, self::$metakey, $settingJson);
     return $result;  
   }
   
} 