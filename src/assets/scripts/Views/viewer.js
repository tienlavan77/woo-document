import Notice from "../Vendor/notice/notice";
import Modal from "../Vendor/modal/modal";
import FormFactory from "../Vendor/helpers/formFactory";

const globalNotice = new Notice().init({id: 'tsp-notice'})
const globalModal = new Modal().init({
   id: "tsp-modal",
   config: { 
      clear: true, 
      title: "Notice", 
      header: true, 
      footer: false,
      escExit: true, 
      draggable: true,
   },
});

export default class Viewer {
   static formFactory = FormFactory;
   constructor() {
      // Khởi tạo core tools
		this.notice = globalNotice
      this.modal = globalModal
      this.messages = {
         noAnyChoice: 'Oops! It looks like no items have been selected.',
         updateSuccess: 'update success!'
      }
   }
   /**
    * Tạo cấu trúc DOM cho câu hỏi Xác nhận (Yes/No)
    * @param {Object} options - Cấu hình nội dung
    * @param {string} options.message - Nội dung thông báo
    * @param {string} [options.yesText='Agree'] - Nhãn nút đồng ý
    * @param {string} [options.noText='No agree'] - Nhãn nút từ chối
    * @returns {Object} Chứa element cha và các tham chiếu nút
    */
   yesNoQuestion({ message, yesText = 'Agree', noText = 'No agree' }) {
      const agree = FormFactory.create({
         tag: 'button',
         className: 'btn button',
         style: 'margin-right: 10px',
         innerHTML: yesText,
      });

      const noAgree = FormFactory.create({
         tag: 'button',
         className: 'btn button',       
         innerHTML: noText,
      });

      const main = FormFactory.create({
         tag: 'div',
         className: 'warning',
         children: [
            FormFactory.create({
               tag: 'p',
               className: 'message',
               innerHTML: `${message}&nbsp;`,
            }),
            FormFactory.create({
               tag: 'div',
               className: 'button__cover',
               style: 'text-align: center; margin-top: 15px;', // Thêm margin để thoáng hơn
               children: [agree, noAgree],
            }),
         ],
      });

      return {
         parent: main,
         agree,
         noAgree
      };
   } 

   /**
    * Hiển thị Modal xác nhận với logic xử lý sự kiện
    * @param {Object} config - Cấu hình modal
    */
   yesNoQuestionModal({ message, title, yes, no, yesText, noText }) { 
      // 1. Khởi tạo UI
      const notice = this.yesNoQuestion({ message, yesText, noText });
      
      // 2. Gán sự kiện cho nút Đồng ý (Yes)
      if (typeof yes === 'function') {
         notice.agree.onclick = (e) => yes(e);
      }

      // 3. Gán sự kiện cho nút Từ chối (No)
      // Nếu không truyền hàm 'no', mặc định là đóng và dọn dẹp modal
      notice.noAgree.onclick = typeof no === 'function' 
         ? (e) => no(e) 
         : () => this.modal.close({ clear: true }); 
      
      // 4. Mở modal và nạp nội dung
      return this.modal
         .open()
         .maxWidth('600px')
         .footer(false) // Đảm bảo ẩn footer từ các modal trước đó (như modal upload)
         .title(title)
         .content([notice.parent]);
   }

   /**
    * Hiển thị thông báo nhanh (Toast notice) với nội dung tùy chỉnh
    * @param {string} message - Nội dung thông báo
    * @param {string} style - Loại giao diện: 'info', 'success', 'warning', 'error'
    */
   showNotice(message, style = 'info') {
      this.notice.open({
         message: message,
         icon: true,
         style: style,
         timer: 3000,
      });
   }

   /**
    * Hiển thị thông báo nhanh (Toast notice) thành công
    * @param {Object} options - Cấu hình thông báo
    */
   updateSuccessNotice() {
      this.notice.open({
         message: this.messages.updateSuccess, 
         icon: true,
         style: "success",
         timer: 1500,
      });
   }

   /**
    * Hiển thị thông báo hướng dẫn khi người dùng chưa chọn sản phẩm nào[cite: 2]
    */
   noAnyChoiceNotice() {
      this.notice.open({
         message: this.messages.noAnyChoice,
         icon: true,
         style: "info",
         timer: 3000,
      });
   }
   
}
