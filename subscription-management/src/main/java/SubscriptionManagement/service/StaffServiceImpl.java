package SubscriptionManagement.service;

import SubscriptionManagement.dto.CreateStaffRequest;
import SubscriptionManagement.dto.StaffResponse;
import SubscriptionManagement.dto.StaffStatusUpdateRequest;
import SubscriptionManagement.dto.UpdateStaffRequest;
import SubscriptionManagement.entity.Role;
import SubscriptionManagement.entity.User;
import SubscriptionManagement.exception.EmailAlreadyExistsException;
import SubscriptionManagement.exception.ResourceNotFoundException;
import SubscriptionManagement.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffServiceImpl implements StaffService {

    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public StaffResponse createStaff(CreateStaffRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (staffRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Staff with email '" + normalizedEmail + "' already exists");
        }

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.INTERNAL.name());
        user.setEnabled(true);

        User savedUser = staffRepository.save(user);
        return StaffResponse.fromEntity(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffResponse> getAllStaff(Pageable pageable) {
        return staffRepository.findByRole(Role.INTERNAL.name(), pageable)
                .map(StaffResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        User user = staffRepository.findByIdAndRole(id, Role.INTERNAL.name())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        return StaffResponse.fromEntity(user);
    }

    @Override
    public StaffResponse updateStaff(Long id, UpdateStaffRequest request) {
        User user = staffRepository.findByIdAndRole(id, Role.INTERNAL.name())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            if (staffRepository.existsByEmailAndIdNot(normalizedEmail, id)) {
                throw new EmailAlreadyExistsException("Staff with email '" + normalizedEmail + "' already exists");
            }
            user.setEmail(normalizedEmail);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = staffRepository.save(user);
        return StaffResponse.fromEntity(updatedUser);
    }

    @Override
    public StaffResponse updateStaffStatus(Long id, StaffStatusUpdateRequest request) {
        User user = staffRepository.findByIdAndRole(id, Role.INTERNAL.name())
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with ID: " + id));

        user.setEnabled(request.getEnabled());
        User updatedUser = staffRepository.save(user);
        return StaffResponse.fromEntity(updatedUser);
    }
}

