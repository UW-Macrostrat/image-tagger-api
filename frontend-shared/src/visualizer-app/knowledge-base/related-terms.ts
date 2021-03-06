import h from "@macrostrat/hyper";
import {
  useAPIResult,
  useAPIHelpers,
  APIProvider,
  APIContext,
} from "@macrostrat/ui-components";
import { useAppState, useAppDispatch } from "./provider";
import { CollapseCard } from "~/shared/ui";
import {
  Button,
  AnchorButton,
  Intent,
  Tooltip,
  IButtonProps,
  Position,
} from "@blueprintjs/core";
import { format } from "d3-format";

const fmt = format(".3f");

type WordResult = [string, number];

const TermResult = (props: { data: WordResult }) => {
  const [word, corr] = props.data;
  return h("li", [
    h("span.word", word.replace("_", " ")),
    h("span.correlation", fmt(corr)),
  ]);
};

const TermResults = (props: { words: WordResult[] | null }) => {
  const { words } = props;
  if (words == null || words.length == 0)
    return h("p.no-results", "No results");
  return h(
    "ul.term-results",
    words.map((d, i) => h(TermResult, { key: i, data: d }))
  );
};

type WordRelatedTermsProps = { word: string; route?: string; params?: object };

const WordRelatedTerms = (props: WordRelatedTermsProps) => {
  const { word, route = "", params: baseParams = {} } = props;
  const params = {
    word: word.replace(" ", "_"),
    model: "trigram_lowered_cleaned",
    ...baseParams,
  };

  const res = useAPIResult("", params) ?? [];
  const { buildURL } = useAPIHelpers();
  const url = buildURL("", {
    ...params,
    n: 50,
    // we've hardcoded this; that may need to change
  });

  if (params.word == "") return null;

  return h("div.related-terms-response", [
    h("h4", word),
    h(TermResults, { words: res }),
    h(
      AnchorButton,
      {
        href: url,
        small: true,
        minimal: true,
        rightIcon: "code",
        target: "_blank",
        className: "json-object",
      },
      "JSON"
    ),
  ]);
};

type RelatedPanelState = { canOpen: boolean; isOpen: boolean; words: string[] };

const useRelatedPanelState = (): RelatedPanelState => {
  const { filterParams, relatedPanelOpen } = useAppState();
  const { query } = filterParams;
  let words = (query ?? "").split(" ");
  // Up to three words can form a trigram
  if (words.length <= 3) words = [words.join(" ")];

  const canOpen = query != null && query != "";
  return {
    words,
    canOpen,
    isOpen: relatedPanelOpen && canOpen,
  };
};

type _ = {
  baseURL?: string;
};

const RelatedTerms = (props: _) => {
  const { words, isOpen } = useRelatedPanelState();
  const dispatch = useAppDispatch();
  const { baseURL } = props;

  return h(CollapseCard, { isOpen, className: "related-terms" }, [
    h("div.top-row", [
      h("h3", "Related terms"),
      h("div.spacer"),
      h(
        "div.right-controls",
        null,
        h(Button, {
          icon: "cross",
          intent: Intent.DANGER,
          minimal: true,
          onClick() {
            dispatch({ type: "toggle-related-panel", value: false });
          },
        })
      ),
    ]),
    h(
      APIProvider,
      {
        baseURL,
        unwrapResponse: (d) => d.data,
      },
      h(
        "div.terms",
        words.map((w) => h(WordRelatedTerms, { word: w }))
      )
    ),
  ]);
};

const RelatedTermsButton = (props: IButtonProps) => {
  const { isOpen, canOpen } = useRelatedPanelState();
  const dispatch = useAppDispatch();

  return h(
    Tooltip,
    {
      content: `${isOpen ? "Hide" : "Show"} related terms`,
      position: Position.BOTTOM,
    },
    h(AnchorButton, {
      icon: "properties",
      minimal: true,
      intent: !isOpen ? Intent.PRIMARY : null,
      disabled: !canOpen,
      onClick() {
        if (!canOpen) return;
        dispatch({ type: "toggle-related-panel" });
      },
      ...props,
    })
  );
};

export { RelatedTerms, RelatedTermsButton, useRelatedPanelState };
