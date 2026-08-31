package com.examsystem.modules.practice.repository;

import com.examsystem.modules.practice.entity.PracticeProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PracticeProgressRepository extends JpaRepository<PracticeProgress, String> {
    Optional<PracticeProgress> findByEmployeeIdAndQuestionBankId(String employeeId, String questionBankId);

    List<PracticeProgress> findByEmployeeId(String employeeId);
}
