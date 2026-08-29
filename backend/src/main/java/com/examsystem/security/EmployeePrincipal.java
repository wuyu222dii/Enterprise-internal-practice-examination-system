package com.examsystem.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class EmployeePrincipal implements UserDetails {

    private final String employeeId;
    private final String employeeNo;
    private final String displayName;
    private final boolean admin;
    private final boolean hasOutageDisposition;
    private final boolean mustChangePassword;
    private final boolean accountEnabled;
    private final String sessionToken;

    public EmployeePrincipal(
            String employeeId,
            String employeeNo,
            String displayName,
            boolean admin,
            boolean hasOutageDisposition,
            boolean mustChangePassword,
            boolean accountEnabled,
            String sessionToken
    ) {
        this.employeeId = employeeId;
        this.employeeNo = employeeNo;
        this.displayName = displayName;
        this.admin = admin;
        this.hasOutageDisposition = hasOutageDisposition;
        this.mustChangePassword = mustChangePassword;
        this.accountEnabled = accountEnabled;
        this.sessionToken = sessionToken;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public String getEmployeeNo() {
        return employeeNo;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isAdmin() {
        return admin;
    }

    public boolean isHasOutageDisposition() {
        return hasOutageDisposition;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_EMPLOYEE"));
        if (admin) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        if (hasOutageDisposition) {
            authorities.add(new SimpleGrantedAuthority("ROLE_OUTAGE_DISPOSITION"));
        }
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return employeeId;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return accountEnabled;
    }
}
