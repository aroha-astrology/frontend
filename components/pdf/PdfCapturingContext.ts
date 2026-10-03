"use client";

import { createContext, useContext } from "react";

/**
 * True while the screen is being turned into a PDF (see ./PdfDownload.tsx).
 * The PDF is a picture of what is on screen, so anything folded away has to
 * open for the picture: collapsible pieces read this and show their content,
 * without animating, for as long as it is true.
 */
export const PdfCapturingContext = createContext(false);

export const usePdfCapturing = () => useContext(PdfCapturingContext);
