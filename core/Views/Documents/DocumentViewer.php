<?php
// Provides module declarations and business logic for DocumentViewer.php.

namespace App\Views\Documents;

// Defines DocumentViewer class behavior for DocumentViewer.php.
class DocumentViewer {

   // Defines functionsLink method behavior for DocumentViewer.php.
   public static function functionsLink($link, $postid) {
      return '<div class="funcs-wrapper"><ul class="doc--method">' . apply_filters('orderLink', $link, $postid) . '</ul></div>';
   }

   // Defines documentLink method behavior for DocumentViewer.php.
   public static function documentLink( $data, $key ) {
      $files = !empty($data['files']) && is_array($data['files'])
         ? array_values(array_filter($data['files'], fn($f) => is_string($f) && $f !== ''))
         : (!empty($data['file']) && is_string($data['file']) ? [$data['file']] : []);
      $data['files'] = $files;
      $data['file'] = $files[0] ?? '';

      if (empty($files)) {
         $content = '<a href="#" class="uploadToDocument title" data-action="uploadDocument">' .
            esc_html($data['title']) . '</a>';
      } else {
         $items = [];
         foreach ($files as $filePath) {
            $title = basename($filePath);
            $escapedFile = esc_attr($filePath);
            $items[] = '<span class="order--document-file-item">' .
               '<a href="#" class="uploadToDocument title" data-action="previewDocument" data-file="' . $escapedFile . '">' .
               esc_html($title) . '</a>' .
               '<a href="#" class="delete__button" data-action="deleteDocument" data-file="' . $escapedFile . '" title="Gỡ tài liệu"><span class="dashicons dashicons-no-alt"></span></a>' .
               '</span>';
         }
         if ($key === 'deliveryDocument') {
            $items[] = '<a href="#" class="uploadToDocument add-more__button" data-action="uploadDocument" title="Thêm Phiếu giao hàng"><span class="dashicons dashicons-plus-alt2"></span></a>';
         }
         $content = implode('', $items);
      }      

      return '<li class="order--document" data-document=\'' . esc_attr(json_encode($data)) . '\'>' .
               $content . '</li>';      
   }
}