<?php
namespace App\Models\Setting;

class CompanySettingModel {
   private static $metakey = 'company_setting';

   public static function get() {
      return get_option(self::$metakey);         
   }

   public static function set($setting) {
     $settingJson = json_encode($setting);
     $result = update_option(self::$metakey, $settingJson);
     return $result;
   }
   
}
