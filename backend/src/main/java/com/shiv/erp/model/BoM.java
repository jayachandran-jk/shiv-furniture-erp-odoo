package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bill_of_materials")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoM {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "bom_reference", unique = true, nullable = false, length = 20)
    private String bomReference;

    @Column(name = "finished_product_id", length = 50, nullable = false)
    private String productId; // Keep productId for backwards compatibility

    @Column(name = "qty_produced", nullable = false)
    @Builder.Default
    private Double qtyProduced = 1.0;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "bom_id")
    private List<BomComponent> components;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "bom_id")
    private List<BomOperation> operations;
}
