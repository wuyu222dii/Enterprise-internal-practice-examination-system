package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.QuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionBankRepository extends JpaRepository<QuestionBank, String> {
    List<QuestionBank> findByStatusOrderByNameAsc(String status);
    List<QuestionBank> findByPracticeEnabledTrueAndStatus(String status);
    List<QuestionBank> findByMockEnabledTrueAndStatus(String status);
}
