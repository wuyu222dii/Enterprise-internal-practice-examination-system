import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Route,
  X,
} from "lucide-react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AdminPrototype } from "./surfaces/AdminPrototype";
import { ExamPrototype } from "./surfaces/ExamPrototype";
import { MiniPrototype } from "./surfaces/MiniPrototype";
import {
  flows,
  getPage,
  pageRegistry,
  pagesForSurface,
  surfaceLabels,
} from "./registry";
import type { FlowId, PageId, Surface } from "./types";
import { Badge, Button, IconButton, Segmented } from "./components/ui";

const surfaceOptions = [
  { value: "mini" as const, label: "小程序" },
  { value: "exam" as const, label: "考试端" },
  { value: "admin" as const, label: "后台" },
];

function updateSearch(
  locationSearch: string,
  key: string,
  value?: string,
): string {
  const params = new URLSearchParams(locationSearch);
  if (value) params.set(key, value);
  else params.delete(key);
  return params.toString();
}

export default function App() {
  const { surface: rawSurface, pageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const reviewVisible = !["0", "hidden"].includes(params.get("review") ?? "");

  if (!rawSurface || !pageId)
    return <Navigate to="/mini/MP-02?scenario=standard" replace />;
  if (!["mini", "exam", "admin"].includes(rawSurface))
    return <Navigate to="/mini/MP-02?scenario=standard" replace />;
  const surface = rawSurface as Surface;
  const page = getPage(pageId);
  if (!page || page.surface !== surface)
    return <Navigate to="/mini/MP-02?scenario=standard" replace />;

  const scenario =
    params.get("scenario") &&
    page.scenarios.some((item) => item.id === params.get("scenario"))
      ? params.get("scenario")!
      : (page.scenarios[0]?.id ?? "standard");
  const surfacePages = pagesForSurface(surface);
  const activeIndex = surfacePages.findIndex((item) => item.id === page.id);
  const activeFlow = flows.find((flow) => flow.id === params.get("flow"));
  const flowId: FlowId | "" = activeFlow?.id ?? "";
  const flowStep =
    activeFlow?.steps.findIndex((step) => step.pageId === page.id) ?? -1;

  const goTo = (
    target: PageId,
    targetScenario?: string,
    targetFlowId: FlowId | "" = flowId,
  ) => {
    const targetPage = getPage(target);
    if (!targetPage) return;
    const search = new URLSearchParams();
    search.set(
      "scenario",
      targetScenario ?? targetPage.scenarios[0]?.id ?? "standard",
    );
    if (targetFlowId) search.set("flow", targetFlowId);
    if (
      !reviewVisible ||
      ["0", "hidden"].includes(params.get("review") ?? "")
    ) {
      search.set("review", params.get("review") === "0" ? "0" : "hidden");
    }
    navigate(`/${targetPage.surface}/${targetPage.id}?${search.toString()}`);
  };

  const hideReview = () => {
    navigate(
      `${location.pathname}?${updateSearch(location.search, "review", "hidden")}`,
      { replace: true },
    );
  };

  const showReview = () => {
    navigate(
      `${location.pathname}?${updateSearch(location.search, "review")}`,
      { replace: true },
    );
  };

  const setScenario = (nextScenario: string) =>
    navigate(
      `${location.pathname}?${updateSearch(location.search, "scenario", nextScenario)}`,
    );
  const changeSurface = (next: Surface) => {
    const target =
      pagesForSurface(next)[next === "mini" ? 1 : 0] ??
      pagesForSurface(next)[0];
    if (target) goTo(target.id);
  };
  const selectFlow = (next: string) => {
    const selected = flows.find((flow) => flow.id === next);
    if (selected) {
      const firstStep = selected.steps[0];
      goTo(firstStep.pageId, firstStep.scenario, selected.id);
    } else {
      navigate(`${location.pathname}?${updateSearch(location.search, "flow")}`);
    }
  };
  const goToFlowStep = (index: number) => {
    const step = activeFlow?.steps[index];
    if (step && activeFlow) {
      goTo(step.pageId, step.scenario, activeFlow.id);
    }
  };

  const surfaceProps = { page, scenario, navigateTo: goTo, setScenario };
  const renderer =
    surface === "mini" ? (
      <MiniPrototype {...surfaceProps} />
    ) : surface === "exam" ? (
      <ExamPrototype {...surfaceProps} />
    ) : (
      <AdminPrototype {...surfaceProps} />
    );

  return (
    <main
      className={`review-workspace ${reviewVisible ? "" : "review-workspace--focus"}`}
    >
      {reviewVisible && (
        <aside className="review-sidebar" aria-label="原型评审导航">
          <div className="review-brand">
            <span>企业学习与考试</span>
            <Badge tone="info">V1 原型</Badge>
          </div>
          <Segmented
            value={surface}
            options={surfaceOptions}
            onChange={changeSurface}
            label="选择产品端"
          />
          <label className="review-select-label" htmlFor="flow-select">
            <Route size={15} />
            端到端流程
          </label>
          <select
            id="flow-select"
            className="review-select"
            value={flowId}
            onChange={(event) => selectFlow(event.target.value)}
          >
            <option value="">自由浏览全部页面</option>
            {flows.map((flow) => (
              <option value={flow.id} key={flow.id}>
                {flow.id} · {flow.title}
              </option>
            ))}
          </select>
          {activeFlow && (
            <p className="review-flow-summary">{activeFlow.summary}</p>
          )}
          <nav
            className="review-page-list"
            aria-label={`${surfaceLabels[surface]}页面`}
          >
            {surfacePages.map((item) => (
              <button
                key={item.id}
                className={item.id === page.id ? "is-active" : ""}
                onClick={() => goTo(item.id)}
              >
                <span>{item.id}</span>
                {item.title}
              </button>
            ))}
          </nav>
          <div className="review-sidebar__footer">
            <IconButton label="隐藏评审工具" onClick={hideReview}>
              <EyeOff size={17} />
            </IconButton>
            <span>
              {pageRegistry.length} 页 · {flows.length} 流程
            </span>
          </div>
        </aside>
      )}
      <section className="review-stage">
        {!reviewVisible && params.get("review") !== "0" && (
          <button
            className="review-show"
            onClick={showReview}
            title="显示评审工具"
          >
            <Eye size={18} />
            <span>评审工具</span>
          </button>
        )}
        {reviewVisible && (
          <header className="review-toolbar">
            <div className="review-toolbar__title">
              <strong>
                {page.id} · {page.title}
              </strong>
              <span>{page.description}</span>
            </div>
            <div className="review-toolbar__scenarios">
              <label htmlFor="scenario-select">页面状态</label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
              >
                {page.scenarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <IconButton
                label="重置当前状态"
                onClick={() => setScenario(page.scenarios[0]?.id ?? "standard")}
              >
                <RotateCcw size={16} />
              </IconButton>
            </div>
            <IconButton label="隐藏评审工具" onClick={hideReview}>
              <X size={18} />
            </IconButton>
          </header>
        )}
        <div className={`product-canvas product-canvas--${surface}`}>
          {renderer}
        </div>
        {reviewVisible && (
          <footer className="review-meta">
            <div>
              <span>功能</span>
              <strong title={page.fr.join("、")}>{page.fr.join("、")}</strong>
            </div>
            <div>
              <span>流程</span>
              <strong title={page.flows.join("、")}>
                {page.flows.join("、")}
              </strong>
            </div>
            <div>
              <span>验收</span>
              <strong title={page.acceptance.join("、")}>
                {page.acceptance.join("、")}
              </strong>
            </div>
            <div className="review-meta__paging">
              <Button
                variant="ghost"
                disabled={
                  activeFlow && flowStep >= 0 ? flowStep <= 0 : activeIndex <= 0
                }
                onClick={() =>
                  activeFlow && flowStep >= 0
                    ? goToFlowStep(flowStep - 1)
                    : goTo(surfacePages[activeIndex - 1].id)
                }
              >
                <ChevronLeft size={16} />
                {activeFlow && flowStep >= 0 ? "上一步" : "上一页"}
              </Button>
              {activeFlow && flowStep >= 0 && (
                <span>
                  {flowStep + 1} / {activeFlow.steps.length}
                </span>
              )}
              <Button
                variant="ghost"
                disabled={
                  activeFlow && flowStep >= 0
                    ? flowStep >= activeFlow.steps.length - 1
                    : activeIndex >= surfacePages.length - 1
                }
                onClick={() =>
                  activeFlow && flowStep >= 0
                    ? goToFlowStep(flowStep + 1)
                    : goTo(surfacePages[activeIndex + 1].id)
                }
              >
                {activeFlow && flowStep >= 0 ? "下一步" : "下一页"}
                <ChevronRight size={16} />
              </Button>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}
