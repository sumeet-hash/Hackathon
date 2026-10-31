
package SubscriptionManagement.dto;

import java.time.LocalDateTime;

public class UserResponse {

    private Long id;
    private String email;
    private String role;
    private Boolean enabled;
    private LocalDateTime createdAt;

    public UserResponse(Long id, String email, String role,
                        Boolean enabled, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.enabled = enabled;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
