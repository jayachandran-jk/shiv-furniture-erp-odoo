package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bom_components")
@IdClass(BomComponentId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BomComponent {
    @Id
    @Column(name = "bom_id", length = 50)
    private String bomId;

    @Id
    @Column(name = "product_id", length = 50)
    private String productId;

    @Column(nullable = false)
    private Integer qty;
}
