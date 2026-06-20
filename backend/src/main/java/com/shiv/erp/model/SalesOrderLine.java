package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "sales_order_lines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesOrderLine {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "sales_order_id", length = 50)
    private String salesOrderId;

    @Column(name = "product_id", length = 50, nullable = false)
    private String productId;

    @Column(nullable = false)
    private Integer qty;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "reserved_qty")
    @Builder.Default
    private Integer reservedQty = 0;

    @Column(name = "delivered_qty")
    @Builder.Default
    private Integer deliveredQty = 0;
}
