import { JdUploader } from "@/components/dashboard/jd-uploader";

export const metadata = { title: "Upload Job Description" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Upload a job description</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop or paste a JD. HireMind parses it, extracts requirements & anti-signals, then re-ranks the entire candidate pool against it.
        </p>
      </div>
      <JdUploader />
    </div>
  );
}
