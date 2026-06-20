-- Create tables for Shiv Furniture Works Mini ERP in MySQL

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    address TEXT
);

CREATE TABLE IF NOT EXISTS work_centers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    sale_price DECIMAL(10, 2) DEFAULT 0.00,
    strategy VARCHAR(20) NOT NULL,
    procurement_type VARCHAR(50) NOT NULL,
    preferred_vendor_id VARCHAR(50),
    bom_id VARCHAR(50),
    reorder_threshold INT DEFAULT 0,
    on_hand_qty INT DEFAULT 0,
    reserved_qty INT DEFAULT 0,
    FOREIGN KEY (preferred_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS boms (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bom_components (
    bom_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    PRIMARY KEY (bom_id, product_id),
    FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bom_operations (
    id VARCHAR(50) PRIMARY KEY,
    bom_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    work_center_id VARCHAR(50),
    duration_minutes INT NOT NULL,
    FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(100) NOT NULL UNIQUE,
    customer_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_by VARCHAR(36),
    salesperson_id VARCHAR(36),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id VARCHAR(50) PRIMARY KEY,
    sales_order_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    reserved_qty INT DEFAULT 0,
    delivered_qty INT DEFAULT 0,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(100) NOT NULL UNIQUE,
    vendor_id VARCHAR(50) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    created_by VARCHAR(36),
    is_auto_generated BOOLEAN DEFAULT FALSE,
    triggering_sales_order_id VARCHAR(50),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (triggering_sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id VARCHAR(50) PRIMARY KEY,
    purchase_order_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    received_qty INT DEFAULT 0,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manufacturing_orders (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(100) NOT NULL UNIQUE,
    product_id VARCHAR(50) NOT NULL,
    qty INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    assignee_id VARCHAR(36),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_auto_generated BOOLEAN DEFAULT FALSE,
    triggering_sales_order_id VARCHAR(50),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (triggering_sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mo_components (
    mo_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    required_qty INT NOT NULL,
    to_consume_qty INT NOT NULL,
    consumed_qty INT DEFAULT 0,
    PRIMARY KEY (mo_id, product_id),
    FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(50) PRIMARY KEY,
    mo_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    work_center_id VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    expected_duration_minutes INT NOT NULL,
    actual_duration_minutes INT DEFAULT 0,
    operator_id VARCHAR(36),
    started_at TIMESTAMP NULL DEFAULT NULL,
    paused_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (mo_id) REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (work_center_id) REFERENCES work_centers(id) ON DELETE SET NULL,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id VARCHAR(50) PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    on_hand_after INT NOT NULL,
    reserved_after INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(50),
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(36),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_value JSON,
    new_value JSON,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
