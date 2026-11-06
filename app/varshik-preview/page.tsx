import { notFound } from "next/navigation";
import PreviewClient from "./PreviewClient";

/** Dev-only preview of the Varshik chart components on the Sprint 3 sample facts. 404s in production. */
export default function VarshikPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
