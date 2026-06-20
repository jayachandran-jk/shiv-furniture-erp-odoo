package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vendors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String name;

    private String contact;
}
