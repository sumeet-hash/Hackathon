package SubscriptionManagement.service;

import SubscriptionManagement.dto.CustomerProfileRequest;
import SubscriptionManagement.dto.CustomerProfileResponse;
import SubscriptionManagement.entity.CustomerProfile;
import SubscriptionManagement.entity.Role;
import SubscriptionManagement.entity.User;
import SubscriptionManagement.exception.ResourceNotFoundException;
import SubscriptionManagement.repository.CustomerProfileRepository;
import SubscriptionManagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerPortalServiceImpl implements CustomerPortalService {

    private final UserRepository userRepository;
    private final CustomerProfileRepository customerProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(String email) {
        User user = getAuthenticatedCustomer(email);
        CustomerProfile profile = customerProfileRepository.findByUser(user).orElse(null);
        return CustomerProfileResponse.fromEntity(user, profile);
    }

    @Override
    public CustomerProfileResponse updateProfile(String email, CustomerProfileRequest request) {
        User user = getAuthenticatedCustomer(email);

        CustomerProfile profile = customerProfileRepository.findByUser(user)
                .orElseGet(() -> CustomerProfile.builder()
                        .user(user)
                        .build());

        if (request.getName() != null) {
            profile.setName(request.getName().trim());
        }
        if (request.getPhone() != null) {
            profile.setPhone(request.getPhone().trim());
        }
        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress().trim());
        }
        profile.setUpdatedAt(LocalDateTime.now());

        CustomerProfile savedProfile = customerProfileRepository.save(profile);
        return CustomerProfileResponse.fromEntity(user, savedProfile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object> getSubscriptions(String email) {
        // Validate customer identity
        getAuthenticatedCustomer(email);
        // Placeholder for Module 5 integration
        return Collections.emptyList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object> getInvoices(String email) {
        // Validate customer identity
        getAuthenticatedCustomer(email);
        // Placeholder for Module 5 integration
        return Collections.emptyList();
    }

    private User getAuthenticatedCustomer(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Customer account not found for: " + email));

        if (!Role.CUSTOMER.name().equalsIgnoreCase(user.getRole())) {
            throw new AccessDeniedException("Access restricted to CUSTOMER role only");
        }

        return user;
    }
}

