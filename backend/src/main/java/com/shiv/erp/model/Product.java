package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, unique = true, length = 100)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cost_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String strategy; // MTS, MTO

    @Column(name = "procurement_type", nullable = false, length = 50)
    private String procurementType; // Purchase, Manufacturing

    @Column(name = "preferred_vendor_id", length = 50)
    private String preferredVendorId;

    @Column(name = "bom_id", length = 50)
    private String bomId;

    @Column(name = "reorder_threshold")
    @Builder.Default
    private Integer reorderThreshold = 0;

    @Column(name = "on_hand_qty")
    @Builder.Default
    private Integer onHandQty = 0;

    @Column(name = "reserved_qty")
    @Builder.Default
    private Integer reservedQty = 0;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private java.time.LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @Transient
    private java.util.List<BomComponent> components;
}
