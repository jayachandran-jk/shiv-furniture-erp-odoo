package com.shiv.erp.controller;

import com.shiv.erp.model.WorkCenter;
import com.shiv.erp.repository.WorkCenterRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-centers")
public class WorkCenterController {

    private final WorkCenterRepository workCenterRepository;

    public WorkCenterController(WorkCenterRepository workCenterRepository) {
        this.workCenterRepository = workCenterRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','OWNER','MANUFACTURING')")
    public ResponseEntity<List<WorkCenter>> getWorkCenters() {
        return ResponseEntity.ok(workCenterRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATIONS','MANUFACTURING')")
    public ResponseEntity<WorkCenter> createWorkCenter(@RequestBody WorkCenter workCenter) {
        if (workCenter.getName() == null || workCenter.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work Center name is required");
        }

        if (workCenterRepository.findAll().stream().anyMatch(wc -> wc.getName().equalsIgnoreCase(workCenter.getName().trim()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Work Center with this name already exists");
        }

        if (workCenter.getId() == null || workCenter.getId().isEmpty()) {
            workCenter.setId("wc-" + UUID.randomUUID().toString().substring(0, 8));
        }

        WorkCenter saved = workCenterRepository.save(workCenter);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
