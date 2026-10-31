package SubscriptionManagement.service;

import SubscriptionManagement.dto.CreateCustomerRequest;
import SubscriptionManagement.dto.CustomerResponse;
import SubscriptionManagement.dto.CustomerStatusUpdateRequest;
import SubscriptionManagement.dto.UpdateCustomerRequest;
import SubscriptionManagement.entity.Role;
import SubscriptionManagement.entity.User;
import SubscriptionManagement.exception.EmailAlreadyExistsException;
import SubscriptionManagement.exception.ResourceNotFoundException;
import SubscriptionManagement.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public CustomerResponse createCustomer(CreateCustomerRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (customerRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Customer with email '" + normalizedEmail + "' already exists");
        }

        String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword()
                : "Customer@" + UUID.randomUUID().toString().substring(0, 8);

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(Role.CUSTOMER.name());
        user.setEnabled(true);

        User savedUser = customerRepository.save(user);
        return CustomerResponse.fromEntity(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(String search, String name, String email, Pageable pageable) {
        String filter = null;
        if (search != null && !search.isBlank()) {
            filter = search.trim();
        } else if (email != null && !email.isBlank()) {
            filter = email.trim();
        } else if (name != null && !name.isBlank()) {
            filter = name.trim();
        }

        return customerRepository.searchCustomers(Role.CUSTOMER.name(), filter, pageable)
                .map(CustomerResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        User user = customerRepository.findByIdAndRole(id, Role.CUSTOMER.name())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));

        return CustomerResponse.fromEntity(user);
    }

    @Override
    public CustomerResponse updateCustomer(Long id, UpdateCustomerRequest request) {
        User user = customerRepository.findByIdAndRole(id, Role.CUSTOMER.name())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (!user.getEmail().equalsIgnoreCase(normalizedEmail)) {
            if (customerRepository.existsByEmailAndIdNot(normalizedEmail, id)) {
                throw new EmailAlreadyExistsException("Customer with email '" + normalizedEmail + "' already exists");
            }
            user.setEmail(normalizedEmail);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = customerRepository.save(user);
        return CustomerResponse.fromEntity(updatedUser);
    }

    @Override
    public CustomerResponse updateCustomerStatus(Long id, CustomerStatusUpdateRequest request) {
        User user = customerRepository.findByIdAndRole(id, Role.CUSTOMER.name())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));

        user.setEnabled(request.getEnabled());
        User updatedUser = customerRepository.save(user);
        return CustomerResponse.fromEntity(updatedUser);
    }
}

