import { useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import type { NodeKey } from "lexical";

import {
  DEFAULT_HR_MARGIN,
  MARGIN_STEPS,
  marginKeyToPx,
} from "../marginScale";
import { StepSlider } from "../plugins/StepSlider";
import { $isHrNode, type HrNode } from "./HrNode";
import { useLabels } from "../i18n";
import "./hr.css";

interface HrComponentProps {
  nodeKey: NodeKey;
  top: string;
  bottom: string;
}

export function HrComponent({ nodeKey, top, bottom }: HrComponentProps) {
  const [editor] = useLexicalComposerContext();
  const labels = useLabels();
  const [open, setOpen] = useState(false);

  const update = (mutate: (node: HrNode) => void) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isHrNode(node)) mutate(node);
    });
  };

  return (
    // Container stays a stable positioning context; the rule moves with its
    // margins but the gear/panel stay anchored (no flicker while dragging).
    <div className="bew-hr-container">
      <hr
        className="bew-hr"
        style={{
          marginTop: `${marginKeyToPx(top)}px`,
          marginBottom: `${marginKeyToPx(bottom)}px`,
        }}
      />
      <button
        type="button"
        className="bew-hr-gear"
        aria-label={labels.separatorSettings}
        onClick={() => setOpen((prev) => !prev)}
      >
        ⚙
      </button>

      {open && (
        <div className="bew-hr-panel">
          <StepSlider
            label={labels.topSpacing}
            steps={MARGIN_STEPS}
            value={top}
            fallbackKey={DEFAULT_HR_MARGIN}
            onChange={(key) => update((node) => node.setTop(key))}
          />
          <StepSlider
            label={labels.bottomSpacing}
            steps={MARGIN_STEPS}
            value={bottom}
            fallbackKey={DEFAULT_HR_MARGIN}
            onChange={(key) => update((node) => node.setBottom(key))}
          />
        </div>
      )}
    </div>
  );
}
