import PartialViewer from "./partialViewer";

export default class UserViewer extends PartialViewer {
   constructor() {
      super();     
      this.title = 'User Information';
      this.init();
   }

   _initInteractiveElements() {
      const className = 'form__field form__item regular-text wd-100 setting__item';
      return this.elements = { 
         key: {
            label: 'Consumer key', // 
            typeof: 'input',
            element: {
                  type: 'text',
                  name: 'key',
                  placeholder: 'Put your Consumer key',
                  className,
               
               }
            },
         secret:{
            label: 'Consumer secret',
            typeof: 'input',
            element: {
               type: 'text',
               name: 'secret',
               placeholder: 'Put your Consumer secret',
               className
            }            
         },
                 
         signature: {
            label: 'Signature',
            typeof: 'imagebox',
            element: {
               type: 'text',
               name: 'signature',
               placeholder: 'Signature\'s link',
               className,
            }
         }              
      }      
    
   }

   _viewImage (element) {  
      let link = element.link.value;
      this.modal.open({title : 'Image viewer signature'})
         .content([
            this.formFactory.tagBuilder.create('img')
               .setAttributes({src: link})
               .build()
         ])
      
	}

   init() {
      this.button = { tag: 'button', attributes: { className: 'btn __save' },  innerHTML: 'Save'}
      this.elements = this._initInteractiveElements();
      super.init();
      
   }
}
