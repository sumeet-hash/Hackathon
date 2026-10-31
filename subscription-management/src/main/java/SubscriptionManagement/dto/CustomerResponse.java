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
public class CustomerResponse {

    private Long id;
    private String email;
    private String name;
    private String role;
    private Boolean enabled;
    private LocalDateTime createdAt;

    public static CustomerResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }

        String derivedName = user.getEmail() != null && user.getEmail().contains("@")
                ? user.getEmail().substring(0, user.getEmail().indexOf('@'))
                : user.getEmail();

        return CustomerResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(derivedName)
                .role(user.getRole())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }
}

