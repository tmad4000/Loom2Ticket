import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loomUrlSchema, type AnalyzeSessionResponse, type TimestampedTicket } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ExternalLink, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function SessionPage() {
  const [result, setResult] = useState<AnalyzeSessionResponse | null>(null);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(loomUrlSchema),
    defaultValues: {
      url: "",
      transcript: "",
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string; transcript?: string }) => {
      const response = await apiRequest<AnalyzeSessionResponse>(
        "POST",
        "/api/analyze-session",
        data
      );
      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Analysis complete",
        description: `Found ${data.totalIssuesFound} issue(s) in the session`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { url: string; transcript?: string }) => {
    analyzeMutation.mutate(data);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const copyTicketToClipboard = (ticket: TimestampedTicket) => {
    const text = `# ${ticket.title}

**Severity:** ${ticket.severity || "Not specified"}
**Timestamp:** ${ticket.timestampDisplay}

## Description
${ticket.description}

## Steps to Reproduce
${ticket.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Expected Behavior
${ticket.expectedBehavior}

## Actual Behavior
${ticket.actualBehavior}

${ticket.environment ? `## Environment\n${ticket.environment}` : ""}

${ticket.loomUrlWithTimestamp ? `## Video Link\n${ticket.loomUrlWithTimestamp}` : ""}
`;

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Ticket details copied successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Session Analysis</h1>
            <Link href="/">
              <Button variant="outline" data-testid="button-single-ticket">
                Single Ticket Mode
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground text-lg">
            Analyze longer Loom sessions to extract multiple bug tickets with timestamps
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Paste Loom Session URL</CardTitle>
            <CardDescription>
              We'll analyze the entire video and transcript to identify all bugs and issues demonstrated
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
                      <FormLabel>Loom Video URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://www.loom.com/share/..."
                          data-testid="input-session-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transcript"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transcript (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Paste transcript here if you have it (helps with timestamp accuracy)..."
                          rows={4}
                          data-testid="input-session-transcript"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={analyzeMutation.isPending}
                  className="w-full"
                  data-testid="button-analyze-session"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing session...
                    </>
                  ) : (
                    "Analyze Session"
                  )}
                </Button>

                {analyzeMutation.isPending && (
                  <p className="text-sm text-muted-foreground text-center">
                    This may take 30-60 seconds for longer videos...
                  </p>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{result.videoTitle || "Session Analysis Results"}</CardTitle>
                    <CardDescription>
                      Found {result.totalIssuesFound} issue{result.totalIssuesFound !== 1 ? "s" : ""} •{" "}
                      {result.videoDuration || "Unknown duration"} •{" "}
                      <Badge variant="outline" className="ml-1">
                        {result.analysisMethod === "combined" ? "Video + Transcript" : 
                         result.analysisMethod === "video" ? "Video Only" : "Transcript Only"}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {result.tickets.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      Great news! We didn't identify any bugs or issues in this session.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {result.tickets.map((ticket, index) => (
                  <Card key={index} data-testid={`ticket-card-${index}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground" data-testid={`ticket-timestamp-${index}`}>
                              {ticket.timestampDisplay}
                            </span>
                            {ticket.loomUrlWithTimestamp && (
                              <a
                                href={ticket.loomUrlWithTimestamp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                data-testid={`link-jump-to-time-${index}`}
                              >
                                Jump to this moment
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <CardTitle className="text-xl mb-2" data-testid={`ticket-title-${index}`}>
                            {ticket.title}
                          </CardTitle>
                          {ticket.severity && (
                            <Badge className={getSeverityColor(ticket.severity)} data-testid={`ticket-severity-${index}`}>
                              {ticket.severity}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyTicketToClipboard(ticket)}
                          data-testid={`button-copy-ticket-${index}`}
                        >
                          Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Description</h4>
                          <p className="text-sm" data-testid={`ticket-description-${index}`}>{ticket.description}</p>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Steps to Reproduce</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm" data-testid={`ticket-steps-${index}`}>
                            {ticket.stepsToReproduce.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Expected Behavior</h4>
                            <p className="text-sm" data-testid={`ticket-expected-${index}`}>{ticket.expectedBehavior}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Actual Behavior</h4>
                            <p className="text-sm" data-testid={`ticket-actual-${index}`}>{ticket.actualBehavior}</p>
                          </div>
                        </div>

                        {ticket.environment && (
                          <>
                            <Separator />
                            <div>
                              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Environment</h4>
                              <p className="text-sm" data-testid={`ticket-environment-${index}`}>{ticket.environment}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
