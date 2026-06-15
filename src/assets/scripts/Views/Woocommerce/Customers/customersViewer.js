import Viewer from "../../viewer";

export default class CustomersViewer extends Viewer {
   constructor() {
      super();
      this.link = '.addtodocument';   
      this.messages = {
         ...this.messages,
         same: 'The customer whom you have just choiced was exist in quotation. Do you want to update it?',
         different: 'The customer whom you have just choiced is really different in quotation. Do you want to change it?',
         updateSuccess: 'Customer information updated successfully!'
      }
   }
   updateCustomerNotice({ yes, no, message }) {
      return this.yesNoQuestionModal({
         message,
         title: 'Warning: The exist customer in quotation',
         yes,
         no
      })
   }
}

