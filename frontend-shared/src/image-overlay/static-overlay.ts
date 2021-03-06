import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { AnnotationLinks } from "./annotation-links";
import { AnnotationsOverlay } from "./annotations";
import { AnnotationsProvider } from "../providers";

function StaticImageOverlay({ tagRoute }) {
  // Get editing actions into the props
  const annotations = useAPIResult(tagRoute) ?? [];
  return h(AnnotationsProvider, { allowSelection: false, annotations }, [
    h(AnnotationsOverlay),
    h(AnnotationLinks),
  ]);
}

export { StaticImageOverlay };
