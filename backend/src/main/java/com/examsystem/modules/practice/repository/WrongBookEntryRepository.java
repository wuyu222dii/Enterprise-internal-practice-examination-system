package com.examsystem.modules.practice.repository;

import com.examsystem.modules.practice.entity.WrongBookEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface WrongBookEntryRepository extends JpaRepository<WrongBookEntry, String> {
    Page<WrongBookEntry> findByEmployeeIdOrderByUpdatedAtDesc(String employeeId, Pageable pageable);
    Optional<WrongBookEntry> findByEmployeeIdAndQuestionVersionId(String employeeId, String versionId);
}
