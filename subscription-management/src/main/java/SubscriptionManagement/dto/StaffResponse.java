package SubscriptionManagement.dto;

import SubscriptionManagement.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {

    private Long id;
    private String email;
    private String role;
    private Boolean enabled;
    private LocalDateTime createdAt;

    public static StaffResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return StaffResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

