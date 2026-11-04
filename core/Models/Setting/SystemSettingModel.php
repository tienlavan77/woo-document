<?php
namespace App\Models\Setting;

use App\Support\SystemFolderManager;

class SystemSettingModel {
    public static function get() {
        return SystemFolderManager::getSettings();
    }

    public static function set($setting) {
        return SystemFolderManager::saveSettings($setting);
    }

    public static function browse($path = '') {
        return SystemFolderManager::browse($path);
    }
}
