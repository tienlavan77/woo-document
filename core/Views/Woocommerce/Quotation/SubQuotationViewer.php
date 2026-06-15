<?php
namespace App\Views\Woocommerce\Quotation;
 
class SubQuotationViewer {

   public static function addObjectToQuotationLink ($data,$classes) {
      //return 'akah';
      return '<a href=# class="'. $classes. ' addtodocument" data-info=' . json_encode($data) . ' data-action="updateQuotation" >Push to quotation</a>';
   }

   public static function quotationButtonOnToolbarOrder($typenow) { 
      ?>
         <div class="alignleft actions custom">
            <button style="height:32px;" class="button addtodocument" data-action="updateQuotation" target=<?php echo $typenow; ?>>
                  <?php echo __('Push to quotation', 'woocommerce');?>
            </button>
         </div>
      <?php 
   } 

   public static function addProductToQuotationAtGeneral($data) {
      return '<p class="form-field _name_invoice_field">'.self::addObjectToQuotationLink($data,'button').'</p>';
   }
}
 