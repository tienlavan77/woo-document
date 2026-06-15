import Model from "../model"

export default class PanelModel extends Model {
   constructor() {
      super()    
      this.storageName = 'panel'
		this.onlyLocal = true	      
   }
}
