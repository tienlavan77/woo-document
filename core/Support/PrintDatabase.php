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
    private const SCHEMA_VERSION = '1.7.0';
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

    public static function orderAssetsTable() {
        global $wpdb;

        return $wpdb->prefix . 'print_order_assets';
    }

    public static function productTicketsTable() {
        global $wpdb;

        return $wpdb->prefix . 'print_product_tickets';
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
        $order_assets_table = self::orderAssetsTable();
        $product_tickets_table = self::productTicketsTable();
        $stored_version = (string) get_option(self::VERSION_OPTION, '');
        $tables_exist = self::tableExists($assets_table) && self::tableExists($jobs_table) && self::tableExists($tickets_table) && self::tableExists($order_assets_table) && self::tableExists($product_tickets_table);

        if ($tables_exist && version_compare($stored_version, self::SCHEMA_VERSION, '>=')) {
            $ready = self::removeUniqueAssetJobIndex($jobs_table);
            if ($ready) {
                self::backfillDocumentStatuses($jobs_table);
                if (version_compare($stored_version, '1.7.0', '<')) {
                    if (!self::backfillBaseJobs($jobs_table)) return false;
                    self::backfillPrintTickets($jobs_table, $tickets_table);
                    if (!self::backfillProductTickets($jobs_table, $product_tickets_table)) return false;
                    self::removeLegacyProductJobs($jobs_table);
                    update_option(self::VERSION_OPTION, self::SCHEMA_VERSION, false);
                }
            }
            return $ready;
        }

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset_collate = $wpdb->get_charset_collate();

        // Normalize legacy order-scoped print tickets before dbDelta adds the
        // new asset-scoped unique index.
        if (self::tableExists($tickets_table)) {
            self::migrateGlobalPrintTickets($tickets_table);
        }

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
            UNIQUE KEY asset_id (asset_id),
            KEY order_id (order_id),
            KEY document_status (document_status)
        ) {$charset_collate};

        CREATE TABLE {$order_assets_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            order_id bigint(20) unsigned NOT NULL,
            asset_id bigint(20) unsigned NOT NULL,
            created_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY order_asset (order_id, asset_id),
            KEY order_id (order_id),
            KEY asset_id (asset_id)
        ) {$charset_collate};

        CREATE TABLE {$product_tickets_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            order_id bigint(20) unsigned NOT NULL,
            order_item_id bigint(20) unsigned NOT NULL,
            quantity decimal(18,4) NOT NULL DEFAULT 1.0000,
            status varchar(20) NOT NULL DEFAULT 'draft',
            document_status varchar(20) NOT NULL DEFAULT 'not_created',
            specs_json longtext NULL,
            sheet_snapshot_json longtext NULL,
            created_by bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY order_item (order_id, order_item_id),
            KEY order_id (order_id),
            KEY order_item_id (order_item_id),
            KEY document_status (document_status),
            KEY created_at (created_at)
        ) {$charset_collate};";

        dbDelta($sql);

        $tables_exist = self::tableExists($assets_table) && self::tableExists($jobs_table) && self::tableExists($tickets_table) && self::tableExists($order_assets_table) && self::tableExists($product_tickets_table);
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
        self::backfillOrderAssets($jobs_table, $order_assets_table);
        if (!self::backfillBaseJobs($jobs_table)) return false;
        self::backfillPrintTickets($jobs_table, $tickets_table);
        if (!self::backfillProductTickets($jobs_table, $product_tickets_table)) return false;
        self::removeLegacyProductJobs($jobs_table);

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
            "SELECT asset_id, MIN(id) AS first_job_id
             FROM {$jobs_table}
             WHERE order_item_id = 0
             GROUP BY asset_id",
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
                absint($job['order_id']),
                absint($group['asset_id']),
                $ready ? 'ready' : 'not_created',
                (string) ($job['specs_json'] ?? ''),
                absint($job['created_by'] ?? 0),
                $job['created_at'] ?: gmdate('Y-m-d H:i:s'),
                $job['updated_at'] ?: gmdate('Y-m-d H:i:s')
            ));
        }
    }

    private static function backfillOrderAssets($jobs_table, $order_assets_table) {
        global $wpdb;

        $wpdb->query(
            "INSERT IGNORE INTO {$order_assets_table}
                (order_id, asset_id, created_by, created_at)
             SELECT order_id, asset_id, MAX(created_by), MIN(created_at)
             FROM {$jobs_table}
             GROUP BY order_id, asset_id"
        );
    }

    /** Move legacy product tickets out of the file-linked jobs table. */
    private static function backfillProductTickets($jobs_table, $product_tickets_table) {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$jobs_table}
             WHERE order_item_id > 0
             ORDER BY order_id ASC, order_item_id ASC,
                      (product_document_status = 'ready') DESC,
                      updated_at DESC, id DESC",
            ARRAY_A
        );
        if ($rows === null) return false;

        $seen = [];
        foreach ($rows ?: [] as $job) {
            $key = absint($job['order_id']) . ':' . absint($job['order_item_id']);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            if ($wpdb->query($wpdb->prepare(
                "INSERT INTO {$product_tickets_table}
                    (order_id, order_item_id, quantity, status, document_status, specs_json, sheet_snapshot_json, created_by, created_at, updated_at)
                 VALUES (%d, %d, %f, %s, %s, %s, %s, %d, %s, %s)
                 ON DUPLICATE KEY UPDATE
                    quantity = VALUES(quantity), status = VALUES(status), document_status = VALUES(document_status),
                    specs_json = VALUES(specs_json), sheet_snapshot_json = VALUES(sheet_snapshot_json), updated_at = VALUES(updated_at)",
                absint($job['order_id']),
                absint($job['order_item_id']),
                (float) $job['quantity'],
                (string) ($job['status'] ?: 'draft'),
                (string) (($job['product_document_status'] ?? '') === 'ready' ? 'ready' : (($job['document_status'] ?? '') === 'ready' ? 'ready' : 'not_created')),
                (string) ($job['specs_json'] ?? ''),
                (string) ($job['sheet_snapshot_json'] ?? ''),
                absint($job['created_by'] ?? 0),
                $job['created_at'] ?: gmdate('Y-m-d H:i:s'),
                $job['updated_at'] ?: gmdate('Y-m-d H:i:s')
            )) === false) return false;
        }
        return true;
    }

    private static function removeLegacyProductJobs($jobs_table) {
        global $wpdb;

        $wpdb->query("DELETE FROM {$jobs_table} WHERE order_item_id > 0");
    }

    /** Preserve one file/order job before removing its legacy product rows. */
    private static function backfillBaseJobs($jobs_table) {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT j.*
             FROM {$jobs_table} j
             INNER JOIN (
                 SELECT order_id, asset_id, MIN(id) AS id
                 FROM {$jobs_table}
                 GROUP BY order_id, asset_id
             ) first_job ON first_job.id = j.id
             LEFT JOIN {$jobs_table} base ON base.order_id = j.order_id
                AND base.asset_id = j.asset_id AND base.order_item_id = 0
             WHERE base.id IS NULL",
            ARRAY_A
        );

        foreach ($rows ?: [] as $job) {
            if ($wpdb->insert($jobs_table, [
                'order_id' => absint($job['order_id']),
                'order_item_id' => 0,
                'asset_id' => absint($job['asset_id']),
                'quantity' => 1,
                'status' => 'draft',
                'document_status' => (string) (($job['print_document_status'] ?? '') === 'ready' ? 'partial' : 'not_created'),
                'document_key' => '',
                'print_document_status' => (string) ($job['print_document_status'] ?? 'not_created'),
                'product_document_status' => 'not_created',
                'specs_json' => '',
                'sheet_snapshot_json' => '',
                'created_by' => absint($job['created_by'] ?? 0),
                'created_at' => $job['created_at'] ?: gmdate('Y-m-d H:i:s'),
                'updated_at' => $job['updated_at'] ?: gmdate('Y-m-d H:i:s'),
            ], ['%d', '%d', '%d', '%f', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%s']) === false) return false;
        }
        return true;
    }

    /** Keep the best legacy ticket per file before enforcing asset uniqueness. */
    private static function migrateGlobalPrintTickets($tickets_table) {
        global $wpdb;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$tickets_table}
             ORDER BY asset_id ASC,
                      (document_status = 'ready') DESC,
                      updated_at DESC,
                      id ASC",
            ARRAY_A
        );
        $seen = [];
        foreach ($rows ?: [] as $row) {
            $asset_id = absint($row['asset_id'] ?? 0);
            if (!$asset_id) continue;
            if (isset($seen[$asset_id])) {
                $wpdb->delete($tickets_table, ['id' => absint($row['id'])], ['%d']);
                continue;
            }
            $seen[$asset_id] = true;
        }

        $indexes = $wpdb->get_results("SHOW INDEX FROM {$tickets_table}", ARRAY_A);
        $has_order_asset = false;
        $has_asset_id = false;
        foreach ($indexes ?: [] as $index) {
            if (($index['Key_name'] ?? '') === 'order_asset') $has_order_asset = true;
            if (($index['Key_name'] ?? '') === 'asset_id' && (int) ($index['Non_unique'] ?? 1) === 0) $has_asset_id = true;
        }
        if ($has_order_asset) $wpdb->query("ALTER TABLE {$tickets_table} DROP INDEX order_asset");
        // The legacy schema also had a non-unique asset_id index. It must be
        // removed before the new unique index can use the same name.
        if (!$has_asset_id) {
            foreach ($indexes ?: [] as $index) {
                if (($index['Key_name'] ?? '') === 'asset_id') {
                    $wpdb->query("ALTER TABLE {$tickets_table} DROP INDEX asset_id");
                    break;
                }
            }
        }
        if (!$has_asset_id) {
            $wpdb->query("ALTER TABLE {$tickets_table} ADD UNIQUE KEY asset_id (asset_id)");
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
