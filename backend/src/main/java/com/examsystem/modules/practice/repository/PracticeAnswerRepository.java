package com.examsystem.modules.practice.repository;

import com.examsystem.modules.practice.entity.PracticeAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PracticeAnswerRepository extends JpaRepository<PracticeAnswer, String> {
    Optional<PracticeAnswer> findByPracticeSessionIdAndQuestionVersionId(String sessionId, String versionId);
}
