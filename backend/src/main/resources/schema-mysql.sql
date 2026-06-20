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
    contact VARCHAR(255),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    address TEXT
);

CREATE TABLE IF NOT EXISTS work_centers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    capacity_per_day INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS bill_of_materials (
    id VARCHAR(50) PRIMARY KEY,
    bom_reference VARCHAR(20) UNIQUE NOT NULL,
    finished_product_id VARCHAR(50) NOT NULL,
    qty_produced DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (finished_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bom_components (
    id VARCHAR(50) PRIMARY KEY,
    bom_id VARCHAR(50) NOT NULL,
    component_product_id VARCHAR(50) NOT NULL,
    qty_required DECIMAL(10,4) NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pcs',
    notes VARCHAR(255),
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bom_operations (
    id VARCHAR(50) PRIMARY KEY,
    bom_id VARCHAR(50) NOT NULL,
    sequence INT NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    work_center_id VARCHAR(50),
    duration_minutes INT NOT NULL,
    notes VARCHAR(255),
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
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
    expected_delivery_date TIMESTAMP NULL,
    notes TEXT,
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

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(255) NOT NULL,
    entity_type VARCHAR(40),
    entity_id VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS automation_events (
    id VARCHAR(50) PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_type VARCHAR(50),
    trigger_entity_id VARCHAR(50),
    product_id VARCHAR(50),
    product_sku VARCHAR(100),
    available_qty INT,
    required_qty INT,
    shortage_qty INT,
    action_taken VARCHAR(50),
    generated_doc_id VARCHAR(50),
    generated_doc_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    notes TEXT,
    parent_event_id VARCHAR(50),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

