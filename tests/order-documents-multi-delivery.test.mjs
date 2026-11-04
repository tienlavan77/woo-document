/* Provides module implementation and exported declarations for order-documents-multi-delivery.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('DocumentModel và DocumentController hỗ trợ chuẩn hóa, gán và gỡ nhiều file cho phiếu giao hàng', () => {
   const modelPhp = readFileSync('core/Models/Documents/DocumentModel.php', 'utf8');
   const controllerPhp = readFileSync('core/Controllers/Documents/DocumentController.php', 'utf8');
   const viewerPhp = readFileSync('core/Views/Documents/DocumentViewer.php', 'utf8');

   assert.match(modelPhp, /function normalizeDocumentFiles\(\$value\)/);
   assert.match(modelPhp, /function bulkUnassignMeta\(\$order_ids,\s*\$doc_type,\s*\$relative_path\s*=\s*''\)/);
   assert.match(modelPhp, /\$is_multi\s*=\s*\(\$target_key\s*===\s*'deliveryDocument'\)/);

   assert.match(controllerPhp, /\$document\['files'\]\s*=\s*\$files/);
   assert.match(controllerPhp, /\$document\['multiple'\]\s*=\s*\(\$type\s*===\s*'delivery'\)/);
   assert.match(controllerPhp, /\$this->model->bulkUnassignMeta\(\$order_ids,\s*\$doc_type,\s*\$relative_path\)/);

   assert.match(viewerPhp, /dashicons-no-alt/);
   assert.match(viewerPhp, /add-more__button/);
});

test('Frontend hiển thị slide các file trong cùng 1 card cho phiếu giao hàng và nút [+] ở slide cuối cùng', () => {
   const controllerJs = readFileSync('src/assets/scripts/Controllers/Documents/documentController.js', 'utf8');
   const viewerJs = readFileSync('src/assets/scripts/Views/Documents/documentViewer.js', 'utf8');
   const scss = readFileSync('src/assets/scss/file-manager.scss', 'utf8');

   assert.match(controllerJs, /this\.viewer\.renderDocumentSingle\(type,\s*documentData,\s*files,\s*isMulti\)/);
   assert.match(controllerJs, /this\.viewer\.moveOrderDocumentSlide\(card/);
   assert.match(controllerJs, /relative_path:\s*targetFile/);

   assert.match(viewerJs, /tsp-order-document-viewport/);
   assert.match(viewerJs, /tsp-order-document-slide/);
   assert.match(viewerJs, /is-upload-slide/);
   assert.match(viewerJs, /tsp-order-document-nav/);
   assert.match(viewerJs, /moveOrderDocumentSlide\(card,\s*delta\)/);
   assert.match(viewerJs, /translateX\(-\$\{next \* 100\}%\)/);

   assert.match(scss, /\.tsp-order-document-viewport/);
   assert.match(scss, /\.tsp-order-document-nav/);
   assert.match(scss, /\.tsp-order-document-remove/);
});
