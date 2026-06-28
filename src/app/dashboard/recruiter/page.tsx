import { RecruiterChat } from "@/components/dashboard/recruiter-chat";

export const metadata = { title: "AI Recruiter" };

export default function RecruiterPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">AI Recruiter</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Natural-language access to your ranked pool. Powered by Gemini 2.5 Flash when a key is set — grounded local engine otherwise.
        </p>
      </div>
      <RecruiterChat />
    </div>
  );
}
