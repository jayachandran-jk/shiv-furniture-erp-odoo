package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_lines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderLine {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "purchase_order_id", length = 50)
    private String purchaseOrderId;

    @Column(name = "product_id", length = 50, nullable = false)
    private String productId;

    @Column(nullable = false)
    private Integer qty;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "received_qty")
    @Builder.Default
    private Integer receivedQty = 0;
}
