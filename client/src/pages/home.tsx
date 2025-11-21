import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Video, Loader2, CheckCircle2, AlertCircle, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { loomUrlSchema, type LoomUrlInput, type AnalyzeVideoResponse, type Ticket } from "@shared/schema";

export default function Home() {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoomUrlInput>({
    resolver: zodResolver(loomUrlSchema),
    defaultValues: {
      url: "",
      transcript: "",
    },
  });

  const analyzeVideo = useMutation({
    mutationFn: async (data: LoomUrlInput) => {
      const response = await apiRequest<AnalyzeVideoResponse>("POST", "/api/analyze-video", data);
      return response;
    },
    onSuccess: (data) => {
      setTicket(data.ticket);
      setVideoTitle(data.videoTitle || "");
      toast({
        title: "Analysis complete",
        description: "Your bug ticket has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error.message || "Failed to analyze the video. Please try again.",
      });
    },
  });

  const onSubmit = (data: LoomUrlInput) => {
    setTicket(null);
    setVideoTitle("");
    analyzeVideo.mutate(data);
  };

  const copyToClipboard = () => {
    if (!ticket) return;

    const ticketText = `# ${ticket.title}

## Description
${ticket.description}

## Steps to Reproduce
${ticket.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Expected Behavior
${ticket.expectedBehavior}

## Actual Behavior
${ticket.actualBehavior}
${ticket.environment ? `\n## Environment\n${ticket.environment}` : ''}
${ticket.severity ? `\n## Severity\n${ticket.severity.toUpperCase()}` : ''}`;

    navigator.clipboard.writeText(ticketText);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "The ticket has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityVariant = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Video className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">Loom to Ticket</h1>
          </div>
          <p className="text-muted-foreground text-base">
            Transform Loom bug reports into structured tickets with AI
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Video Analysis</CardTitle>
            <CardDescription className="text-sm">
              Paste your Loom video URL to automatically extract and analyze the content with AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Loom Video URL</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-loom-url"
                          placeholder="https://www.loom.com/share/..."
                          {...field}
                          className="h-12 text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Enter the complete URL from your Loom video
                      </FormDescription>
                      <FormMessage data-testid="text-url-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transcript"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Video Transcript or Description
                        <span className="text-muted-foreground ml-1">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-transcript"
                          placeholder="Optional: Paste the transcript or describe the bug if automatic extraction fails...

Example: User clicks 'Submit' button, but nothing happens. Console shows error 'Cannot read property of undefined'. The form should submit data to the backend."
                          {...field}
                          className="min-h-[120px] text-sm resize-y"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The app will try to extract the transcript automatically. Provide it manually only if automatic extraction fails or for better accuracy.
                      </FormDescription>
                      <FormMessage data-testid="text-transcript-error" />
                    </FormItem>
                  )}
                />
                <Button
                  data-testid="button-analyze"
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={analyzeVideo.isPending}
                >
                  {analyzeVideo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Video...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Analyze Video & Generate Ticket
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {analyzeVideo.isPending && (
          <Card data-testid="card-loading" className="mb-8">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center space-y-2">
                  <p className="font-medium">Analyzing video with AI</p>
                  <p className="text-sm text-muted-foreground">
                    This may take a moment as we watch and understand the bug...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {ticket && (
          <Card data-testid="card-ticket" className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-semibold">Generated Ticket</CardTitle>
                </div>
                {videoTitle && (
                  <CardDescription className="text-sm">From: {videoTitle}</CardDescription>
                )}
              </div>
              <Button
                data-testid="button-copy"
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold" data-testid="text-ticket-title">
                    {ticket.title}
                  </h3>
                  {ticket.severity && (
                    <Badge
                      data-testid={`badge-severity-${ticket.severity}`}
                      variant={getSeverityVariant(ticket.severity)}
                    >
                      {ticket.severity.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="text-sm leading-relaxed" data-testid="text-description">
                  {ticket.description}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Steps to Reproduce</h4>
                <ol className="space-y-2 font-mono text-sm" data-testid="list-steps">
                  {ticket.stepsToReproduce.map((step, index) => (
                    <li key={index} className="flex gap-3" data-testid={`step-${index}`}>
                      <span className="text-muted-foreground min-w-[1.5rem]">{index + 1}.</span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Expected Behavior</h4>
                  <p className="text-sm font-mono leading-relaxed" data-testid="text-expected">
                    {ticket.expectedBehavior}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Actual Behavior</h4>
                  <p className="text-sm font-mono leading-relaxed" data-testid="text-actual">
                    {ticket.actualBehavior}
                  </p>
                </div>
              </div>

              {ticket.environment && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Environment</h4>
                  <p className="text-sm font-mono" data-testid="text-environment">
                    {ticket.environment}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!ticket && !analyzeVideo.isPending && (
          <Alert data-testid="alert-empty">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Getting Started:</strong> Paste a Loom video URL above. The app will automatically extract the transcript and generate a detailed bug ticket. If automatic extraction fails, you can provide the transcript manually.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
