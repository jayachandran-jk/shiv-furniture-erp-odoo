package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String name;

    private String contact;

    @Column(columnDefinition = "TEXT")
    private String address;
}
