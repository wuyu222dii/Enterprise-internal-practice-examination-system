package com.examsystem.modules.mock.repository;

import com.examsystem.modules.mock.entity.MockResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MockResultRepository extends JpaRepository<MockResult, String> {
    Optional<MockResult> findByMockAttemptId(String mockAttemptId);
}
