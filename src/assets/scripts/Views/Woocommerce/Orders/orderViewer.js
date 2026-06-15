import Viewer from "../../viewer.js";

/**
 * LỚP CƠ SỞ (BASE)
 * Quản lý tất cả logic chung cho các loại đơn hàng[cite: 3].
 */
class CmpViewer extends Viewer {
   constructor(moduleName = 'record') {
      super();
      this.moduleName = moduleName;
      this.messages = {
         ...this.messages,
         notSameCustomer: `Customer details are inconsistent with the record. 
                           <br/><b style="color:red;">Warning: Proceeding will erase all previous data in this ${this.moduleName}.</b>`,         
         choiceCustomerDifferent: 'Humm! Please select orders from the same customer.',
         updateSuccess: `Successfully updated to ${this.moduleName}!`
      };
   }

   notSameCustomer({ yes, no }) {
      this._renderConfirmModal('Customer Mismatch', this.messages.notSameCustomer, yes, no);
   }

   choiceCustomerDifferent() {
      this._showNotice(this.messages.choiceCustomerDifferent);
   }

   _showNotice(message, style = "warning") {
      this.notice.open({ message, icon: true, style, timer: 3000 });
   }

   _renderConfirmModal(title, message, yes, no) {
      this.yesNoQuestionModal({ title, message, yes, no });
   }
}

/**
 * LỚP ĐẶC THÙ CHO QUOTATION
 * Cần thêm phương thức sameCustomer riêng[cite: 7].
 */
export class QuotationCmpViewer extends CmpViewer {
   constructor() {
      super('quote'); 
      this.messages = {
         ...this.messages,
         sameCustomer : `You are about to update the quote for this order. 
                        <br/><b style="color:orange;">Note: Existing information in the current quotation will be cleared.</b>`
      }
    
   }

   sameCustomer({ yes, no }) {
      this._renderConfirmModal('Update Confirmation', this.messages.sameCustomer, yes, no);
   }
}

/**
 * CÁC LỚP CÒN LẠI (Sử dụng kế thừa nhanh)
 * Chỉ cần định nghĩa tên module tương ứng[cite: 4, 5, 6].
 */
export class DeliveryCmpViewer extends CmpViewer { constructor() { super('delivery'); } }
export class InvoiceCmpViewer extends CmpViewer { constructor() { super('Invoice'); } }
export default class OrderViewer extends CmpViewer { constructor() { super('order'); } }
