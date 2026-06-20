package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "work_centers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkCenter {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false)
    private String name;
}
