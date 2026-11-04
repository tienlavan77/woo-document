# Knowledge base - Documents for commercial

Tài liệu này mô tả source hiện tại của plugin WordPress `document` sau khi audit các file PHP, JavaScript, cấu hình build và template. Đây là tài liệu dành cho người phát triển/bảo trì; không phải tài liệu hướng dẫn người dùng cuối.

## 1. Mục đích và phạm vi

Plugin bổ sung một bộ công cụ cho WooCommerce để:

- tạo và in báo giá (quotation), phiếu giao hàng (delivery) và hóa đơn VAT (invoice);
- lấy khách hàng, sản phẩm, đơn hàng và thuế từ WooCommerce REST API;
- lưu mẫu HTML của từng loại tài liệu trong thư mục `templates/`;
- gắn file PDF vào một hoặc nhiều đơn hàng;
- quản lý kho file PDF: tải lên, xem thông tin, xem trước và xóa;
- lưu thông tin công ty và thông tin kết nối WooCommerce theo user.

Plugin phụ thuộc WooCommerce. Nếu WooCommerce chưa được cài hoặc chưa active, plugin không bootstrap các menu, API và module WooCommerce; thay vào đó hiển thị admin notice.

## 2. Bản đồ thư mục

```text
plugin.php                 Entry point WordPress và hằng số plugin
composer.json              Autoload PSR-4 và firebase/php-jwt
package.json               Vite, Sass, Excel/PDF và script build
vite.config.js             Cấu hình dev server và production build
bundle.js                  Build Vite rồi đóng gói plugin thành document.zip

core/
  App.php                  Bootstrap, service container, menu và controller
  Api/                     REST API namespace tinsinhphat/v1
  Controllers/             Hook handlers, menu, tài liệu và WooCommerce
  Middlewares/             Xác thực JWT
  Models/                  Truy cập option, user meta, order meta, filesystem
  Support/                 Container, hook registry, plugin/auth support
  Views/                   Markup PHP tối thiểu cho các trang admin

templates/                 HTML minified dùng để render/in tài liệu
src/main.js                Entry point frontend
src/assets/scripts/
  Controllers/              Điều phối theo trang hiện tại
  Models/                   HTTP, localStorage và dữ liệu nghiệp vụ
  Views/                    Dựng UI admin bằng JavaScript
  Vendor/                   Modal, notice, drag-drop và helper nội bộ
src/style.scss             Entry point CSS/Sass
dist/                      Output Vite production, không có sẵn trong source tree
```

## 3. Luồng khởi động PHP

1. WordPress nạp `plugin.php`.
2. `Tinsinhphat::get_instance()` đăng ký hook `plugins_loaded`.
3. `Tinsinhphat::init()` nạp `vendor/autoload.php`, khởi tạo `App` và thêm link Setting vào danh sách action của plugin.
4. `App` tạo `ServiceContainer`, `HookManager`, `PluginManager` và `MenuRegistry`.
5. `PluginManager` kiểm tra WooCommerce.
6. Nếu hợp lệ, `App` đăng ký menu, xác thực cấu hình user, REST API, asset loader, các hook WooCommerce và `DocumentController`.
7. `LoadingApi` chờ `rest_api_init`, sau đó khởi tạo `SettingApi`, `TemplatesApi`, `AuthenticateApi` và `DocumentApi`.

Các service chính trong container:

| Tên | Class | Vai trò |
| --- | --- | --- |
| `hooks` | `App\\Support\\HookManager` | Đăng ký và theo dõi action/filter |
| `checkToken` | `CheckTokenController` | Cảnh báo user chưa cấu hình thông tin |
| `loadScript` | `LoadScriptController` | Nạp JS/CSS và meta nhận diện trang |
| `documentController` | `DocumentController` | Link tài liệu trên màn hình order |
| `masterSupporter` | `MasterSupporterController` | Khởi tạo các tích hợp WooCommerce |
| `loadingApi` | `LoadingApi` | Khởi tạo REST API |

`ServiceContainer` hỗ trợ `register`, `singleton`, `get`, `has`. Tuy nhiên một số API/controller vẫn tự dùng singleton tĩnh hoặc `new`, vì vậy container chưa phải cơ chế dependency injection duy nhất của toàn project.

## 4. Menu và màn hình admin

Menu gốc là `Documents` với slug `quotation`, capability `manage_woocommerce`. Các submenu hiện có:

| Menu | Slug | View PHP | Root DOM |
| --- | --- | --- | --- |
| Quotation | `quotation` | `QuotationViewer` | `#tsp_quotation` |
| Delivery | `delivery` | `DeliveryViewer` | `#tsp_delivery` |
| Invoice | `invoice` | `InvoiceViewer` | `#tsp_invoice` |
| Setting | `setting` | `SettingViewer` | `#tsp_setting` |

Các View PHP chủ yếu tạo wrapper rỗng (`header__cover`, `body__cover`). UI thật được dựng bởi frontend JavaScript sau khi asset được nạp.

`LoadScriptController` đặt hai meta tag trên các trang WordPress phù hợp:

- `meta[name="wp-api-nonce"]`: nonce cho WordPress REST API;
- `meta#pagenow[data-page]`: JSON dạng `{ page, type }`, dùng để frontend định tuyến.

Giá trị `type` được suy ra từ `pagenow`, `post_type` hoặc post hiện tại: `order`, `product`, `user`, `quotation`, `delivery`, `invoice`, `setting`...

## 5. Luồng khởi động frontend

`src/main.js` import `src/style.scss`, chờ `DOMContentLoaded`, rồi tạo `App` từ `src/assets/scripts/app.min.js`.

`App` đọc `meta#pagenow` và định tuyến:

| `page` | Controller loader |
| --- | --- |
| `edit`, `post`, `users` | `WooCommerce/wooCommerceController` |
| `admin` | `Admin/adminLoadController` |

Sau đó:

- `WooCommerceController` ghép `page + capitalize(type)` để tải controller cho order/product/customer;
- `AdminLoadController` tải controller cho quotation, delivery, invoice hoặc setting;
- `ModuleLoader` dùng `import.meta.glob` để dynamic import controller;
- các controller kế thừa `Controllers/controller.js`, dùng `BroadcastChannel` tên `document_channel` để đồng bộ giữa tab/module;
- `Views/viewer.js` cung cấp modal, notice và `FormFactory` dùng chung.

Mô hình frontend là `Controller -> Model -> View`. `Model` dùng `HttpClient` cho fetch và `StorageManager` cho JSON trong `localStorage`. Các bộ dữ liệu quotation/delivery/invoice thường gồm customer, products và VAT; dữ liệu chỉnh sửa được giữ local để có thể chuyển qua lại giữa các trang.

## 6. Xác thực và quyền

### Đăng nhập JWT

`POST /wp-json/tinsinhphat/v1/auth/login` là endpoint public. Backend dùng `wp_signon`, sau đó chỉ cho phép role được trả về bởi filter `document_allowed_roles`; mặc định là:

- `administrator`;
- `shop_manager`.

JWT dùng thuật toán HS256, chứa `iat`, `nbf`, `exp`, `sub`, `userName`, `role` và hiện được đặt hạn 30 ngày. Secret được đọc từ constant `SECRET_KEY_DOCUMENT`; constant này không được định nghĩa trong source plugin, nên phải tồn tại ở WordPress runtime (thường là `wp-config.php` hoặc bootstrap bên ngoài).

Frontend lưu token trong `localStorage` với key `_token` và gửi `Authorization: Bearer <token>` cho các API của plugin.

### Middleware

`JwtAuthenticate::JwtAuthenticate()`:

1. đọc Bearer token;
2. decode bằng `SECRET_KEY_DOCUMENT`;
3. kiểm tra `sub` và user WordPress;
4. kiểm tra role;
5. yêu cầu user meta `user_information` có cả `key` và `secret`;
6. gọi `wp_set_current_user()` và đưa user ID vào request.

Ngoài JWT, các thao tác file/order quan trọng còn kiểm tra capability `edit_shop_orders`. User chưa có `user_information.key` và `user_information.secret` sẽ thấy admin warning và không qua được middleware.

## 7. REST API của plugin

Namespace chung: `/wp-json/tinsinhphat/v1`. Route gốc `/documents` không được đăng ký; client phải gọi các route con bên dưới như `/documents/files` hoặc `/documents/stream/{slug}`.

Response thành công thường có dạng:

```json
{
  "status": {
    "code": 200,
    "message": "...",
    "data": {}
  }
}
```

| Method | Route | Auth | Mục đích |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Đăng nhập và nhận JWT |
| GET, POST | `/settings/company` | JWT + `manage_options` | Đọc/lưu option `company_setting` (admin only) |
| GET, POST | `/settings/system` | JWT + `manage_options` | Đọc/lưu option `tsp_system_setting`, tạo folder hoặc symlink |
| GET | `/settings/system/browse?path=` | JWT + `manage_options` | Duyệt thư mục server, chỉ trả về thư mục con; path tương đối được resolve trong `wp-content/uploads/` |
| GET, POST | `/settings/user` | JWT | Đọc/lưu user meta `user_information` |
| GET | `/template/deliveries/{slug}` | JWT | Đọc `templates/delivery/{slug}.min.html` |
| GET | `/template/quotations/{slug}` | JWT | Đọc `templates/quotation/{slug}.min.html` |
| GET | `/template/invoice/{slug}` | JWT | Đọc `templates/vatinvoice/{slug}.min.html` |
| GET | `/documents/files?page=&count=` | JWT + capability | Liệt kê file, phân trang |
| GET | `/documents/files/{slug}` | JWT | Lấy metadata của một file |
| GET | `/documents/stream/{slug}` | JWT + capability | Stream nội dung PDF đã xác thực |
| GET | `/documents/orders/{order_id}` | JWT + capability | Lấy ba tài liệu đã gán cho trang order detail |
| POST | `/documents/upload` | JWT; handler cần capability | Upload PDF |
| POST | `/documents/assign` | JWT; handler cần capability | Gán file cho nhiều order |
| DELETE | `/documents/assign` | JWT; handler cần capability | Gỡ file khỏi nhiều order |
| GET | `/documents/orders-without-doc?doc_type=` | JWT | Tìm tối đa 50 order chưa có loại tài liệu |
| DELETE | `/documents/files/{slug}/delete` | JWT | Xóa file vật lý; body cần `path` |

`doc_type` được map như sau:

| API type | Key trong meta `orders` | Meta key riêng |
| --- | --- | --- |
| `invoice` | `vatDocument` | `_assigned_doc_invoice` |
| `quotation` | `orderDocument` | `_assigned_doc_quotation` |
| `delivery` | `deliveryDocument` | `_assigned_doc_delivery` |

Ngoài API riêng, frontend gọi WooCommerce REST API:

- `/wp-json/wc/v3/orders`;
- `/wp-json/wc/v3/products`;
- `/wp-json/wc/v3/customers`;
- `/wp-json/wc/v3/taxes`.

Các filter PHP `rest_post_dispatch` làm biến đổi response WooCommerce để frontend nhận được cấu trúc phù hợp cho khách hàng, sản phẩm, variation và VAT.

## 8. Quản lý file và dữ liệu order

`DocumentModel` dùng folder Document được cấu hình trong option `tsp_system_setting`, đồng thời giữ fallback để đọc các file cũ:

- thư mục cấu hình mới: mặc định `wp-content/uploads/order_documents/`;
- thư mục legacy: `wp-content/uploads/myoptions/moreinfo/`.

Khi plugin khởi tạo, `SystemFolderManager` tạo các folder Document/Print theo cấu hình. Nếu Alias bật, input là thư mục nguồn tuyệt đối; plugin kiểm tra tồn tại, quyền đọc/ghi, thử ghi file tạm rồi tạo symlink dưới `wp-content/uploads/`. Option chỉ được cập nhật sau khi cả hai folder hợp lệ; lỗi sẽ không ghi database và các path mới tạo được rollback. Endpoint browse nhận cả đường dẫn tuyệt đối và đường dẫn tương đối; ví dụ `path=order_documents` được resolve thành `wp-content/uploads/order_documents`.

Danh sách file quét các thư mục Document cấu hình và legacy, chỉ lấy PDF, sắp xếp theo `filemtime` giảm dần trên toàn bộ danh sách trước khi phân trang. Danh sách không dùng transient để phản ánh ngay file mới. Upload và các thao tác xóa vẫn gọi `clearFileCache()` để tương thích với code cũ.

Upload chỉ whitelist phần mở rộng `pdf`, lưu file vào thư mục mới và trả về `relative_path`, URL, kích thước và extension.

Khi gán file, model cập nhật song song:

1. `_assigned_doc_{doc_type}` để phục vụ truy vấn/đánh dấu;
2. meta `orders` dạng mảng để `DocumentController` render link trên order list.

Các link trên order dùng `DocumentViewer::documentLink()` và có hai trạng thái:

- chưa có file: action `uploadDocument`;
- có file: action `previewDocument` và nút `deleteDocument`.

Frontend `DocumentController` dùng event delegation trên `#the-list`, mở modal drag-drop, cho phép chọn PDF, gán cho nhiều order và cập nhật UI tại chỗ. Preview lấy metadata trước, fetch nội dung PDF bằng JWT rồi nhúng Blob URL vì PDFObject không gửi được custom `Authorization` header.

## 9. Template và bộ soạn thảo

Các template hiện có:

- `templates/quotation/templateone.min.html`;
- `templates/quotation/templatetwo.min.html`;
- `templates/delivery/delivery.min.html`;
- `templates/vatinvoice/vatinvoice.min.html`.

Các controller admin tương ứng là `QuotationAdminController`, `DeliveryAdminController`, `InvoiceAdminController`. Mỗi controller tạo model dữ liệu, preset model/view, cho phép sửa customer/product, ẩn dòng khi in, tính tổng và xuất Excel ở phía client tùy module.

Trạng thái tạm của các module thường nằm ở các key localStorage như `cs_quotation`, `products_quotation`, `cs_delivery`, `products_delivery`, `cs_invoice`, `products_invoice`, `template_*`, `user_info` và `company_information`. Khi đổi dữ liệu giữa order/product và màn hình tài liệu, controller phát broadcast để module khác cập nhật.

## 10. Build, phát triển và đóng gói

### Cài dependency

```bash
composer install
npm install
```

`composer.json` yêu cầu `firebase/php-jwt` và khai báo PSR-4 `App\\` -> `core/`.

### Dev

```bash
npm run dev
```

Vite mặc định dùng port `5173`. Khi `WP_DEBUG` là true, PHP nạp module từ URL HTTPS hard-code `https://192.168.1.181:5173`; vì vậy máy WordPress phải truy cập được dev server này và certificate tương ứng phải tồn tại nếu dùng HTTPS.

### Production

```bash
npm run build
```

Vite tạo `dist/`, manifest và asset hash. PHP đọc `dist/.vite/manifest.json`, enqueue entry `src/main.js` cùng CSS trong manifest. Base production là `/wp-content/plugins/document/dist/`.

### Tạo ZIP plugin

```bash
npm run zip
```

Script `bundle.js` chạy production build, copy `core`, `dist`, `vendor`, `templates`, `plugin.php` vào thư mục tạm rồi tạo `document.zip`. Vì vậy package phát hành cần có `vendor/` trước khi đóng gói.

## 11. Kiểm tra trước khi deploy

- Xác nhận WooCommerce đang active và user có role/capability phù hợp.
- Định nghĩa `SECRET_KEY_DOCUMENT` ở runtime; không commit secret vào repo.
- Đảm bảo user có `user_information` JSON chứa `key` và `secret`.
- Chạy `composer install`, `npm run build`, kiểm tra `dist/.vite/manifest.json`.
- Kiểm tra quyền ghi của `wp-content/uploads/order_documents/`.
- Kiểm tra `templates/` có đủ slug mà các `*PresetModel` yêu cầu.
- Test login, settings, WooCommerce order/product API và thao tác upload/gán/xóa PDF trên staging.

## 12. Điểm cần kiểm tra thêm trong source hiện tại

Các mục dưới đây là quan sát từ code, cần xác nhận trước khi coi là hành vi production ổn định:

1. `JwtController::createJWTToken()` trả về biến `$type`, nhưng biến này không được khởi tạo trong hàm. Token vẫn được tạo trước phần return, nhưng field `type` có thể phát sinh notice/giá trị không xác định.
2. Route xóa file nhận `{slug}` trên URL nhưng handler đọc `path` từ request body. Frontend hiện gửi cả hai giá trị; client khác phải giữ đúng quy ước này.
3. `DocumentModel` quét mọi file trong hai thư mục legacy/new, trong khi upload mới chỉ cho PDF. Nếu thư mục legacy có định dạng khác, API vẫn trả metadata của định dạng đó.
4. `getOrdersWithoutDoc()` giới hạn 50 order gần nhất và không tự kiểm tra capability trong handler; quyền hiện chủ yếu đến từ JWT middleware.
5. `LoadScriptController::importScript()` quyết định URL dev/production theo `WP_DEBUG`; source hiện không cho thấy cơ chế cấu hình riêng cho host Vite ngoài code hard-code.
6. Không tìm thấy test runner hoặc test suite đang được khai báo trong `package.json`/`composer.json`; việc kiểm chứng hiện nên bắt đầu bằng lint/build và test thủ công trên staging.

## 13. Điểm vào khi bảo trì

| Nhu cầu | File nên đọc trước |
| --- | --- |
| Thay đổi bootstrap/service | `core/App.php`, `core/Support/ServiceContainer.php` |
| Thêm REST route | `core/Api/LoadingApi.php` và API class tương ứng |
| Thay đổi auth/quyền | `core/Middlewares/JwtAuthenticate.php`, `core/Support/AuthSupport.php` |
| Thay đổi upload/gán tài liệu | `core/Api/Documents/DocumentApi.php`, `core/Controllers/Documents/DocumentController.php`, `core/Models/Documents/DocumentModel.php` |
| Thay đổi link tài liệu trên order | `core/Views/Documents/DocumentViewer.php` và `src/assets/scripts/Controllers/Documents/documentController.js` |
| Thay đổi trang quotation/delivery/invoice | controller/model/view tương ứng trong `src/assets/scripts/Controllers/Admin/` |
| Thay đổi route frontend | `src/assets/scripts/app.min.js`, `Admin/adminLoadController.js`, `WooCommerce/wooCommerceController.js` |
| Thay đổi asset build | `vite.config.js`, `src/main.js`, `bundle.js` |
