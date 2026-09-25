<?php
namespace App\Support;

/**
 * Creates and upgrades the database tables used by the print-file module.
 *
 * Table names intentionally use the WordPress prefix directly. Do not add a
 * second `tsp_` segment here: an installation may already use a prefix such
 * as `wp_tsp_`.
 */
final class PrintDatabase {
    private const SCHEMA_VERSION = '1.4.0';
    private const VERSION_OPTION = 'document_print_schema_version';

    public static function assetsTable() {
        global $wpdb;

        return $wpdb->prefix . 'print_assets';
    }

    public static function jobsTable() {
        global $wpdb;

        return $wpdb->prefix . 'print_jobs';
    }

    public static function ticketsTable() {
        global $wpdb;

        return $wpdb->prefix . 'print_tickets';
    }

    /**
     * Create missing tables and let dbDelta add future columns/indexes.
     * This method is safe to call on every plugin bootstrap.
     */
    public static function ensureTables() {
        global $wpdb;

        $assets_table = self::assetsTable();
        $jobs_table = self::jobsTable();
        $tickets_table = self::ticketsTable();
        $stored_version = (string) get_option(self::VERSION_OPTION, '');
        $tables_exist = self::tableExists($assets_table) && self::tableExists($jobs_table) && self::tableExists($tickets_table);

        if ($tables_exist && version_compare($stored_version, self::SCHEMA_VERSION, '>=')) {
            $ready = self::removeUniqueAssetJobIndex($jobs_table);
            if ($ready) {
                self::backfillDocumentStatuses($jobs_table);
                self::backfillPrintTickets($jobs_table, $tickets_table);
            }
            return $ready;
        }

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$assets_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            original_name varchar(255) NOT NULL,
            storage_key varchar(512) NOT NULL,
            thumbnail_key varchar(512) NOT NULL DEFAULT '',
            extension varchar(20) NOT NULL,
            mime_type varchar(100) NOT NULL DEFAULT '',
            size_bytes bigint(20) unsigned NOT NULL DEFAULT 0,
            sha256 char(64) NOT NULL DEFAULT '',
            page_count int(11) unsigned NOT NULL DEFAULT 0,
            width int(11) unsigned NOT NULL DEFAULT 0,
            height int(11) unsigned NOT NULL DEFAULT 0,
            thumbnail_status varchar(20) NOT NULL DEFAULT 'pending',
            thumbnail_error text NULL,
            created_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            deleted_at datetime NULL DEFAULT NULL,
            PRIMARY KEY  (id),
            KEY storage_key (storage_key(191)),
            KEY sha256 (sha256),
            KEY thumbnail_status (thumbnail_status),
            KEY created_by (created_by),
            KEY created_at (created_at),
            KEY deleted_at (deleted_at)
        ) {$charset_collate};

        CREATE TABLE {$jobs_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            order_id bigint(20) unsigned NOT NULL,
            order_item_id bigint(20) unsigned NOT NULL DEFAULT 0,
            asset_id bigint(20) unsigned NOT NULL,
            quantity decimal(18,4) NOT NULL DEFAULT 1.0000,
            status varchar(20) NOT NULL DEFAULT 'draft',
            document_status varchar(20) NOT NULL DEFAULT 'not_created',
            document_key varchar(512) NOT NULL DEFAULT '',
            print_document_status varchar(20) NOT NULL DEFAULT 'not_created',
            product_document_status varchar(20) NOT NULL DEFAULT 'not_created',
            specs_json longtext NULL,
            sheet_snapshot_json longtext NULL,
            created_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (id),
            KEY order_id (order_id),
            KEY order_item_id (order_item_id),
            KEY asset_id (asset_id),
            KEY status (status),
            KEY document_status (document_status),
            KEY created_at (created_at)
        ) {$charset_collate};

        CREATE TABLE {$tickets_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            order_id bigint(20) unsigned NOT NULL,
            asset_id bigint(20) unsigned NOT NULL,
            document_status varchar(20) NOT NULL DEFAULT 'not_created',
            specs_json longtext NULL,
            created_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY order_asset (order_id, asset_id),
            KEY order_id (order_id),
            KEY asset_id (asset_id),
            KEY document_status (document_status)
        ) {$charset_collate};";

        dbDelta($sql);

        $tables_exist = self::tableExists($assets_table) && self::tableExists($jobs_table) && self::tableExists($tickets_table);
        if (!$tables_exist) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('PrintDatabase: không thể tạo đủ bảng print_assets/print_jobs.');
            }
            return false;
        }

        if (!self::removeUniqueAssetJobIndex($jobs_table)) {
            return false;
        }

        self::backfillDocumentStatuses($jobs_table);
        self::backfillPrintTickets($jobs_table, $tickets_table);

        update_option(self::VERSION_OPTION, self::SCHEMA_VERSION, false);
        return true;
    }

    /** Convert the old combined document status to the two document types. */
    private static function backfillDocumentStatuses($jobs_table) {
        global $wpdb;

        $wpdb->query(
            "UPDATE {$jobs_table}
             SET print_document_status = 'ready', product_document_status = 'ready'
             WHERE document_status = 'ready'
               AND print_document_status = 'not_created'
               AND product_document_status = 'not_created'"
        );
    }

    private static function backfillPrintTickets($jobs_table, $tickets_table) {
        global $wpdb;

        $groups = $wpdb->get_results(
            "SELECT order_id, asset_id, MIN(id) AS first_job_id
             FROM {$jobs_table}
             GROUP BY order_id, asset_id",
            ARRAY_A
        );

        foreach ($groups ?: [] as $group) {
            $job = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$jobs_table} WHERE id = %d LIMIT 1",
                absint($group['first_job_id'])
            ), ARRAY_A);
            if (!$job) continue;

            $ready = (string) ($job['document_status'] ?? '') === 'ready'
                || (string) ($job['print_document_status'] ?? '') === 'ready';
            $wpdb->query($wpdb->prepare(
                "INSERT IGNORE INTO {$tickets_table}
                    (order_id, asset_id, document_status, specs_json, created_by, created_at, updated_at)
                 VALUES (%d, %d, %s, %s, %d, %s, %s)",
                absint($group['order_id']),
                absint($group['asset_id']),
                $ready ? 'ready' : 'not_created',
                (string) ($job['specs_json'] ?? ''),
                absint($job['created_by'] ?? 0),
                $job['created_at'] ?: gmdate('Y-m-d H:i:s'),
                $job['updated_at'] ?: gmdate('Y-m-d H:i:s')
            ));
        }
    }

    /** Allow one asset to have multiple print jobs while keeping asset lookups indexed. */
    private static function removeUniqueAssetJobIndex($jobs_table) {
        global $wpdb;

        $indexes = $wpdb->get_results("SHOW INDEX FROM {$jobs_table}", ARRAY_A);
        $index_names = [];

        foreach ($indexes ?: [] as $index) {
            $name = (string) ($index['Key_name'] ?? '');
            if ($name === '') continue;
            $index_names[$name] = true;
        }

        $asset_index_is_unique = false;
        foreach ($indexes ?: [] as $index) {
            if (
                ($index['Key_name'] ?? '') === 'asset_id'
                && (int) ($index['Non_unique'] ?? 1) === 0
            ) {
                $asset_index_is_unique = true;
                break;
            }
        }

        if ($asset_index_is_unique) {
            if ($wpdb->query("ALTER TABLE {$jobs_table} DROP INDEX asset_id") === false) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('PrintDatabase: không thể gỡ unique index asset_id: ' . $wpdb->last_error);
                }
                return false;
            }
            unset($index_names['asset_id']);
        }

        if (!isset($index_names['asset_id'])) {
            $added = $wpdb->query("ALTER TABLE {$jobs_table} ADD KEY asset_id (asset_id)");
            if ($added === false && defined('WP_DEBUG') && WP_DEBUG) {
                error_log('PrintDatabase: không thể tạo index asset_id: ' . $wpdb->last_error);
            }
            return $added !== false;
        }

        return true;
    }

    private static function tableExists($table_name) {
        global $wpdb;

        $found = $wpdb->get_var(
            $wpdb->prepare('SHOW TABLES LIKE %s', $table_name)
        );

        return $found === $table_name;
    }
}
