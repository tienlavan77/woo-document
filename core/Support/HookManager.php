<?php
namespace App\Support;

class HookManager { 
    private $hooks = [];
    
    /**
     * Thêm action
     */
    public function addAction($hook, $callback, $priority = 10, $param_count = 1) {
        add_action($hook, $callback, $priority, $param_count);
        
        $this->hooks[] = [
            'type'     => 'action',
            'hook'     => $hook,
            'callback' => $callback,
            'priority' => $priority
        ];
        
        return $this;
    }
    
    /**
     * Thêm filter
     */
    public function addFilter($hook, $callback, $priority = 10, $param_count = 2) {
        add_filter($hook, $callback, $priority, $param_count);
        
        $this->hooks[] = [
            'type'     => 'filter',
            'hook'     => $hook,
            'callback' => $callback,
            'priority' => $priority
        ];
        
        return $this;
    }
    
    /**
     * Gỡ bỏ action
     */
    public function removeAction($hook, $callback, $priority = 10) {
        remove_action($hook, $callback, $priority);
        return $this;
    }
    
    /**
     * Gỡ bỏ filter
     */
    public function removeFilter($hook, $callback, $priority = 10) {
        remove_filter($hook, $callback, $priority);
        return $this;
    }
    
    /**
     * Gỡ bỏ tất cả hooks (để test)
     */
    public function removeAll() {
        foreach ($this->hooks as $hook) {
            if ($hook['type'] === 'action') {
                remove_action($hook['hook'], $hook['callback'], $hook['priority']);
            } else {
                remove_filter($hook['hook'], $hook['callback'], $hook['priority']);
            }
        }
        $this->hooks = [];
        return $this;
    }
    
    /**
     * Lấy danh sách hooks
     */
    public function getHooks() {
        return $this->hooks;
    }
}
