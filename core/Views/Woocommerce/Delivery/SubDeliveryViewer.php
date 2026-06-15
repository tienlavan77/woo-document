<?php
namespace App\Views\Woocommerce\Delivery;

class SubDeliveryViewer {

   public static function addDeliveryInToolbar() { 
      ?>
         <div class="alignleft actions custom">
            <a href=# style="height:32px;" class="button addtodocument" data-action="updateDelivery" value="">
               <?php echo __('Push to Delivery', 'woocommerce'); ?>
            </a>
         </div>
      <?php

   }
};
