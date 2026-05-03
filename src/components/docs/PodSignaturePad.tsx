"use client";

import * as React from "react";
import SignatureCanvas from "react-signature-canvas";

export type PodSignaturePadProps = {
  penColor?: string;
  heightPx?: number;
};

/** Receiver acknowledgement — export PNG via SignatureCanvas ref (use getCanvas().toBlob from parent). */
export const PodSignaturePad = React.forwardRef<SignatureCanvas, PodSignaturePadProps>(
  function PodSignaturePad({ penColor = "#020617", heightPx = 180 }, ref) {
    return (
      <div className="rounded-md border bg-white shadow-inner dark:bg-zinc-900">
        <SignatureCanvas
          ref={ref}
          penColor={penColor}
          canvasProps={{
            className: "w-full rounded-md touch-none",
            style: { height: heightPx, touchAction: "none" as React.CSSProperties["touchAction"] },
          }}
          backgroundColor="rgb(255,255,255)"
        />
      </div>
    );
  }
);
