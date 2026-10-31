package SubscriptionManagement.service;

import SubscriptionManagement.dto.CustomerProfileRequest;
import SubscriptionManagement.dto.CustomerProfileResponse;

import java.util.List;

public interface CustomerPortalService {

    CustomerProfileResponse getProfile(String email);

    CustomerProfileResponse updateProfile(String email, CustomerProfileRequest request);

    List<Object> getSubscriptions(String email);

    List<Object> getInvoices(String email);
}

