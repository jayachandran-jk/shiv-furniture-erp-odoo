package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bom_operations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BomOperation {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "bom_id", length = 50)
    private String bomId;

    @Column(nullable = false)
    private Integer sequence;

    @Column(name = "operation_name", nullable = false, length = 100)
    private String name; // Map name field to operation_name column for compatibility

    @Column(name = "work_center_id", length = 50)
    private String workCenterId;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(length = 255)
    private String notes;
}
