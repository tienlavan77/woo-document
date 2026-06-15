import PresetViewer from '../presetViewer'; 

/**
 * QuotationTemplateViewer
 * Chịu trách nhiệm render dữ liệu từ Model vào Template HTML[cite: 22].
 */
export default class DeliveryPresetViewer extends PresetViewer {
   constructor() {
      super()
      // Container chính chứa nội dung sẽ hiển thị ra màn hình[cite: 22]
      
   }
   
    /**
    * Render dữ liệu vào template và hiển thị ra màn hình
    * @param {Object} data - Object chứa { customer, products }
    */
    render(data, vatEnable) {   

      // 1. Render dữ liệu Customer (Sử dụng placeholder {{customer.name}})
      this._renderCustomer(data.customer)

      // 2. Render dữ liệu Products (Sử dụng block {{#products}}...{{/products}})
      this._renderProductList(data.products || {} );
   
   }
   
}
