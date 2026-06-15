<?php
namespace App\Support;

use WP_User;

class AuthSupport {

    /**
     * Trả về danh sách các Role được phép truy cập hệ thống
     */
    public static function get_allowed_roles() {
        return apply_filters('document_allowed_roles', ['administrator', 'shop_manager']);
    }

    /**
     * Kiểm tra một User có quyền truy cập dựa trên Role hay không
     * 
     * @param WP_User|null $user
     * @return bool
     */
    public static function is_allowed_role($user) {
        if (!$user instanceof WP_User) {
            return false;
        }
        $allowed = self::get_allowed_roles();
        return !empty(array_intersect($allowed, (array) $user->roles));
    }

    /**
     * Kiểm tra User đã cấu hình đầy đủ Consumer Key và Secret chưa
     * 
     * @param int $user_id
     * @return bool
     */
    public static function has_required_settings($user_id) {
        $user_id = absint($user_id);
        if (!$user_id) return false;

        $usrInfo = get_user_meta($user_id, 'user_information', true);
        if (empty($usrInfo)) return false;

        $data = json_decode($usrInfo);
        if (json_last_error() !== JSON_ERROR_NONE) return false;

        // Kiểm tra sự tồn tại của Consumer Key và Secret
        return (
            !empty($data->key) && 
            !empty($data->secret) && 
            $data->key !== '' && 
            $data->secret !== ''
        );
    }
}
