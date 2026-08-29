package com.examsystem.modules.question.repository;

import com.examsystem.modules.question.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, String> {
    Page<Question> findByQuestionBankId(String questionBankId, Pageable pageable);
}
