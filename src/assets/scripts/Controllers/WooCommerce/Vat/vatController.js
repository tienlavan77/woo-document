import Controller from '../../controller'
import VatModel from '../../../Models/Woocommerce/Vat/vatModel'

export default class VatController extends Controller {
   constructor() {
      super()
      this.model = new VatModel()
      this.init()
   }
   async init() {
      await this.model.init()
   }
}
