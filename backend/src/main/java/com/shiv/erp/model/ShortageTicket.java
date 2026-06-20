package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shortage_tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShortageTicket {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "mo_id", length = 50, nullable = false)
    private String moId;

    @Column(name = "product_id", length = 50, nullable = false)
    private String productId;

    @Column(name = "shortage_qty", nullable = false)
    private Integer shortageQty;

    @Column(name = "po_id", length = 50)
    private String poId;

    @Column(name = "po_number", length = 100)
    private String poNumber;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN"; // OPEN, RESOLVED

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
