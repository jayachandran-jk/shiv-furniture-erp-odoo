package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bom_components")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BomComponent {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "bom_id", length = 50)
    private String bomId;

    @Column(name = "component_product_id", length = 50, nullable = false)
    private String productId; // Maps to component_product_id for component product ID

    @Column(name = "qty_required", nullable = false)
    private Double qty; // Maps to qty_required, using Double to support decimal values

    @Column(name = "unit_of_measure", length = 20)
    @Builder.Default
    private String unitOfMeasure = "pcs";

    @Column(length = 255)
    private String notes;
}
