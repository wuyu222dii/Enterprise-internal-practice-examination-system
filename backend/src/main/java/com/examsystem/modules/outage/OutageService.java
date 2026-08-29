package com.examsystem.modules.outage;

import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.modules.outage.entity.OutageEvent;
import com.examsystem.modules.outage.entity.OutageProposal;
import com.examsystem.modules.outage.repository.OutageEventRepository;
import com.examsystem.modules.outage.repository.OutageProposalRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OutageService {

    private final OutageEventRepository eventRepository;
    private final OutageProposalRepository proposalRepository;

    public OutageService(OutageEventRepository eventRepository, OutageProposalRepository proposalRepository) {
        this.eventRepository = eventRepository;
        this.proposalRepository = proposalRepository;
    }

    public PageDto<Map<String, Object>> listEvents(int page, int pageSize) {
        requireOutageAuthorized();
        Page<OutageEvent> result = eventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, pageSize));
        return new PageDto<>(result.getContent().stream().map(this::eventToDto).toList(),
                result.getTotalElements(), page, pageSize);
    }

    public Map<String, Object> getEvent(String id) {
        requireOutageAuthorized();
        OutageEvent event = getEventEntity(id);
        Map<String, Object> dto = eventToDto(event);
        dto.put("proposals", proposalRepository.findByOutageEventIdOrderByVersionDesc(id).stream()
                .map(this::proposalToDto).toList());
        return dto;
    }

    @Transactional
    public void confirmProposal(String eventId, int version, String note) {
        requireOutageAuthorized();
        OutageEvent event = getEventEntity(eventId);
        OutageProposal proposal = proposalRepository.findByOutageEventIdAndVersion(eventId, version)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "提案不存在", 404));
        if (version != event.getLatestProposalVersion()) {
            throw BusinessException.of(ErrorCode.OPS_PROPOSAL_STALE, "提案版本已过期", 409);
        }
        proposal.setStatus("confirmed");
        proposal.setDecidedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        proposal.setDecidedAt(Instant.now());
        proposalRepository.save(proposal);
        event.setStatus("resolved");
        eventRepository.save(event);
    }

    @Transactional
    public void rejectProposal(String eventId, int version, String reason) {
        requireOutageAuthorized();
        OutageProposal proposal = proposalRepository.findByOutageEventIdAndVersion(eventId, version)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "提案不存在", 404));
        proposal.setStatus("rejected");
        proposal.setDecidedBy(SecurityUtils.requirePrincipal().getEmployeeId());
        proposal.setDecidedAt(Instant.now());
        proposalRepository.save(proposal);
    }

    @Transactional
    public Map<String, Object> createEvent(List<String> affectedExamIds) {
        requireOutageAuthorized();
        OutageEvent event = new OutageEvent();
        event.setId(IdGenerator.newId("out"));
        event.setStatus("detected");
        event.setAffectedExamIds(JsonHelper.toJson(affectedExamIds));
        event.setLatestProposalVersion(1);
        eventRepository.save(event);

        OutageProposal proposal = new OutageProposal();
        proposal.setId(IdGenerator.newId("oup"));
        proposal.setOutageEventId(event.getId());
        proposal.setVersion(1);
        proposal.setProposalJson(JsonHelper.toJson(Map.of("extendMinutes", 15)));
        proposalRepository.save(proposal);
        return eventToDto(event);
    }

    private void requireOutageAuthorized() {
        var principal = SecurityUtils.requirePrincipal();
        if (!principal.isAdmin() && !principal.isHasOutageDisposition()) {
            throw BusinessException.of(ErrorCode.OPS_NOT_AUTHORIZED, "无故障处置权限", 403);
        }
    }

    private OutageEvent getEventEntity(String id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "故障事件不存在", 404));
    }

    private Map<String, Object> eventToDto(OutageEvent event) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", event.getId());
        dto.put("status", event.getStatus());
        dto.put("affectedExamIds", JsonHelper.toStringList(event.getAffectedExamIds()));
        dto.put("latestProposalVersion", event.getLatestProposalVersion());
        dto.put("createdAt", event.getCreatedAt());
        return dto;
    }

    private Map<String, Object> proposalToDto(OutageProposal proposal) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", proposal.getId());
        dto.put("version", proposal.getVersion());
        dto.put("status", proposal.getStatus());
        dto.put("proposal", JsonHelper.parse(proposal.getProposalJson()));
        dto.put("decidedAt", proposal.getDecidedAt());
        return dto;
    }
}
