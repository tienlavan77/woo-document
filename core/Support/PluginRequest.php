<?php
namespace App\Support;

/**
 * Identifies REST requests initiated by this plugin's frontend.
 *
 * WooCommerce's REST endpoints are also used by other clients. The plugin
 * must only reshape those responses when the request carries this marker.
 */
class PluginRequest {
    public const HEADER = 'X-TSP-Plugin-Request';
    public const VALUE = 'document';

    public static function is($request) {
        if (!is_object($request) || !method_exists($request, 'get_header')) {
            return false;
        }

        return strtolower((string) $request->get_header(self::HEADER)) === self::VALUE;
    }
}
