<?php
namespace App\Views\Woocommerce\Invoice;

class SubInvoiceViewer {
   
   public static function vatInvoiceButton() {
      ?>
      <button type="button" class="button addtodocument" data-action="updateInvoice">Push to Invoice</button>
      <?php
   }

   public static function show() {
      ?>
         <div class="main vat-invoice" id=sheetVatInvoice >
         </div>
      <?php
   }
}
