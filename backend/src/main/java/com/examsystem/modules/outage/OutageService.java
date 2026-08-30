package com.examsystem.modules.outage;

import com.examsystem.modules.audit.AuditService;
import com.examsystem.common.BusinessException;
import com.examsystem.common.ErrorCode;
import com.examsystem.common.IdGenerator;
import com.examsystem.common.JsonHelper;
import com.examsystem.common.PageDto;
import com.examsystem.modules.exam.entity.Exam;
import com.examsystem.modules.exam.entity.ExamAttempt;
import com.examsystem.modules.exam.repository.ExamAttemptRepository;
import com.examsystem.modules.exam.repository.ExamRepository;
import com.examsystem.modules.outage.entity.OutageEvent;
import com.examsystem.modules.outage.entity.OutageProposal;
import com.examsystem.modules.outage.repository.OutageEventRepository;
import com.examsystem.modules.outage.repository.OutageProposalRepository;
import com.examsystem.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OutageService {

    private static final int COMPENSATION_PAGE_SIZE = 500;

    private final OutageEventRepository eventRepository;
    private final OutageProposalRepository proposalRepository;
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final AuditService auditService;

    public OutageService(
            OutageEventRepository eventRepository,
            OutageProposalRepository proposalRepository,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            AuditService auditService
    ) {
        this.eventRepository = eventRepository;
        this.proposalRepository = proposalRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.auditService = auditService;
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
        applyProposalCompensation(event, proposal);
        event.setStatus("resolved");
        eventRepository.save(event);
        auditService.log(
                "outage.confirm",
                "OutageEvent",
                eventId,
                Map.of("status", "detected", "proposalVersion", version),
                Map.of("status", "resolved", "note", note != null ? note : ""),
                note
        );
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
        auditService.log("outage.reject", "OutageEvent", eventId,
                Map.of("proposalVersion", version), Map.of("status", "rejected"), reason);
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
        auditService.log("outage.create", "OutageEvent", event.getId(), null,
                Map.of("affectedExamIds", affectedExamIds), null);
        return eventToDto(event);
    }

    @Transactional
    public void pauseExam(String examId, String reason) {
        requireOutageAuthorized();
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> BusinessException.of(ErrorCode.NOT_FOUND, "考试不存在", 404));
        exam.setRunStatus("paused");
        examRepository.save(exam);
        auditService.log("exam.pause", "Exam", examId,
                Map.of("runStatus", "normal"), Map.of("runStatus", "paused"), reason);
    }

    private void applyProposalCompensation(OutageEvent event, OutageProposal proposal) {
        Map<String, Object> proposalData = JsonHelper.toMap(proposal.getProposalJson());
        int extendMinutes = proposalData.get("extendMinutes") instanceof Number number
                ? number.intValue()
                : 15;
        List<String> examIds = JsonHelper.toStringList(event.getAffectedExamIds());
        Instant now = Instant.now();
        for (String examId : examIds) {
            examRepository.findById(examId).ifPresent(exam -> {
                exam.setRunStatus("normal");
                Instant base = exam.getStopAttemptAt() != null ? exam.getStopAttemptAt() : now;
                exam.setStopAttemptAt(base.plus(extendMinutes, ChronoUnit.MINUTES));
                examRepository.save(exam);
                extendInProgressAttempts(examId, extendMinutes);
            });
        }
    }

    /**
     * Only in-progress attempts are fetched, page by page, so compensating a 2,000-person exam never
     * loads its full attempt history.
     */
    private void extendInProgressAttempts(String examId, int extendMinutes) {
        int pageIndex = 0;
        Page<ExamAttempt> page;
        do {
            page = attemptRepository.findByExamIdAndAttemptStatus(
                    examId, "inProgress", PageRequest.of(pageIndex, COMPENSATION_PAGE_SIZE, Sort.by("id")));
            for (ExamAttempt attempt : page.getContent()) {
                attempt.setExpiresAt(attempt.getExpiresAt().plus(extendMinutes, ChronoUnit.MINUTES));
                attempt.setCompensationSeconds(attempt.getCompensationSeconds() + extendMinutes * 60);
            }
            attemptRepository.saveAll(page.getContent());
            attemptRepository.flush();
            pageIndex++;
        } while (page.hasNext());
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
