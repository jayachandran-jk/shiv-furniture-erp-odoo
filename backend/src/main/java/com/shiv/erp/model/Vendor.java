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

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();
}
