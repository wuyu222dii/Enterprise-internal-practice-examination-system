package com.examsystem.modules.mock.repository;

import com.examsystem.modules.mock.entity.MockAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MockAnswerRepository extends JpaRepository<MockAnswer, String> {
    Optional<MockAnswer> findByMockAttemptIdAndPaperItemId(String attemptId, String itemId);
    List<MockAnswer> findByMockAttemptId(String attemptId);
}
