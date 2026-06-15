<?php
namespace App\Support;

class MenuRegistry {
    private $menus = [];
    
    /**
     * Đăng ký 1 menu
     */
    public function register($menu_class) {
        if (is_string($menu_class)) {
            $menu_class = new $menu_class();
        }
        
        $this->menus[] = $menu_class;
        return $this;
    } 
    
    /**
     * Đăng ký nhiều menu
     */
    public function registerMultiple(array $menu_classes) {
        foreach ($menu_classes as $class) {
            $this->register($class);
        }
        return $this;
    }
    
    /**
     * Lấy tất cả menu
     */
    public function getAll() {
        return $this->menus;
    }
    
    /**
     * Đếm số menu
     */
    public function count() {
        return count($this->menus);
    }
}
