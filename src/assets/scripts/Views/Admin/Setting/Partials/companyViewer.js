import PartialViewer from "./partialViewer";

export default class CompanyViewer extends PartialViewer {
   constructor() {
      super();    
      this.title = 'Company Information';
      this.init();
   }
   
   _initInteractiveElements() {
      const className = 'form__field form__item regular-text wd-100 setting__item';
      return this.elements = { 
         name: {
            label: 'Full name', // 
            typeof: 'input',
            element: {
                  type: 'text',
                  name: 'name',
                  placeholder: 'Put your company\'s name',
                  className,
}
            },
         address:{
            label: 'Address',
            typeof: 'input',
            element: {
               type: 'text',
               name: 'address',
               placeholder: 'Put your company\'s address',
               className
            }            
         },
         taxcode:{
            label: 'Tax code',
            typeof: 'input',
            element: {
               type: 'text',
               name: 'taxcode',
               placeholder: 'Tax code',
               className
            }            
         },
         phone:{
            label: 'Phone',
            typeof: 'input',
            element: {
               type: 'text',
               name: 'phone',
               placeholder: 'company\'s phone',
               className
            }            
         },
         email:{
            label: 'Email',
            typeof: 'input',
            element: {
               type: 'text',
               name: 'email',               
               placeholder: 'company\'s email',
               className
            }            
         },
         stamp: {
            label: 'Stamp',
            typeof: 'imagebox',
            element: {
               type: 'text',
               name: 'stamp',
               placeholder: 'Stamp\'s link',
               className,
            }
         }              
      }      
    
   }

   _viewImage (element) {  
      let link = element.link.value;
      this.modal.open({title : 'Image viewer company stamp'})
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
