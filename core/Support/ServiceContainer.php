<?php
namespace App\Support;

class ServiceContainer {
    private $services = [];
    private $singletons = [];
    
    /**
     * Đăng ký service (tạo mới mỗi lần gọi)
     */
    public function register($name, callable $callback) {
        $this->services[$name] = [
            'callback' => $callback,
            'singleton' => false
        ];
    }
    
    /**
     * Đăng ký singleton (tạo 1 lần rồi tái sử dụng)
     */
    public function singleton($name, callable $callback) {
        $this->services[$name] = [
            'callback' => $callback,
            'singleton' => true,
            'instance' => null
        ];
    }
    
    /**
     * Lấy service
     */
    public function get($name) {
        if (!isset($this->services[$name])) {
            throw new \Exception("Service '{$name}' not registered in container");
        }
        
        $service = $this->services[$name];
        
        // Nếu là singleton và đã tạo rồi
        if ($service['singleton'] && $service['instance'] !== null) {
            return $service['instance'];
        }
        
        // Tạo instance mới
        $instance = $service['callback']($this);
        
        // Lưu singleton
        if ($service['singleton']) {
            $this->services[$name]['instance'] = $instance;
        }
        
        return $instance; 
    }
    
    /**
     * Kiểm tra service đã tồn tại
     */
    public function has($name) {
        return isset($this->services[$name]);
    }
}
