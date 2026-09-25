import PartialViewer from './partialViewer';
import TagBuilder from '../../../../Vendor/helpers/tagBuilder';

export default class SystemViewer extends PartialViewer {
   constructor() {
      super();
      this.title = 'System';
      this.init();
   }

   _initInteractiveElements() {
      const className = 'form__field form__item regular-text wd-100 setting__item';
      return {
         document_folder: {
            label: 'Document folder',
            typeof: 'folder',
            element: { type: 'text', name: 'document_folder', placeholder: 'order_documents', className },
         },
         print_folder: {
            label: 'Print folder',
            typeof: 'folder',
            element: { type: 'text', name: 'print_folder', placeholder: 'print_documents', className },
         },
      };
   }

   _createFolderSection(item, key) {
      const input = this._createInput({ ...item.element });
      const alias = TagBuilder.create('input')
         .setAttributes({ type: 'checkbox', name: `${key}_alias`, className: 'system-folder-alias' })
         .build();
      const browse = TagBuilder.create('button')
         .setAttributes({ type: 'button', className: 'btn system-folder-browse', disabled: true })
         .html('Browse')
         .build();
      const aliasLabel = TagBuilder.create('label')
         .setAttributes({ className: 'system-folder-alias-label' })
         .append([alias, document.createTextNode(' Alias')])
         .build();
      const row = TagBuilder.create('div')
         .setAttributes({ className: 'system-folder-input-row' })
         .append([input, browse])
         .build();
      const options = TagBuilder.create('div')
         .setAttributes({ className: 'system-folder-options' })
         .append([aliasLabel])
         .build();
      const cover = this._createRow(item.label, [row, options]);

      return { cover, controller: { input, alias, browse } };
   }

   _createBody() {
      const children = Object.keys(this.elements).map(key => {
         const frame = this._createFolderSection(this.elements[key], key);
         this.elements[key].element = frame.controller;
         return frame.cover;
      });

      return this.formFactory.create({
         tag: 'div',
         className: 'frame__content',
         children,
      });
   }

   init() {
      this.button = { tag: 'button', attributes: { className: 'btn __save', type: 'button' }, innerHTML: 'Save' };
      this.elements = this._initInteractiveElements();
      super.init();
   }
}
