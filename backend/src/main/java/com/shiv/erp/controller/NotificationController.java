package com.shiv.erp.controller;

import com.shiv.erp.model.Notification;
import com.shiv.erp.repository.NotificationRepository;
import com.shiv.erp.utils.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications() {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        String userId = SecurityUtils.getCurrentUserId();
        Notification n = notificationRepository.findById(id).orElse(null);
        if (n != null && n.getUserId().equals(userId)) {
            n.setIsRead(true);
            notificationRepository.save(n);
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        String userId = SecurityUtils.getCurrentUserId();
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Notification n : unread) {
            if (!n.getIsRead()) {
                n.setIsRead(true);
            }
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok().build();
    }
}
