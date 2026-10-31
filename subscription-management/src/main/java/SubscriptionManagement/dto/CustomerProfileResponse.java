package SubscriptionManagement.dto;

import SubscriptionManagement.entity.CustomerProfile;
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
public class CustomerProfileResponse {

    private Long id;
    private String email;
    private String name;
    private String phone;
    private String address;
    private LocalDateTime updatedAt;

    public static CustomerProfileResponse fromEntity(User user, CustomerProfile profile) {
        if (user == null) {
            return null;
        }

        String email = user.getEmail();
        String fallbackName = email != null && email.contains("@")
                ? email.substring(0, email.indexOf('@'))
                : email;

        String name = (profile != null && profile.getName() != null && !profile.getName().isBlank())
                ? profile.getName()
                : fallbackName;

        String phone = (profile != null) ? profile.getPhone() : null;
        String address = (profile != null) ? profile.getAddress() : null;
        LocalDateTime updatedAt = (profile != null) ? profile.getUpdatedAt() : null;

        return CustomerProfileResponse.builder()
                .id(user.getId())
                .email(email)
                .name(name)
                .phone(phone)
                .address(address)
                .updatedAt(updatedAt)
                .build();
    }
}

