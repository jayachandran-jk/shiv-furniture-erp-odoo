package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "mo_components")
@IdClass(MoComponentId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoComponent {
    @Id
    @Column(name = "mo_id", length = 50)
    private String moId;

    @Id
    @Column(name = "product_id", length = 50)
    private String productId;

    @Column(name = "required_qty", nullable = false)
    private Integer requiredQty;

    @Column(name = "to_consume_qty", nullable = false)
    private Integer toConsumeQty;

    @Column(name = "consumed_qty")
    @Builder.Default
    private Integer consumedQty = 0;
}
