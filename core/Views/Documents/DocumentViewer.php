<?php
namespace App\Views\Documents;

class DocumentViewer {

   public static function functionsLink($link, $postid) {
      return '<div class="funcs-wrapper"><ul class="doc--method">' . apply_filters('orderLink', $link, $postid) . '</ul></div>';
   }

   public static function documentLink( $data, $key ) {
      $filePath = $data['file'];

      if (empty($filePath)) {
         $title = $data['title'];
         $delete = '';
         $action = 'uploadDocument';
      } else {
         // Lấy chỉ tên file từ đường dẫn (ví dụ: folder/name.pdf -> name.pdf)
         $title = basename($filePath);
         $delete = '<a href="#" class="delete__button" data-action="deleteDocument"><span class="dashicons dashicons-trash"></span></a>';
         $action = 'previewDocument';      
      }      

      return '<li class="order--document" data-document=\'' . json_encode($data) . '\'>
               <a href="#" class="uploadToDocument title" data-action="' . $action . '">' . 
               esc_html($title) . '</a>' . $delete . '</li>';      
   }
}