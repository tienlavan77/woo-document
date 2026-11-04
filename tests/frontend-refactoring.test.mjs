/* Provides module implementation and exported declarations for frontend-refactoring.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT_DIR = process.cwd();

/* Executes documented symbol logic in frontend-refactoring.test.mjs. */
function sha256File(relPath) {
   const fullPath = path.join(ROOT_DIR, relPath);
   const buf = fs.readFileSync(fullPath);
   return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

/* Executes documented symbol logic in frontend-refactoring.test.mjs. */
function loadEsModuleClass(relPath, injectedScope = {}) {
   const code = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8')
      .replace(/import\.meta\.env\?\.DEV/g, 'false')
      .replace(/import\.meta\.env\.DEV/g, 'false')
      .replace(/^import\s+.*?;?\s*$/gm, '')
      .replace(/export\s+default\s+class\s+(\w+)/, 'globalThis.__exportedClass = class $1');
   const context = vm.createContext({
      ...globalThis,
      ...injectedScope,
      console,
      JSON,
      Object,
      Array,
      Error,
      Promise,
   });
   vm.runInContext(code, context, { filename: relPath });
   return context.__exportedClass;
}

test('O1 & O3: Build Vite tạo đầy đủ dist/.vite/manifest.json và các chunk controller động', () => {
   const manifestRel = 'dist/.vite/manifest.json';
   const manifestPath = path.join(ROOT_DIR, manifestRel);
   assert.equal(fs.existsSync(manifestPath), true, 'dist/.vite/manifest.json phải tồn tại sau khi build');

   const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
   assert.ok(manifest['src/main.js'], 'Manifest phải có entry src/main.js');
   assert.ok(manifest['src/main.js'].file, 'Entry src/main.js phải xuất ra file bundle');
   assert.equal(fs.existsSync(path.join(ROOT_DIR, 'dist', manifest['src/main.js'].file)), true);

   const dynamicControllers = [
      'src/assets/scripts/Controllers/Admin/adminLoadController.js',
      'src/assets/scripts/Controllers/WooCommerce/wooCommerceController.js',
      'src/assets/scripts/Controllers/Admin/Quotation/quotationAdminController.js',
      'src/assets/scripts/Controllers/Admin/Delivery/deliveryAdminController.js',
      'src/assets/scripts/Controllers/Admin/Invoice/invoiceAdminController.js',
      'src/assets/scripts/Controllers/Admin/Setting/settingController.js',
      'src/assets/scripts/Controllers/WooCommerce/Orders/orderController.js',
      'src/assets/scripts/Controllers/WooCommerce/Products/editProductController.js',
      'src/assets/scripts/Controllers/WooCommerce/Customers/customersController.js',
   ];

   for (const entry of dynamicControllers) {
      assert.ok(manifest[entry], `Manifest phải chứa dynamic chunk cho ${entry}`);
   }

   console.log('MANIFEST_SHA256=' + sha256File(manifestRel));
});

test('O3: Thực thi runtime Frontend JS kiểm chứng App.init() parse meta#pagenow 1 lần, Models localStorage keys và BroadcastChannel', async () => {
   const storageStore = new Map();
   const mockLocalStorage = {
      getItem: (k) => (storageStore.has(k) ? storageStore.get(k) : null),
      setItem: (k, v) => storageStore.set(k, String(v)),
      removeItem: (k) => storageStore.delete(k),
      clear: () => storageStore.clear(),
   };
   globalThis.localStorage = mockLocalStorage;
   // Defines reload method behavior for frontend-refactoring.test.mjs.
   globalThis.window = { localStorage: mockLocalStorage, location: { href: '', reload() {} } };

   const broadcastMessages = [];
   globalThis.BroadcastChannel = class MockBroadcastChannel {
      // Defines constructor method behavior for frontend-refactoring.test.mjs.
      constructor(name) {
         this.name = name;
         this.onmessage = null;
      }
      // Defines postMessage method behavior for frontend-refactoring.test.mjs.
      postMessage(msg) {
         broadcastMessages.push({ channel: this.name, msg });
      }
      // Defines close method behavior for frontend-refactoring.test.mjs.
      close() {}
   };

   let metaQueryCount = 0;
   let datasetPageGetterCount = 0;
   const mockMetaTag = {
      dataset: {
         // Defines page method behavior for frontend-refactoring.test.mjs.
         get page() {
            datasetPageGetterCount++;
            return JSON.stringify({ page: 'admin', type: 'quotation' });
         },
      },
   };

   const mockDocument = {
      querySelector: (selector) => {
         if (selector === 'meta#pagenow') {
            metaQueryCount++;
            return mockMetaTag;
         }
         return null;
      },
      addEventListener: () => {},
   };
   globalThis.document = mockDocument;

   const { default: StorageManager } = await import('../src/assets/scripts/Vendor/helpers/storageManager.js');
   const { default: DataChecker } = await import('../src/assets/scripts/Vendor/helpers/dataChecker.js');
   const { default: TextHelper } = await import('../src/assets/scripts/Vendor/helpers/textHelper.js');
   const { default: BroadcastBus } = await import('../src/assets/scripts/Vendor/helpers/broadcastChannel.js');

   StorageManager.set('tax_vat', { standard: 10 });

   const MockHttpClient = {
      get: async () => ({ status: { code: 200, data: {} } }),
      post: async () => ({ status: { code: 200, data: {} } }),
      put: async () => ({ status: { code: 200, data: {} } }),
      delete: async () => ({ status: { code: 200, data: {} } }),
   };

   const Model = loadEsModuleClass('src/assets/scripts/Models/model.js', {
      StorageManager,
      HttpClient: MockHttpClient,
   });
   const WooCommerceModel = loadEsModuleClass('src/assets/scripts/Models/Woocommerce/wooCommerceModel.js', {
      Model,
   });
   const CustomersModel = loadEsModuleClass('src/assets/scripts/Models/Woocommerce/Customers/customersModel.js', {
      WooCommerceModel,
   });
   const ProductModel = loadEsModuleClass('src/assets/scripts/Models/Woocommerce/Products/productModel.js', {
      WooCommerceModel,
      DataChecker,
   });
   const VatModel = loadEsModuleClass('src/assets/scripts/Models/Woocommerce/Vat/vatModel.js', {
      Model,
   });
   const BaseModel = loadEsModuleClass('src/assets/scripts/Models/baseModel.js', {
      Model,
      CustomersModel,
      ProductModel,
   });
   const QuotationModel = loadEsModuleClass('src/assets/scripts/Models/Admin/Quotation/quotationModel.js', {
      BaseModel,
      CustomersModel,
      ProductModel,
      VatModel,
   });
   const DeliveryModel = loadEsModuleClass('src/assets/scripts/Models/Admin/Delivery/deliveryModel.js', {
      BaseModel,
      CustomersModel,
      ProductModel,
   });
   const InvoiceModel = loadEsModuleClass('src/assets/scripts/Models/Admin/Invoice/invoiceModel.js', {
      BaseModel,
      CustomersModel,
      ProductModel,
      VatModel,
   });

   // Executes documented symbol logic in frontend-refactoring.test.mjs.
   const defaultCustomer = new CustomersModel();
   const defaultProduct = new ProductModel();
   assert.equal(defaultCustomer.storageName, 'cs_quotation');
   assert.equal(defaultProduct.storageName, 'products_quotation');

   const quotationModel = new QuotationModel();
   assert.equal(quotationModel.customer.storageName, 'cs_quotation');
   assert.equal(quotationModel.products.storageName, 'products_quotation');
   quotationModel.customerData = { id: 1, name: 'Khách Báo Giá' };
   quotationModel.productData = { 101: { id: 101, name: 'SP Báo Giá' } };
   quotationModel.saveLocal();

   const deliveryModel = new DeliveryModel();
   assert.equal(deliveryModel.customer.storageName, 'cs_delivery');
   assert.equal(deliveryModel.products.storageName, 'products_delivery');
   deliveryModel.customerData = { id: 2, name: 'Khách Giao Hàng' };
   deliveryModel.productData = { 102: { id: 102, name: 'SP Giao Hàng' } };
   deliveryModel.saveLocal();

   const invoiceModel = new InvoiceModel();
   assert.equal(invoiceModel.customer.storageName, 'cs_invoice');
   assert.equal(invoiceModel.products.storageName, 'products_invoice');
   assert.equal(Array.isArray(invoiceModel.productData), true);
   invoiceModel.customerData = { id: 3, name: 'Khách Hóa Đơn' };
   invoiceModel.productData = [{ id: 103, name: 'SP Hóa Đơn' }];
   invoiceModel.saveLocal();

   assert.equal(StorageManager.get('cs_quotation').name, 'Khách Báo Giá');
   assert.equal(StorageManager.get('products_quotation')['101'].name, 'SP Báo Giá');
   assert.equal(StorageManager.get('cs_delivery').name, 'Khách Giao Hàng');
   assert.equal(StorageManager.get('products_delivery')['102'].name, 'SP Giao Hàng');
   assert.equal(StorageManager.get('cs_invoice').name, 'Khách Hóa Đơn');
   assert.equal(StorageManager.get('products_invoice')[0].name, 'SP Hóa Đơn');

   // Executes documented symbol logic in frontend-refactoring.test.mjs.
   const Controller = loadEsModuleClass('src/assets/scripts/Controllers/controller.js', {
      BroadcastBus,
      TextHelper,
   });
   const baseCtrl = new Controller();
   assert.ok(baseCtrl.channel, 'Controller phải khởi tạo kênh BroadcastChannel');
   baseCtrl.channel.emit('quotation', { action: 'reload' });
   assert.equal(broadcastMessages.length, 1);
   assert.equal(broadcastMessages[0].channel, 'document_channel');

   // Executes documented symbol logic in frontend-refactoring.test.mjs.
   const loadedModules = [];
   let AdminLoadControllerClass;
   let WooCommerceControllerClass;
   const mockModuleLoader = {
      // Defines load method behavior for frontend-refactoring.test.mjs.
      async load(modulePath, data) {
         loadedModules.push({ modulePath, data });
         if (modulePath === 'Admin/adminLoadController') {
            return new AdminLoadControllerClass();
         }
         if (modulePath === 'WooCommerce/wooCommerceController') {
            return new WooCommerceControllerClass();
         }
         return { modulePath };
      },
   };

   const AppClass = loadEsModuleClass('src/assets/scripts/app.js', {
      ModuleLoader: mockModuleLoader,
      AuthController: class MockAuthController {},
      document: mockDocument,
   });
   AdminLoadControllerClass = loadEsModuleClass('src/assets/scripts/Controllers/Admin/adminLoadController.js', {
      ModuleLoader: mockModuleLoader,
      TextHelper,
      App: AppClass,
      document: mockDocument,
   });
   WooCommerceControllerClass = loadEsModuleClass('src/assets/scripts/Controllers/WooCommerce/wooCommerceController.js', {
      ModuleLoader: mockModuleLoader,
      TextHelper,
      App: AppClass,
      document: mockDocument,
   });

   AppClass.isStarted = false;
   AppClass.pageData = null;
   metaQueryCount = 0;
   datasetPageGetterCount = 0;

   const app = new AppClass();
   await app.init();

   assert.equal(metaQueryCount, 1, 'document.querySelector("meta#pagenow") chỉ được gọi đúng 1 lần trong App.init()');
   assert.equal(datasetPageGetterCount, 1, 'metaTag.dataset.page chỉ được đọc và parse JSON đúng 1 lần trong App.init()');
   assert.deepEqual(loadedModules.map((m) => m.modulePath), [
      'Admin/adminLoadController',
      'Admin/Quotation/quotationAdminController',
   ]);

   AppClass.pageData = { page: 'edit', type: 'order' };
   new WooCommerceControllerClass();
   assert.equal(metaQueryCount, 1, 'WooCommerceController không được truy vấn lại meta#pagenow');
   assert.equal(datasetPageGetterCount, 1, 'WooCommerceController không được parse lại dataset.page');
   assert.equal(loadedModules.at(-1).modulePath, 'WooCommerce/Orders/orderController');
});
