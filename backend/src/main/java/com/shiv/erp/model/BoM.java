package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "boms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoM {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "product_id", length = 50, nullable = false)
    private String productId;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "bom_id")
    private List<BomComponent> components;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "bom_id")
    private List<BomOperation> operations;
}
