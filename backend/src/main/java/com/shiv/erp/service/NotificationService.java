package com.shiv.erp.service;

import com.shiv.erp.model.Notification;
import com.shiv.erp.model.User;
import com.shiv.erp.repository.NotificationRepository;
import com.shiv.erp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void createNotification(String userId, String title, String message, String entityType, String entityId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .entityType(entityType)
                .entityId(entityId)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyUserOrRoles(String specificUserId, List<String> targetRoles, String title, String message, String entityType, String entityId) {
        if (specificUserId != null && !specificUserId.isEmpty()) {
            createNotification(specificUserId, title, message, entityType, entityId);
        }

        if (targetRoles != null && !targetRoles.isEmpty()) {
            for (String role : targetRoles) {
                List<User> users = userRepository.findByRole(role);
                for (User u : users) {
                    if (u.getId().equals(specificUserId)) {
                        continue;
                    }
                    createNotification(u.getId(), title, message, entityType, entityId);
                }
            }
        }
    }

    @Transactional
    public void notifyRole(String role, String title, String message, String entityType, String entityId) {
        List<String> targetRoles;
        if ("OPERATIONS".equalsIgnoreCase(role)) {
            targetRoles = List.of("purchase", "admin");
        } else {
            targetRoles = List.of(role.toLowerCase());
        }
        notifyUserOrRoles(null, targetRoles, title, message, entityType, entityId);
    }
}
