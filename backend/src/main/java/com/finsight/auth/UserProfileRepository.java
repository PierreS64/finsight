package com.finsight.auth;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {}
