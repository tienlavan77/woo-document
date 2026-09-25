import Controller from '../../controller'
import DocumentController from '../../Documents/documentController';
import PrintFileController from '../PrintFiles/printFileController.js';

export default class PostOrderController extends Controller {
   #documentController;
   constructor() {
      super();
      this.#documentController = new DocumentController();
      this.printFileController = new PrintFileController();
      
   }
}
