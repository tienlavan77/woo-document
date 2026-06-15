import Controller from '../../controller.js'
import OrderViewer, { QuotationCmpViewer, DeliveryCmpViewer, InvoiceCmpViewer } 
      from '../../../Views/Woocommerce/Orders/orderViewer.js';
// Giả định các Model đã được import đúng đường dẫn
import OrdersModel from '../../../Models/Woocommerce/Orders/ordersModel';
import QuotationModel from '../../../Models/Admin/Quotation/quotationModel'; 
import DeliveryModel from '../../../Models/Admin/Delivery/deliveryModel';
import InvoiceModel from '../../../Models/Admin/Invoice/invoiceModel'
import DataChecker from '../../../Vendor/helpers/dataChecker'
import DocumentController from '../../Documents/documentController.js';

/**
 * 1. BASE CONTROLLER - Chứa logic xử lý cốt lõi
 */
class OrderCmpController {
   constructor(model, viewer, type, channel) {
      this.model = model;
      this.viewer = viewer;
      this.type = type;
      this.channel = channel;
   }

   /** Luồng thêm đơn hàng tổng quát[cite: 8] */
   add(orders) {
      
      const customerInOrder = orders?.customer?.id;
      if (! customerInOrder) return console.warn("Dữ liệu khách hàng không hợp lệ.");

      const customerInExisting = this.model.customer.data?.id;
   
      // // Nếu dữ liệu trống, cập nhật trực tiếp[cite: 8]
      // // không có khách hàng nào trong model, cập nhật trực tiếp mà không cần hỏi[cite: 8]
      if (! customerInExisting) { 
         console.log("No existing customer in model. Updating directly without confirmation.");
         this.update(orders, false);
         return;
      }

      const handleConfirmYes = (isSame) => {
         this.update(orders, isSame);
         this.viewer.modal.close({ clear: true });
      };

      // Kiểm tra tính nhất quán khách hàng[cite: 8]      
      if (customerInOrder !== customerInExisting) {
         this.viewer.notSameCustomer({ yes: () => handleConfirmYes(false) });
      } else {
         this.handleSameCustomer(orders, () => handleConfirmYes(true));
      }
   }

   /** Mặc định: Cập nhật luôn nếu cùng khách hàng (Có thể ghi đè ở class con)[cite: 8] */
   handleSameCustomer(orders, onYes) {
      this.update(orders, true);
   }

   /** Thực thi lưu dữ liệu[cite: 8] */
   update(orders, isSame) {
      if (! isSame) this.model.customer.data = orders.customer;

      this.updateProductsLogic(orders, isSame);
      this.model.saveLocal();
      
      this.viewer.updateSuccessNotice();
      if (this.channel) {
         this.channel.emit(this.type, {
            type: 'order',
            action: 'update'
         });
      }
      return true;
   }

   /** Logic gộp sản phẩm mặc định: Gộp an toàn (Merge)[cite: 8] */
   updateProductsLogic(orders, isSame) {
      const currentProducts = this.model.products.data || {};

      if (! isSame || DataChecker.isEmpty(currentProducts)) {
         this.model.products.data = orders.products;
         return;
      }

      this.model.products.data = {... this.model.products.data, ...orders.products};
   }
}

/**
 * 2. CÁC CONTROLLER CON ĐẶC THÙ[cite: 9, 10, 12]
 */

// Quotation: Cần hỏi lại khi trùng khách hàng và ghi đè sản phẩm hoàn toàn[cite: 12]
class QuotationCmpController extends OrderCmpController {
   constructor(channel) { super(new QuotationModel(), new QuotationCmpViewer(), 'quotation', channel); }

   handleSameCustomer(orders, onYes) {
      this.viewer.sameCustomer({ yes: () => onYes(true) });
   }

   updateProductsLogic(orders) {
      this.model.products.data = orders.products; // Ghi đè thay vì gộp[cite: 12]
   }
}

// Delivery & Invoice: Sử dụng logic gộp mặc định của Base[cite: 9, 10]
class DeliveryCmpController extends OrderCmpController {
   constructor(channel) { super(new DeliveryModel(), new DeliveryCmpViewer(), 'delivery', channel); }
}

class InvoiceCmpController extends OrderCmpController {
   constructor(channel) { super(new InvoiceModel(), new InvoiceCmpViewer(),'invoice', channel); }
}

/**
 * 3. MASTER CONTROLLER - Điều phối chính
 */
export default class OrderController extends Controller {
   constructor() {
      super()
      this.viewer = new OrderViewer();
      this.model = new OrdersModel();
      
      // Khởi tạo các module con
      this.quotation = new QuotationCmpController(this.channel);
      this.delivery = new DeliveryCmpController(this.channel);
      this.invoice = new InvoiceCmpController(this.channel);
      this.document = new DocumentController();
      
      this.init();
   }

   async init() {
      await this.model.init();
      // Sử dụng delegation để quản lý sự kiện click hiệu quả hơn[cite: 11]
      document.addEventListener('click', this._handleActionClick.bind(this));
   }

   async _handleActionClick(event) {
      const target = event.target.closest('.addtodocument');
      if (!target) return;

      event.preventDefault();
      const ordersChoiced = document.querySelectorAll('input[name="post[]"]:checked');

      if (!ordersChoiced.length) {
         this.viewer.noAnyChoiceNotice();
         return;
      }

      // Kiểm tra các đơn hàng được chọn có cùng một khách hàng không[cite: 11]
      const customersId = [...ordersChoiced].map(input => input.dataset.customerid);
      const isSame = customersId.every(id => id === customersId[0]);

      if (!isSame) {
         this.viewer.choiceCustomerDifferent();
         return;
      }

      // Lấy dữ liệu và điều hướng action[cite: 11]
      const action = target.dataset.action; // updateQuotation, updateDelivery, etc.
      const type = action.includes('Quotation')? 'quotation': 'delivery'
      const params = [...ordersChoiced].map(input => input.value).join(',');
      const ordersData = await this.model.get(`?include=${params}&type=${type}`);

      if (typeof this[action] === 'function') {
         this[action](ordersData);
      }
   }

   updateQuotation(orders) { this.quotation.add(orders); }
   updateDelivery(orders) { this.delivery.add(orders); }
   updateInvoice(orders) { this.invoice.add(orders); }

   onSyncProduct({type, action}) {
      this[type].model.products.data = this[type].model.products._getStorage();      
      
   }

   onSyncCustomer({type, action}) {
      this[type].model.customer.data = this[type].model.customer._getStorage()     
   }
}
