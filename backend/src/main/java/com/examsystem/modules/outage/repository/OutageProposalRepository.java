package com.examsystem.modules.outage.repository;

import com.examsystem.modules.outage.entity.OutageProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OutageProposalRepository extends JpaRepository<OutageProposal, String> {
    Optional<OutageProposal> findByOutageEventIdAndVersion(String outageEventId, int version);
    List<OutageProposal> findByOutageEventIdOrderByVersionDesc(String outageEventId);
}
