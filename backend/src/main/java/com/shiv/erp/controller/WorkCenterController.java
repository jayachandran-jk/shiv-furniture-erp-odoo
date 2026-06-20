package com.shiv.erp.controller;

import com.shiv.erp.model.WorkCenter;
import com.shiv.erp.repository.WorkCenterRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/work-centers")
public class WorkCenterController {

    private final WorkCenterRepository workCenterRepository;

    public WorkCenterController(WorkCenterRepository workCenterRepository) {
        this.workCenterRepository = workCenterRepository;
    }

    @GetMapping
    public ResponseEntity<List<WorkCenter>> getWorkCenters() {
        return ResponseEntity.ok(workCenterRepository.findAll());
    }
}
