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
import org.springframework.beans.factory.annotation.Value;
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
    private final int compensationMinutes;

    public OutageService(
            OutageEventRepository eventRepository,
            OutageProposalRepository proposalRepository,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            AuditService auditService,
            @Value("${exam.outage.compensation-minutes:15}") int compensationMinutes
    ) {
        this.eventRepository = eventRepository;
        this.proposalRepository = proposalRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.auditService = auditService;
        this.compensationMinutes = compensationMinutes;
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
        if ("resolved".equals(event.getStatus()) || "confirmed".equals(proposal.getStatus())) {
            return;
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
        event.setSource("manual");
        eventRepository.save(event);

        OutageProposal proposal = new OutageProposal();
        proposal.setId(IdGenerator.newId("oup"));
        proposal.setOutageEventId(event.getId());
        proposal.setVersion(1);
        proposal.setProposalJson(JsonHelper.toJson(Map.of(
                "extendMinutes", 15,
                "editable", true,
                "source", "manual"
        )));
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
        pauseExamInternal(exam, reason);
    }

    /**
     * Health-probe / demo injection: pause the given exams (or every currently open exam),
     * write an immutable compensation proposal, and skip auto-submit until confirmed.
     */
    @Transactional
    public Map<String, Object> detectAndPause(List<String> requestedExamIds, String reason, boolean requireAuth) {
        if (requireAuth) {
            requireOutageAuthorized();
        }
        List<Exam> targets;
        if (requestedExamIds == null || requestedExamIds.isEmpty()) {
            targets = examRepository.findByLifecycleAndRunStatus("openForAttempt", "normal");
        } else {
            targets = examRepository.findAllById(requestedExamIds);
        }
        List<Exam> toPause = targets.stream()
                .filter(exam -> !"paused".equals(exam.getRunStatus()))
                .toList();
        if (toPause.isEmpty()) {
            return Map.of("status", "noop", "reason", "no open exams to pause");
        }
        List<String> examIds = toPause.stream().map(Exam::getId).toList();
        for (Exam exam : toPause) {
            pauseExamInternal(exam, reason);
        }

        OutageEvent event = new OutageEvent();
        event.setId(IdGenerator.newId("out"));
        event.setStatus("detected");
        event.setAffectedExamIds(JsonHelper.toJson(examIds));
        event.setLatestProposalVersion(1);
        event.setSource("auto");
        event.setCandidateStartedAt(Instant.now());
        eventRepository.save(event);

        OutageProposal proposal = new OutageProposal();
        proposal.setId(IdGenerator.newId("oup"));
        proposal.setOutageEventId(event.getId());
        proposal.setVersion(1);
        proposal.setProposalJson(JsonHelper.toJson(Map.of(
                "extendMinutes", compensationMinutes,
                "editable", false,
                "source", "auto"
        )));
        proposalRepository.save(proposal);
        auditService.log("outage.detect", "OutageEvent", event.getId(), null,
                Map.of("affectedExamIds", examIds, "source", "auto"), reason);
        return eventToDto(event);
    }

    private void pauseExamInternal(Exam exam, String reason) {
        String previous = exam.getRunStatus();
        if ("paused".equals(previous)) {
            return;
        }
        exam.setRunStatus("paused");
        examRepository.save(exam);
        auditService.log("exam.pause", "Exam", exam.getId(),
                Map.of("runStatus", previous), Map.of("runStatus", "paused"), reason);
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

    private boolean boolEditable(OutageProposal proposal) {
        Object parsed = JsonHelper.parse(proposal.getProposalJson());
        if (parsed instanceof Map<?, ?> map && map.get("editable") instanceof Boolean editable) {
            return editable;
        }
        return true;
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
        dto.put("source", event.getSource());
        dto.put("createdAt", event.getCreatedAt());
        return dto;
    }

    private Map<String, Object> proposalToDto(OutageProposal proposal) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", proposal.getId());
        dto.put("version", proposal.getVersion());
        dto.put("status", proposal.getStatus());
        dto.put("proposal", JsonHelper.parse(proposal.getProposalJson()));
        dto.put("editable", boolEditable(proposal));
        dto.put("decidedAt", proposal.getDecidedAt());
        return dto;
    }
}
