<?php
namespace App\Support;

use WP_Error;

/**
 * Resolves the plugin's document/print storage folders and manages aliases.
 */
class SystemFolderManager {
    private const OPTION_KEY = 'tsp_system_setting';
    private const DOCUMENT_KEY = 'document_folder';
    private const PRINT_KEY = 'print_folder';

    public static function defaults() {
        return [
            self::DOCUMENT_KEY => [
                'path'       => 'order_documents',
                'alias'      => false,
                'mount_name' => 'order_documents',
            ],
            self::PRINT_KEY => [
                'path'       => 'print_documents',
                'alias'      => false,
                'mount_name' => 'print_documents',
            ],
        ];
    }

    public static function getSettings() {
        $stored = get_option(self::OPTION_KEY, []);
        if (is_string($stored)) {
            $stored = json_decode($stored, true);
        }

        return self::normalizeSettings(is_array($stored) ? $stored : []);
    }

    /** Create configured folders without overwriting a saved option. */
    public static function ensureConfigured() {
        $stored = get_option(self::OPTION_KEY, null);
        $prepared = self::prepareSettings(self::getSettings());

        if (is_wp_error($prepared)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('SystemFolderManager: ' . $prepared->get_error_message());
            }
            return $prepared;
        }

        if ($stored === null || $stored === false) {
            update_option(self::OPTION_KEY, $prepared['settings'], false);
        }

        return $prepared['settings'];
    }

    public static function saveSettings($input) {
        $settings = self::normalizeSettings(is_array($input) ? $input : []);
        $prepared = self::prepareSettings($settings);

        if (is_wp_error($prepared)) {
            return $prepared;
        }

        $updated = update_option(self::OPTION_KEY, $prepared['settings'], false);
        if (!$updated && self::getSettings() !== $prepared['settings']) {
            self::rollbackCreatedPaths($prepared['created_paths']);
            return new WP_Error(
                'system_setting_save_failed',
                'Không thể lưu cấu hình System vào database.',
                ['status' => 500]
            );
        }

        return $prepared['settings'];
    }

    public static function getFolder($key) {
        $settings = self::getSettings();
        $setting = $settings[$key] ?? self::defaults()[$key] ?? null;
        if (!$setting) {
            return null;
        }

        $uploads = wp_normalize_path(trailingslashit(wp_upload_dir()['basedir']));
        $mount_name = trim(wp_normalize_path($setting['mount_name']), '/');
        $absolute_path = wp_normalize_path($uploads . $mount_name);

        return [
            'path'            => $setting['path'],
            'alias'           => (bool) $setting['alias'],
            'mount_name'      => $mount_name,
            'absolute_path'   => $absolute_path,
            'relative_prefix' => trailingslashit($mount_name),
        ];
    }

    /** Return configured document storage plus legacy locations. */
    public static function getDocumentDirectories() {
        $uploads = wp_normalize_path(trailingslashit(wp_upload_dir()['basedir']));
        $configured = self::getFolder(self::DOCUMENT_KEY);
        $directories = [];

        if ($configured) {
            $directories[] = [$configured['absolute_path'], $configured['relative_prefix']];
        }

        // Preserve files created before System settings existed.
        $fallbacks = [
            [$uploads . 'order_documents', 'order_documents/'],
            [$uploads . 'myoptions/moreinfo', 'myoptions/moreinfo/'],
        ];

        foreach ($fallbacks as [$directory, $prefix]) {
            $duplicate = false;
            foreach ($directories as [$existing]) {
                if (wp_normalize_path($existing) === wp_normalize_path($directory)) {
                    $duplicate = true;
                    break;
                }
            }
            if (!$duplicate) {
                $directories[] = [$directory, $prefix];
            }
        }

        return $directories;
    }

    /** Return directories only; never return files. */
    public static function browse($path = '') {
        $requested = trim((string) $path);
        if ($requested === '') {
            $directory = realpath(wp_normalize_path(WP_CONTENT_DIR));
        } elseif (self::isAbsolutePath($requested)) {
            // Alias dùng đường dẫn tuyệt đối tới thư mục nguồn bên ngoài uploads.
            $directory = realpath(wp_normalize_path($requested));
        } else {
            // Folder trực tiếp được lưu tương đối trong wp-content/uploads.
            // Không dùng realpath($requested) vì cwd của PHP không cố định.
            $relative = self::normalizeRelativePath($requested);
            if (is_wp_error($relative)) {
                return $relative;
            }

            $directory = realpath(self::uploadsPath($relative));
        }

        if ($directory === false || !is_dir($directory) || !is_readable($directory)) {
            return new WP_Error('folder_not_readable', 'Thư mục không tồn tại hoặc không thể đọc.', ['status' => 400]);
        }

        $directories = [];
        foreach (array_diff(scandir($directory), ['.', '..']) as $name) {
            $child = $directory . DIRECTORY_SEPARATOR . $name;
            if (!is_dir($child)) {
                continue;
            }

            $directories[] = [
                'name'    => $name,
                'path'    => wp_normalize_path(realpath($child) ?: $child),
                'is_link' => is_link($child),
            ];
        }

        usort($directories, static function ($a, $b) {
            return strnatcasecmp($a['name'], $b['name']);
        });

        $parent = dirname($directory);
        return [
            'current'     => wp_normalize_path($directory),
            'parent'      => $parent !== $directory ? wp_normalize_path($parent) : '',
            'directories' => $directories,
        ];
    }

    private static function isAbsolutePath($path) {
        $path = wp_normalize_path((string) $path);

        return strpos($path, '/') === 0 || (bool) preg_match('/^[A-Za-z]:\//', $path);
    }

    private static function normalizeSettings($input) {
        $defaults = self::defaults();
        $result = $defaults;

        foreach ([self::DOCUMENT_KEY, self::PRINT_KEY] as $key) {
            $item = is_array($input[$key] ?? null) ? $input[$key] : [];
            $path = isset($item['path']) ? trim((string) $item['path']) : $defaults[$key]['path'];
            $alias = filter_var($item['alias'] ?? $defaults[$key]['alias'], FILTER_VALIDATE_BOOLEAN);
            $mount_name = isset($item['mount_name']) ? trim((string) $item['mount_name']) : '';

            $result[$key] = [
                'path'       => $path,
                'alias'      => $alias,
                'mount_name' => $mount_name ?: $defaults[$key]['mount_name'],
            ];
        }

        return $result;
    }

    private static function prepareSettings($settings) {
        $created_paths = [];
        $prepared = self::defaults();

        foreach ([self::DOCUMENT_KEY, self::PRINT_KEY] as $key) {
            $result = self::prepareFolder($settings[$key], $key);
            if (is_wp_error($result)) {
                self::rollbackCreatedPaths($created_paths);
                return $result;
            }

            $prepared[$key] = $result['setting'];
            if ($result['created']) {
                $created_paths[] = $result['target'];
            }
        }

        return ['settings' => $prepared, 'created_paths' => $created_paths];
    }

    private static function prepareFolder($setting, $key) {
        $path = trim((string) ($setting['path'] ?? ''));
        $alias = filter_var($setting['alias'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($path === '') {
            return new WP_Error('folder_path_required', sprintf('Đường dẫn %s không được để trống.', $key), ['status' => 400]);
        }

        if ($alias) {
            $source = realpath(wp_normalize_path($path));
            if ($source === false || !is_dir($source)) {
                return new WP_Error('alias_source_not_found', sprintf('Thư mục nguồn %s không tồn tại.', $key), ['status' => 400]);
            }
            if (is_wp_error(self::testWritable($source))) {
                return new WP_Error('alias_source_not_writable', sprintf('Không thể ghi vào thư mục nguồn %s.', $key), ['status' => 400]);
            }

            $mount_name = sanitize_file_name(basename($source));
            if ($mount_name === '') {
                return new WP_Error('alias_name_invalid', sprintf('Không xác định được tên alias cho %s.', $key), ['status' => 400]);
            }

            $target = self::uploadsPath($mount_name);
            $created = false;
            if (is_link($target)) {
                if (realpath($target) !== $source) {
                    return new WP_Error('alias_conflict', sprintf('Alias %s đã trỏ tới thư mục khác.', $mount_name), ['status' => 409]);
                }
            } elseif (file_exists($target)) {
                return new WP_Error('alias_conflict', sprintf('Đường dẫn %s trong uploads đã tồn tại.', $mount_name), ['status' => 409]);
            } else {
                if (!@symlink($source, $target) || !is_link($target)) {
                    return new WP_Error('alias_create_failed', sprintf('Không thể tạo alias cho %s. Kiểm tra quyền symlink.', $key), ['status' => 500]);
                }
                $created = true;
            }

            return [
                'setting' => ['path' => $source, 'alias' => true, 'mount_name' => $mount_name],
                'target'  => $target,
                'created' => $created,
            ];
        }

        $relative = self::normalizeRelativePath($path);
        if (is_wp_error($relative)) {
            return $relative;
        }

        $target = self::uploadsPath($relative);
        $created = false;
        if (is_link($target)) {
            return new WP_Error('folder_conflict', sprintf('Thư mục %s đang là alias, hãy bật Alias.', $key), ['status' => 409]);
        }
        if (!file_exists($target)) {
            if (!wp_mkdir_p($target)) {
                return new WP_Error('folder_create_failed', sprintf('Không thể tạo thư mục %s.', $key), ['status' => 500]);
            }
            $created = true;
        }
        if (!is_dir($target)) {
            return new WP_Error('folder_invalid', sprintf('Đường dẫn %s không phải thư mục.', $key), ['status' => 400]);
        }
        if (is_wp_error(self::testWritable($target))) {
            if ($created) {
                @rmdir($target);
            }
            return new WP_Error('folder_not_writable', sprintf('Không thể ghi vào thư mục %s.', $key), ['status' => 400]);
        }

        return [
            'setting' => ['path' => $relative, 'alias' => false, 'mount_name' => $relative],
            'target'  => $target,
            'created' => $created,
        ];
    }

    private static function normalizeRelativePath($path) {
        $path = trim(wp_normalize_path(str_replace('\\', '/', $path)), '/');
        if ($path === '' || strpos($path, '/') === 0 || preg_match('/^[A-Za-z]:\//', $path)) {
            return new WP_Error('folder_path_invalid', 'Folder trực tiếp phải là đường dẫn tương đối trong uploads.', ['status' => 400]);
        }

        $parts = explode('/', $path);
        $safe = [];
        foreach ($parts as $part) {
            if ($part === '' || $part === '.' || $part === '..' || preg_match('/[\x00-\x1F]/', $part)) {
                return new WP_Error('folder_path_invalid', 'Đường dẫn folder không hợp lệ.', ['status' => 400]);
            }
            $safe[] = sanitize_file_name($part);
        }

        $result = implode('/', array_filter($safe));
        return $result !== '' ? $result : new WP_Error('folder_path_invalid', 'Đường dẫn folder không hợp lệ.', ['status' => 400]);
    }

    private static function uploadsPath($relative) {
        $uploads = wp_normalize_path(trailingslashit(wp_upload_dir()['basedir']));
        return wp_normalize_path($uploads . ltrim($relative, '/'));
    }

    private static function testWritable($directory) {
        if (!is_writable($directory)) {
            return new WP_Error('not_writable');
        }

        $temp = @tempnam($directory, '.tsp-write-check-');
        if (!$temp) {
            return new WP_Error('not_writable');
        }

        $payload = 'tsp-write-check';
        $written = @file_put_contents($temp, $payload, LOCK_EX);
        $valid = $written === strlen($payload) && @file_get_contents($temp) === $payload;
        @unlink($temp);

        return $valid ? true : new WP_Error('not_writable');
    }

    private static function rollbackCreatedPaths($paths) {
        foreach (array_reverse($paths) as $path) {
            if (is_link($path)) {
                @unlink($path);
            } elseif (is_dir($path)) {
                @rmdir($path);
            }
        }
    }
}
