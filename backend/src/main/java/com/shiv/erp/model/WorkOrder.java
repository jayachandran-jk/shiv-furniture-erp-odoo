package com.shiv.erp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "work_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkOrder {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "mo_id", length = 50)
    private String moId;

    @Column(nullable = false)
    private String name;

    @Column(name = "work_center_id", length = 50)
    private String workCenterId;

    @Column(nullable = false, length = 50)
    private String status; // Pending, Started, Paused, Completed

    @Column(name = "expected_duration_minutes", nullable = false)
    private Integer expectedDurationMinutes;

    @Column(name = "actual_duration_minutes")
    @Builder.Default
    private Integer actualDurationMinutes = 0;

    @Column(name = "operator_id", length = 36)
    private String operatorId;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "paused_at")
    private LocalDateTime pausedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
