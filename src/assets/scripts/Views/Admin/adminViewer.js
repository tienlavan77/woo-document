import LayoutViewer from '../layoutViewer.js';

export default class AdminViewer extends LayoutViewer {
	constructor() {
      super();
       this.messages = {
         ...this.messages,
         delete: 'Are you sure you want to remove these product from the quotation?',
         updateSuccess : 'Deleted Products successfully!',
         clearall: 'Are you sure you want to clear all quotation data?'
         
      }

   }
   inputingNoNumberWarning () {
      this.notice.open({           
         message: 'Invalid number input!',
         icon: true,
         style: 'warning',
         timer: 3000,            
      });
   }

   clearAllDataNotice () {
      this.notice.open({           
         message: 'Now! deleted all data in quotation!',
         icon: true,
         style: 'warning',
         timer: 3000,            
      });
   }

   confirmDeleteProduct(action) {
      this.yesNoQuestionModal({
         message: this.messages.delete,
         title: 'Deleting product out Quotation', 
         yes : () => {
            action()
            this.modal.close({clear:true})
         },
      })
   }
   
   confirmClearAllData(action) {
      this.yesNoQuestionModal({
         message: this.messages.clearall,
         title: 'Clear all data out Quotation', 
         yes : () => {
            action()
            this.modal.close({clear:true})
         },
      })
   }

   updateCheckAllStatus(totalItems, totalChecked) {
      const checkAll = document.querySelector('.check-all');
      if (checkAll) {
         // Trả về false nếu không còn sản phẩm nào được chọn
         checkAll.checked = (totalChecked > 0 && totalChecked === totalItems);
      }
   }

      /**
   * Cập nhật vùng Thuế/Tổng thanh toán (Partial update)
   */
   updateVatSummaryPreset(body, data) {
   
      const fields = ['totalNonVat', 'totalVat', 'totalPaid', 'byWord'];

      fields.forEach(key => {
         const element = body.querySelector(`[data-field="${key}"]`);
         let displayValue = data[key];
         
         if (typeof displayValue === 'number' && key !== 'rate') {
            displayValue = new Intl.NumberFormat('en-US').format(displayValue);
         }
         element.innerText = displayValue;            
      });
   }
   
   clearCustomer(body) {
      let fields = body.querySelectorAll('[data-locate^="customer"]')
      if (fields.length !== 0) fields.forEach(field => field.innerText = '')
   }

   clearProducts(body) {
      let products = body.querySelectorAll('[data-productid]')
      if (products.length !== 0) products.forEach(product => product.remove())
   }

   confirmReloadTemplate(action) {
      this.yesNoQuestionModal({
         message: this.messages.reloadTemplate,
         title: 'Reload template confirm!', 
         yes : async () => {
            await action()
            this.modal.close({clear:true})
         },
      })
   }
}


