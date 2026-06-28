import { NextResponse } from "next/server";
import { buildSubmissionCsv, validateSubmission } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const csv = buildSubmissionCsv();
  const check = validateSubmission(csv);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hiremind_submission.csv"',
      "X-Submission-Valid": String(check.ok),
      "X-Submission-Rows": String(check.rowCount),
    },
  });
}
