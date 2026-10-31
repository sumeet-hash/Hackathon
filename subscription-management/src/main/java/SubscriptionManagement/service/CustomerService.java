package SubscriptionManagement.service;

import SubscriptionManagement.dto.CreateCustomerRequest;
import SubscriptionManagement.dto.CustomerResponse;
import SubscriptionManagement.dto.CustomerStatusUpdateRequest;
import SubscriptionManagement.dto.UpdateCustomerRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CustomerService {

    CustomerResponse createCustomer(CreateCustomerRequest request);

    Page<CustomerResponse> getCustomers(String search, String name, String email, Pageable pageable);

    CustomerResponse getCustomerById(Long id);

    CustomerResponse updateCustomer(Long id, UpdateCustomerRequest request);

    CustomerResponse updateCustomerStatus(Long id, CustomerStatusUpdateRequest request);
}

