package com.shiv.erp.controller;

import com.shiv.erp.model.Bottleneck;
import com.shiv.erp.service.BottleneckService;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bottlenecks")
public class BottleneckController {

    private final BottleneckService bottleneckService;

    public BottleneckController(BottleneckService bottleneckService) {
        this.bottleneckService = bottleneckService;
    }

    @GetMapping
    public ResponseEntity<?> getActiveBottlenecks() {
        List<Bottleneck> active = bottleneckService.getActiveBottlenecks();
        return ResponseEntity.ok(active);
    }

    @GetMapping("/dismissed")
    public ResponseEntity<?> getDismissedBottlenecks() {
        List<Bottleneck> dismissed = bottleneckService.getDismissedBottlenecks();
        return ResponseEntity.ok(dismissed);
    }

    @PostMapping("/{id}/dismiss")
    public ResponseEntity<?> dismissBottleneck(@PathVariable String id) {
        try {
            String username = SecurityUtils.getCurrentUserId();
            if (username == null || username.isEmpty()) {
                username = "admin";
            }
            Bottleneck dismissed = bottleneckService.dismissBottleneck(id, username);
            return ResponseEntity.ok(dismissed);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/scan")
    public ResponseEntity<?> forceScan() {
        bottleneckService.scanBottlenecks();
        return ResponseEntity.ok(Map.of("message", "Scan completed successfully"));
    }
}
