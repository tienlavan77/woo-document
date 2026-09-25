<?php
namespace App\Models\setting;

use App\Models\Setting\CompanySettingModel;
use App\Models\Setting\SystemSettingModel;
use App\Models\Setting\UserSettingModel;


class SettingModel {
   public static function getCompanySetting() {
      return CompanySettingModel::get();
   }

   public static function setCompanySetting($data) {
      return CompanySettingModel::set($data);
   }

   public static function getSystemSetting() {
      return SystemSettingModel::get();
   }

   public static function setSystemSetting($data) {
      return SystemSettingModel::set($data);
   }

   public static function browseSystemFolder($path = '') {
      return SystemSettingModel::browse($path);
   }

   public static function getUserSetting($userId) {
      return UserSettingModel::get($userId);
   }

   public static function setUserSetting($userId, $data) {
      return UserSettingModel::set($userId, $data);
   }
}
