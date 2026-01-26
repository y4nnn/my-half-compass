import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileText, Sparkles } from "lucide-react";

interface ProfileReportProps {
  profileData: any;
  onFindMatch: () => void;
}

export function ProfileReport({ profileData, onFindMatch }: ProfileReportProps) {
  return (
    <div className="min-h-screen flex flex-col bg-warm-gradient px-6 py-8">
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Your Profile Report
        </h1>
        <p className="text-muted-foreground">
          Here's what we learned from our conversation
        </p>
      </motion.div>

      {/* JSON Report Card */}
      <motion.div
        className="flex-1 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Profile Data (JSON)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[50vh]">
              <pre className="text-sm text-foreground font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(profileData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        className="grid gap-3 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {profileData?.themes && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.themes.map((theme: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profileData?.experiences && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Experiences</h3>
              <ul className="space-y-1">
                {profileData.experiences.map((exp: string, index: number) => (
                  <li key={index} className="text-sm text-foreground">
                    • {exp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {profileData?.personality && (
          <Card className="bg-card/60 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Personality</h3>
              <p className="text-sm text-foreground">{profileData.personality}</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Find Match Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Button
          onClick={onFindMatch}
          size="lg"
          className="w-full h-14 text-lg rounded-2xl font-semibold shadow-glow transition-all hover:shadow-warm hover:scale-[1.02]"
        >
          Find My Match
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          We'll use this profile to find someone who truly understands you
        </p>
      </motion.div>
    </div>
  );
}
