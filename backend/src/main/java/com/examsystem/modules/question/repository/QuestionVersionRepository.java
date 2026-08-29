package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.QuestionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface QuestionVersionRepository extends JpaRepository<QuestionVersion, String> {
    List<QuestionVersion> findByQuestionIdOrderByVersionNoDesc(String questionId);
    Optional<QuestionVersion> findTopByQuestionIdOrderByVersionNoDesc(String questionId);
}
