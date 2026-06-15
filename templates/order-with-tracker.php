<?php
/**
 * Ví dụ sử dụng Order Link Tracker
 * Đặt trong template hiển thị đơn hàng
 */
?>

<div class="order-container" data-order-id="<?php echo esc_attr($order->get_id()); ?>">
    <!-- Order Details -->
    <div class="order-details">
        <h2>Order #<?php echo $order->get_id(); ?></h2>
        
        <!-- Order Items -->
        <table class="order-items">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($order->get_items() as $item) : ?>
                    <tr>
                        <td><?php echo esc_html($item->get_name()); ?></td>
                        <td><?php echo esc_html($item->get_quantity()); ?></td>
                        <td><?php echo wp_kses_post($item->get_total()); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <!-- Order Status & Actions -->
        <div class="order-actions">
            <p><strong>Status:</strong> <?php echo esc_html($order->get_status()); ?></p>
            
            <!-- Links để tracking -->
            <div class="order-links">
                <h3>Quick Links</h3>
                <ul>
                    <li>
                        <a href="<?php echo esc_url($order->get_view_order_url()); ?>" 
                           class="btn btn-primary" 
                           id="view-order-link">
                            View Order Details
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url($order->get_checkout_payment_url()); ?>" 
                           class="btn btn-secondary"
                           id="payment-link">
                            Make Payment
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(wc_get_account_endpoint_url('downloads')); ?>" 
                           class="btn btn-info"
                           id="download-link">
                            Download Files
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(wc_get_account_endpoint_url('orders')); ?>" 
                           class="btn btn-default"
                           id="back-to-orders">
                            Back to Orders
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<style>
.order-container {
    max-width: 800px;
    margin: 20px 0;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.order-details h2 {
    margin-bottom: 20px;
}

.order-items {
    width: 100%;
    margin-bottom: 20px;
    border-collapse: collapse;
}

.order-items th,
.order-items td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.order-items th {
    background-color: #f9f9f9;
    font-weight: bold;
}

.order-links ul {
    list-style: none;
    padding: 0;
}

.order-links li {
    margin: 10px 0;
}

.order-links a {
    display: inline-block;
    padding: 10px 20px;
    margin-right: 10px;
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.btn-primary {
    background-color: #007bff;
    color: white;
}

.btn-primary:hover {
    background-color: #0056b3;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn-secondary:hover {
    background-color: #545b62;
}

.btn-info {
    background-color: #17a2b8;
    color: white;
}

.btn-info:hover {
    background-color: #117a8b;
}

.btn-default {
    background-color: #e9ecef;
    color: #333;
    border: 1px solid #ddd;
}

.btn-default:hover {
    background-color: #dee2e6;
}
</style>
