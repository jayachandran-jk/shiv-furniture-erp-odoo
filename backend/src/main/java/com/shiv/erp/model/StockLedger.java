package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_ledger")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockLedger {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "ts")
    private LocalDateTime ts;

    @PrePersist
    protected void onCreate() {
        if (this.ts == null) {
            this.ts = LocalDateTime.now();
        }
    }

    @Column(name = "product_id", length = 50, nullable = false)
    private String productId;

    @Column(name = "movement_type", nullable = false, length = 100)
    private String movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "on_hand_after", nullable = false)
    private Integer onHandAfter;

    @Column(name = "reserved_after", nullable = false)
    private Integer reservedAfter;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id", length = 50)
    private String referenceId;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
