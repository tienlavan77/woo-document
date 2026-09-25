import ComponentBaseController from './componentBaseController';
import SystemViewer from '../../../../Views/Admin/Setting/Partials/systemViewer';
import SystemModel from '../../../../Models/Admin/Setting/systemModel';
import TagBuilder from '../../../../Vendor/helpers/tagBuilder';

export default class SystemController extends ComponentBaseController {
   constructor() {
      super();
      this.viewer = new SystemViewer();
      this.model = new SystemModel();
      this._bindSaveButton();
      this.init();
   }

   _bindSaveButton() {
      // Viewer phải được render trước khi controller gắn event. Giữ guard này
      // để lỗi lifecycle không biến thành "Cannot set properties of undefined".
      if (!this.viewer?.button) {
         this.viewer?.init?.();
      }

      if (!this.viewer?.button) {
         throw new Error('SystemViewer chưa được khởi tạo nút Save.');
      }

      this.viewer.button.onclick = () => this._handleSave();
   }

   async init() {
      const response = await this.model.init();
      if (response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Không thể tải cấu hình System.', 'error');
      }

      this._syncModelToUI();
      this._bindEvents();
   }

   _syncModelToUI() {
      Object.entries(this.viewer.elements).forEach(([key, control]) => {
         const value = this.model.data[key] || {};
         control.element.input.value = value.path || '';
         control.element.alias.checked = Boolean(value.alias);
         control.element.browse.disabled = !control.element.alias.checked;
      });
   }

   _bindEvents() {
      Object.entries(this.viewer.elements).forEach(([key, control]) => {
         const { input, alias, browse } = control.element;
         input.oninput = () => this._updateValue(key, input.value, alias.checked);
         alias.onchange = () => {
            this._updateValue(key, input.value, alias.checked);
            browse.disabled = !alias.checked;
         };
         browse.onclick = () => this._browse(key);
      });
   }

   _updateValue(key, path, alias) {
      this.model.data[key] = {
         ...(this.model.data[key] || {}),
         path,
         alias,
      };
   }

   async _handleSave() {
      Object.entries(this.viewer.elements).forEach(([key, control]) => {
         const { input, alias } = control.element;
         this._updateValue(key, input.value, alias.checked);
      });

      const response = await this.model.save();
      const style = response?.status?.code === 200 ? 'success' : 'dangerous';
      this.viewer.showNotice(response?.status?.message || 'Không thể lưu cấu hình System.', style === 'dangerous' ? 'error' : style);
   }

   async _browse(key, path = '') {
      const control = this.viewer.elements[key].element;
      const startPath = path || (control.alias.checked ? control.input.value.trim() : '');
      const response = await this.model.browse(startPath);
      if (response?.status?.code !== 200) {
         this.viewer.showNotice(response?.status?.message || 'Không thể đọc thư mục.', 'error');
         return;
      }

      this._renderBrowser(key, response.status.data);
   }

   _renderBrowser(key, data) {
      const browser = TagBuilder.create('div')
         .setAttributes({ className: 'system-folder-browser' })
         .build();
      const path = TagBuilder.create('code')
         .setAttributes({ className: 'system-folder-browser-path' })
         .text(data.current)
         .build();
      const choose = TagBuilder.create('button')
         .setAttributes({ type: 'button', className: 'button button-primary' })
         .html('Chọn thư mục này')
         .build();
      choose.onclick = () => {
         const control = this.viewer.elements[key].element;
         control.input.value = data.current;
         this._updateValue(key, data.current, true);
         this.viewer.modal.close();
      };

      const toolbar = TagBuilder.create('div')
         .setAttributes({ className: 'system-folder-browser-toolbar' })
         .append([path, choose])
         .build();
      browser.append(toolbar);

      if (data.parent) {
         const parent = TagBuilder.create('button')
            .setAttributes({ type: 'button', className: 'button system-folder-browser-parent' })
            .html('..')
            .build();
         parent.onclick = () => this._browse(key, data.parent);
         browser.append(parent);
      }

      const list = TagBuilder.create('ul')
         .setAttributes({ className: 'system-folder-browser-list' })
         .build();
      data.directories.forEach(directory => {
         const button = TagBuilder.create('button')
            .setAttributes({ type: 'button', className: 'button-link system-folder-browser-directory' })
            .append([
               TagBuilder.create('span').setAttributes({ className: 'dashicons dashicons-open-folder' }).build(),
               document.createTextNode(directory.name)
            ])
            .build();
         button.onclick = () => this._browse(key, directory.path);
         list.append(TagBuilder.create('li').append([button]).build());
      });
      browser.append(list);

      this.viewer.modal
         .title('Chọn thư mục')
         .width('90%')
         .maxWidth('760px')
         .footer(false)
         .content([browser])
         .open();
   }
}
