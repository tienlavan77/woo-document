<?php
namespace App\Controllers\Woocommerce\User;

use App\Models\Woocommerce\Customers\CustomersModel;


/**
 * UserController class handles the user related functionalities.
 * It is a singleton class and provides methods to add fields in user profile.
 */
class UserController {
   protected static $instance;

   /**
    * Singleton pattern to get the instance of UserController.
    * 
    * @return UserController
    */
   public static function get_instance() {
      if (is_null(self::$instance)) {
         self::$instance = new self();
      }
      return self::$instance;
   }

   /**
    * Constructor for UserController.
    * It adds a filter to the 'woocommerce_customer_meta_fields' hook.
    */
   public function __construct() {          
      add_filter( 'woocommerce_customer_meta_fields',[$this,'addWooCommerceFieldsinUserProfile']);
      CustomersModel::init();
   }   

   /**
    * Method to add WooCommerce fields in user profile.
    * 
    * @param array $fields The current fields in the user profile.
    * @return array The modified fields with added WooCommerce fields.
    */
   public function addWooCommerceFieldsinUserProfile($fields) {
      
      $temp['billing_sex'] = array(
         'label' => 'Sex',
         'description' => 'Enter your sex Ms. Mrs. or Mr.',
         'required' => true,
         'class' =>'regular-text',
         'clear' => true
      );
      $fields['billing']['fields'] = array_merge( $temp,$fields['billing']['fields']);
      $fields['billing']['fields']['billing_taxcode'] = array(
         'label' => 'Tax Code',
         'description' => 'Enter your tax code',
         'required' => true,
         'class' =>'regular-text',
         'clear' => true
      );
      return $fields;
  }
   
}