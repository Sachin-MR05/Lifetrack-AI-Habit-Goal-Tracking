import { ExternalLink, Youtube, Github, Linkedin, Briefcase, BookOpen, FileText, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TaskStep {
  icon: 'youtube' | 'github' | 'linkedin' | 'briefcase' | 'book' | 'file' | 'check';
  title: string;
  description?: string;
  link?: string;
  isVideo?: boolean;
  videoId?: string;
}

const parseTaskDescription = (description: string): TaskStep[] => {
  const lines = description.split('\n').filter(line => line.trim());
  const steps: TaskStep[] = [];
  
  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Extract YouTube video ID from URLs
    const youtubeMatch = cleanLine.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const linkMatch = cleanLine.match(/https?:\/\/[^\s]+/);
    
    let icon: TaskStep['icon'] = 'check';
    let title = cleanLine.replace(/^[📺🔗📝💾💻🛠️📱📄🔍📧📚]\s*/, '');
    
    if (cleanLine.includes('📺') || cleanLine.toLowerCase().includes('watch') || cleanLine.toLowerCase().includes('youtube')) {
      icon = 'youtube';
    } else if (cleanLine.includes('💾') || cleanLine.toLowerCase().includes('github') || cleanLine.toLowerCase().includes('push')) {
      icon = 'github';
    } else if (cleanLine.includes('📱') || cleanLine.toLowerCase().includes('linkedin')) {
      icon = 'linkedin';
    } else if (cleanLine.includes('📧') || cleanLine.toLowerCase().includes('apply') || cleanLine.toLowerCase().includes('internship') || cleanLine.toLowerCase().includes('job')) {
      icon = 'briefcase';
    } else if (cleanLine.includes('📚') || cleanLine.toLowerCase().includes('learn') || cleanLine.toLowerCase().includes('study')) {
      icon = 'book';
    } else if (cleanLine.includes('📝') || cleanLine.toLowerCase().includes('note') || cleanLine.toLowerCase().includes('document')) {
      icon = 'file';
    }
    
    steps.push({
      icon,
      title: title.replace(/https?:\/\/[^\s]+/g, '').trim(),
      link: linkMatch ? linkMatch[0] : undefined,
      isVideo: icon === 'youtube' && youtubeMatch !== null,
      videoId: youtubeMatch ? youtubeMatch[1] : undefined,
    });
  }
  
  return steps;
};

const iconMap = {
  youtube: Youtube,
  github: Github,
  linkedin: Linkedin,
  briefcase: Briefcase,
  book: BookOpen,
  file: FileText,
  check: CheckCircle,
};

const iconColors = {
  youtube: 'text-red-500 bg-red-500/10',
  github: 'text-foreground bg-foreground/10',
  linkedin: 'text-blue-500 bg-blue-500/10',
  briefcase: 'text-emerald-500 bg-emerald-500/10',
  book: 'text-purple-500 bg-purple-500/10',
  file: 'text-amber-500 bg-amber-500/10',
  check: 'text-primary bg-primary/10',
};

interface TaskStepCardProps {
  description: string;
}

export const TaskStepCard = ({ description }: TaskStepCardProps) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  const steps = parseTaskDescription(description);
  
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground mt-1">{description}</p>;
  }
  
  const openVideo = (videoId: string) => {
    setActiveVideoId(videoId);
    setVideoOpen(true);
  };
  
  return (
    <>
      <div className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon];
          const colorClass = iconColors[step.icon];
          
          return (
            <div
              key={index}
              className={step.isVideo && step.videoId ? 
                "rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 hover:border-border/80 transition-all duration-300 group overflow-hidden" :
                "flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/80 transition-all duration-300 group overflow-hidden"
              }
            >
              {/* Video Card Layout */}
              {step.isVideo && step.videoId ? (
                <div className="flex items-stretch overflow-hidden">
                  {/* Thumbnail - 40% */}
                  <button
                    onClick={() => openVideo(step.videoId!)}
                    className="relative w-2/5 h-40 flex-shrink-0 group/thumb hover:ring-2 ring-primary/50 transition-all duration-300 overflow-hidden"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${step.videoId}/maxresdefault.jpg`}
                      alt={step.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 flex items-center justify-center transition-all duration-300">
                      <div className="w-16 h-16 rounded-full bg-red-500/80 group-hover/thumb:bg-red-500 flex items-center justify-center transition-all duration-300 group-hover/thumb:scale-110 shadow-lg">
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Details - 60% */}
                  <div className="w-3/5 p-4 flex flex-col justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground line-clamp-2 mb-2">{step.title}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-red-500/10">
                            <Youtube className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">YouTube Video</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-muted-foreground">~8-15 min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs text-muted-foreground">High Quality</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <button
                        onClick={() => openVideo(step.videoId!)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-all duration-200 text-xs font-semibold"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        Watch Now
                      </button>
                      <span className="text-xs text-muted-foreground font-medium">
                        Step {index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Non-video items */}
                  <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    {step.link && (
                      <div className="mt-1">
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open link
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                    Step {index + 1}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {activeVideoId && (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
