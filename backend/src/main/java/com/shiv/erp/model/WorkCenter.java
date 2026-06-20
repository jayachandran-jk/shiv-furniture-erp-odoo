package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    @Column(nullable = false, unique = true, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "capacity_per_day")
    @Builder.Default
    private Integer capacityPerDay = 8;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
