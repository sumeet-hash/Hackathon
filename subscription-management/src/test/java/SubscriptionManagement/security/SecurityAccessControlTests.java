package SubscriptionManagement.security;

import SubscriptionManagement.config.CustomAccessDeniedHandler;
import SubscriptionManagement.config.CustomAuthenticationEntryPoint;
import SubscriptionManagement.config.SecurityConfig;
import SubscriptionManagement.controller.*;
import SubscriptionManagement.dto.CustomerProfileResponse;
import SubscriptionManagement.dto.SystemConfigResponse;
import SubscriptionManagement.service.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {
        StaffController.class,
        SystemConfigController.class,
        CustomerController.class,
        CustomerPortalController.class,
        UserController.class
})
@Import({
        SecurityConfig.class,
        CustomAuthenticationEntryPoint.class,
        CustomAccessDeniedHandler.class
})
class SecurityAccessControlTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StaffService staffService;

    @MockBean
    private SystemConfigService systemConfigService;

    @MockBean
    private CustomerService customerService;

    @MockBean
    private CustomerPortalService customerPortalService;

    @MockBean
    private UserService userService;

    // ==========================================
    // 1. /api/admin/** Access Tests
    // ==========================================
    @Nested
    @DisplayName("/api/admin/** Access Control")
    class AdminRoutesSecurityTests {

        @Test
        @DisplayName("ADMIN role CAN access /api/admin/staff")
        @WithMockUser(username = "admin@brightloop.com", roles = {"ADMIN"})
        void adminCanAccessStaffEndpoint() throws Exception {
            when(staffService.getAllStaff(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(Collections.emptyList()));

            mockMvc.perform(get("/api/admin/staff"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN role CAN access /api/admin/config")
        @WithMockUser(username = "admin@brightloop.com", roles = {"ADMIN"})
        void adminCanAccessConfigEndpoint() throws Exception {
            when(systemConfigService.getConfig()).thenReturn(
                    SystemConfigResponse.builder()
                            .companyName("Brightloop")
                            .defaultCurrency("USD")
                            .taxRate(new BigDecimal("10.0"))
                            .invoicePrefix("INV-")
                            .allSettings(Collections.emptyMap())
                            .lastUpdated(LocalDateTime.now())
                            .build()
            );

            mockMvc.perform(get("/api/admin/config"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("INTERNAL role CANNOT access /api/admin/staff (returns 403 JSON)")
        @WithMockUser(username = "staff@brightloop.com", roles = {"INTERNAL"})
        void internalCannotAccessAdminStaff() throws Exception {
            mockMvc.perform(get("/api/admin/staff"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.path").value("/api/admin/staff"))
                    .andExpect(jsonPath("$.message").exists());
        }

        @Test
        @DisplayName("CUSTOMER role CANNOT access /api/admin/staff (returns 403 JSON)")
        @WithMockUser(username = "customer@example.com", roles = {"CUSTOMER"})
        void customerCannotAccessAdminStaff() throws Exception {
            mockMvc.perform(get("/api/admin/staff"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        @Test
        @DisplayName("Unauthenticated request to /api/admin/staff returns 401 JSON")
        void unauthenticatedCannotAccessAdminStaff() throws Exception {
            mockMvc.perform(get("/api/admin/staff"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.error").value("Unauthorized"))
                    .andExpect(jsonPath("$.path").value("/api/admin/staff"))
                    .andExpect(jsonPath("$.message").exists());
        }
    }

    // ==========================================
    // 2. /api/staff/** Access Tests
    // ==========================================
    @Nested
    @DisplayName("/api/staff/** Access Control")
    class StaffRoutesSecurityTests {

        @Test
        @DisplayName("INTERNAL role CAN access /api/staff/customers")
        @WithMockUser(username = "staff@brightloop.com", roles = {"INTERNAL"})
        void internalCanAccessCustomerManagement() throws Exception {
            when(customerService.getCustomers(any(), any(), any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(Collections.emptyList()));

            mockMvc.perform(get("/api/staff/customers"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN role CAN access /api/staff/customers")
        @WithMockUser(username = "admin@brightloop.com", roles = {"ADMIN"})
        void adminCanAccessCustomerManagement() throws Exception {
            when(customerService.getCustomers(any(), any(), any(), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(Collections.emptyList()));

            mockMvc.perform(get("/api/staff/customers"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CUSTOMER role CANNOT access /api/staff/customers (returns 403 JSON)")
        @WithMockUser(username = "customer@example.com", roles = {"CUSTOMER"})
        void customerCannotAccessStaffCustomers() throws Exception {
            mockMvc.perform(get("/api/staff/customers"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.path").value("/api/staff/customers"));
        }

        @Test
        @DisplayName("Unauthenticated request to /api/staff/customers returns 401 JSON")
        void unauthenticatedCannotAccessStaffCustomers() throws Exception {
            mockMvc.perform(get("/api/staff/customers"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.error").value("Unauthorized"))
                    .andExpect(jsonPath("$.path").value("/api/staff/customers"));
        }
    }

    // ==========================================
    // 3. /api/customer/** Access Tests
    // ==========================================
    @Nested
    @DisplayName("/api/customer/** Access Control")
    class CustomerRoutesSecurityTests {

        @Test
        @DisplayName("CUSTOMER role CAN access /api/customer/me")
        @WithMockUser(username = "customer@example.com", roles = {"CUSTOMER"})
        void customerCanAccessCustomerMe() throws Exception {
            when(customerPortalService.getProfile("customer@example.com"))
                    .thenReturn(CustomerProfileResponse.builder()
                            .id(1L)
                            .email("customer@example.com")
                            .name("Customer Name")
                            .build());

            mockMvc.perform(get("/api/customer/me"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CUSTOMER role CAN access /api/customer/subscriptions")
        @WithMockUser(username = "customer@example.com", roles = {"CUSTOMER"})
        void customerCanAccessCustomerSubscriptions() throws Exception {
            when(customerPortalService.getSubscriptions("customer@example.com"))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/customer/subscriptions"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMIN role CANNOT access /api/customer/me (returns 403 JSON)")
        @WithMockUser(username = "admin@brightloop.com", roles = {"ADMIN"})
        void adminCannotAccessCustomerMe() throws Exception {
            mockMvc.perform(get("/api/customer/me"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        @Test
        @DisplayName("INTERNAL role CANNOT access /api/customer/me (returns 403 JSON)")
        @WithMockUser(username = "staff@brightloop.com", roles = {"INTERNAL"})
        void internalCannotAccessCustomerMe() throws Exception {
            mockMvc.perform(get("/api/customer/me"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        @Test
        @DisplayName("Unauthenticated request to /api/customer/me returns 401 JSON")
        void unauthenticatedCannotAccessCustomerMe() throws Exception {
            mockMvc.perform(get("/api/customer/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.error").value("Unauthorized"))
                    .andExpect(jsonPath("$.path").value("/api/customer/me"));
        }
    }

    // ==========================================
    // 4. Public Endpoint Tests
    // ==========================================
    @Nested
    @DisplayName("Public Endpoint Access")
    class PublicEndpointSecurityTests {

        @Test
        @DisplayName("Unauthenticated request CAN access /api/users/register (Not blocked by 401/403)")
        void unauthenticatedCanAccessRegisterEndpoint() throws Exception {
            mockMvc.perform(post("/api/users/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    // Expect 400 Bad Request due to validation, NOT 401 or 403
                    .andExpect(status().isBadRequest());
        }
    }
}

