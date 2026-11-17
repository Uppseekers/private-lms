export interface LaunchpadSubject {
  id: string;
  order: number;
  title: string;
  description: string;
  accentHex: string;
  surfaceTint: string;
  iconKey?: string;
  customIconUrl?: string;
  hasCurriculum: boolean;
  courseGoal?: string;
  passingThreshold?: number;
  certificateTitle?: string;
  isArchived?: boolean;
}

export interface LaunchpadLecture {
  title: string;
  speaker: string;
  url: string;
  youtubeId?: string;
  duration: string;
  focusNote: string;
}

export interface LaunchpadReadingSection {
  heading: string;
  body: string;
  bullets?: string[];
  frameworkLabel?: string;
  frameworkItems?: { term: string; detail: string }[];
}

export interface LaunchpadReadingGuide {
  title: string;
  readTime: string;
  summary: string;
  pdfUrl?: string;
  pdfFileName?: string;
  sections: LaunchpadReadingSection[];
}

export interface LaunchpadExerciseField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea';
  hint?: string;
  showWordCount?: boolean;
}

export interface LaunchpadPracticalExercise {
  title: string;
  scenario: string;
  instructions?: string[];
  docUrl?: string;
  docFileName?: string;
  allowFileUpload?: boolean;
  selfCheckCriteria: string[];
  fields: LaunchpadExerciseField[];
}

export interface LaunchpadWeekModule {
  id?: string;
  subjectId?: string;
  weekNumber: number;
  title: string;
  learningObjectives?: string[];
  lecture: LaunchpadLecture;
  readingGuide: LaunchpadReadingGuide;
  practicalExercise: LaunchpadPracticalExercise;
}

export interface LaunchpadMCQ {
  id: string;
  subjectId?: string;
  sortOrder?: number;
  weekRef: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LaunchpadSituationalPrompt {
  id: string;
  subjectId?: string;
  sortOrder?: number;
  title: string;
  scenario: string;
  prompt: string;
  minWords: number;
  rubricKeywords: string[];
  rubricGuidance: string;
}

export interface LaunchpadTestDocumentPayload {
  id: string;
  subjectId?: string;
  docUrl: string;
  docFileName: string;
  instructions?: string;
  allowStudentUpload?: boolean;
}

export interface LaunchpadCertQuestionRecord {
  id: string;
  subjectId: string;
  questionType: 'mcq' | 'situational' | 'test_doc';
  sortOrder: number;
  payload: LaunchpadMCQ | LaunchpadSituationalPrompt | LaunchpadTestDocumentPayload;
}

export function extractYoutubeId(url: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : undefined;
}

export const LAUNCHPAD_SUBJECTS: LaunchpadSubject[] = [
  {
    id: 'comm-public-speaking',
    order: 1,
    title: 'Effective Communication & Public Speaking',
    description:
      'Clear verbal and written expression, active listening, and the ability to articulate thoughts or present ideas without stage fear.',
    accentHex: '#4F46E5',
    surfaceTint: '#EEF2FF',
    iconKey: 'comm-public-speaking',
    hasCurriculum: true,
    courseGoal:
      'Build clear verbal, written, and presentation skills for university interviews, counselor/professor outreach, and leadership roles.',
    passingThreshold: 75,
    certificateTitle: 'Launchpad Certified — Effective Communication & Public Speaking',
    isArchived: false,
  },
  {
    id: 'time-self-management',
    order: 2,
    title: 'Time Management & Self-Management',
    description:
      'Creating structured schedules, prioritizing tasks, meeting deadlines, and balancing academics with personal well-being.',
    accentHex: '#0284C7',
    surfaceTint: '#F0F9FF',
    hasCurriculum: false,
  },
  {
    id: 'digital-ai-literacy',
    order: 3,
    title: 'Digital & AI Literacy',
    description:
      'Going beyond basic device usage to understand safe software navigation, online research, digital communication, and practical AI tools.',
    accentHex: '#0D9488',
    surfaceTint: '#F0FDFA',
    hasCurriculum: false,
  },
  {
    id: 'critical-thinking',
    order: 4,
    title: 'Critical Thinking & Problem-Solving',
    description:
      'Evaluating information logically, asking analytical questions, and finding creative solutions when standard answers aren’t provided.',
    accentHex: '#D97706',
    surfaceTint: '#FFFBEB',
    hasCurriculum: false,
  },
  {
    id: 'emotional-intelligence',
    order: 5,
    title: 'Emotional Intelligence (EQ) & Stress Management',
    description:
      'Understanding one\'s own emotions, empathizing with peers, and handling burnout or academic pressure healthily.',
    accentHex: '#E11D48',
    surfaceTint: '#FFF1F2',
    hasCurriculum: false,
  },
  {
    id: 'financial-literacy',
    order: 6,
    title: 'Financial Literacy',
    description:
      'Understanding the basics of budgeting, saving, handling digital transactions, and grasping the value of money.',
    accentHex: '#059669',
    surfaceTint: '#ECFDF5',
    hasCurriculum: false,
  },
  {
    id: 'collaboration-leadership',
    order: 7,
    title: 'Collaboration & Leadership',
    description:
      'Working smoothly in group settings, respecting diverse perspectives, resolving conflicts, and taking initiative.',
    accentHex: '#7C3AED',
    surfaceTint: '#F5F3FF',
    hasCurriculum: false,
  },
  {
    id: 'adaptability-resilience',
    order: 8,
    title: 'Adaptability & Resilience',
    description:
      'Bouncing back from setbacks, handling sudden changes in routine or environment, and maintaining a growth mindset.',
    accentHex: '#2563EB',
    surfaceTint: '#EFF6FF',
    hasCurriculum: false,
  },
];

export const SUBJECT_1_WEEKS: LaunchpadWeekModule[] = [
  {
    weekNumber: 1,
    title: 'Active Listening & Non-Verbal Presence',
    lecture: {
      title: '5 ways to listen better',
      speaker: 'TED — Julian Treasure',
      url: 'https://www.youtube.com/watch?v=cSohjlYQI2A',
      youtubeId: 'cSohjlYQI2A',
      duration: '8 min',
      focusNote:
        'Pay close attention to Julian Treasure\'s RASA framework and how conscious listening transforms interviews and mentoring conversations.',
    },
    readingGuide: {
      title: 'Active Listening & Non-Verbal Presence',
      readTime: '6 min read',
      summary:
        'Great communicators begin by listening with intent. Before shaping persuasive answers or emails, you must accurately decode what an interviewer, professor, or teammate actually cares about.',
      sections: [
        {
          heading: '1. The RASA Framework for Conscious Listening',
          body: 'In high-stakes university interviews and counselor meetings, passive hearing leads to generic answers. Use RASA as your mental anchor during every conversation:',
          frameworkLabel: 'RASA Framework',
          frameworkItems: [
            {
              term: 'R — Receive',
              detail:
                'Give undivided attention to the speaker. Silence phone notifications, close extra browser tabs, and keep posture open toward the speaker or camera lens.',
            },
            {
              term: 'A — Appreciate',
              detail:
                'Signal genuine engagement with small, natural affirmations—eye contact, subtle nodding, and brief verbal cues ("That makes sense", "I see").',
            },
            {
              term: 'S — Summarize',
              detail:
                'Mentally or verbally distill what you heard ("So your team\'s main concern is timeline reliability...") before jumping into your own response.',
            },
            {
              term: 'A — Ask',
              detail:
                'Follow up with an open-ended, curiosity-driven question that builds directly on what the speaker just shared.',
            },
          ],
        },
        {
          heading: '2. Eliminating Internal & External Distractions',
          body: 'Most students lose listening bandwidth because they start rehearsing their next sentence while the other person is still talking. Replace premature rehearsing with two habits:',
          bullets: [
            'Physical Reset: Place both feet flat, keep hands visible, and position your laptop camera at eye level.',
            'The 1-Second Buffer: Let the speaker finish completely, pause for one full beat, and then respond. This prevents accidental interruptions and projects calm poise.',
            'Keyword Anchoring: Note 2–3 exact words the speaker emphasized so your reply directly mirrors their priorities.',
          ],
        },
        {
          heading: '3. Reading Non-Verbal Cues',
          body: 'Over half of conversational clarity comes from pacing, posture, and micro-reactions. Watch for shifts in energy when you explain a project: leaning forward signals curiosity (expand slightly), while glancing down or checking time signals you should land your point cleanly.',
        },
      ],
    },
    practicalExercise: {
      title: 'Active Listening & RASA Observation Log',
      scenario:
        'Conduct one 10-minute intentional conversation this week (with a teacher, peer, counselor, or family member) where your primary goal is to practice all four steps of RASA without checking your phone or interrupting.',
      selfCheckCriteria: [
        'Eliminated Digital Distractions (phone away, notifications silenced)',
        'Applied All 4 RASA Steps (Receive, Appreciate, Summarize, Ask)',
        'Asked at Least One Non-Leading Open Question',
      ],
      fields: [
        {
          key: 'contextRole',
          label: 'Conversation Context & Listener Role',
          placeholder: 'e.g., 10-minute project check-in with my robotics teammate over Zoom...',
          type: 'text',
        },
        {
          key: 'receiveNotes',
          label: 'Receive & Appreciate: Distractions Removed & Non-Verbal Cues Observed',
          placeholder: 'Describe the distractions you removed and 2 non-verbal cues you noticed from the speaker.',
          type: 'textarea',
        },
        {
          key: 'summarizeStatement',
          label: 'Summarize: Exact Paraphrase You Used',
          placeholder: 'Write the exact 1–2 sentence summary you spoke back to confirm understanding.',
          type: 'textarea',
        },
        {
          key: 'askQuestion',
          label: 'Ask: Open-Ended Follow-Up Question & Impact',
          placeholder: 'What open-ended question did you ask, and how did it deepen the conversation?',
          type: 'textarea',
        },
      ],
    },
  },
  {
    weekNumber: 2,
    title: 'Structured Spontaneous Speaking',
    lecture: {
      title: '5 ways to listen better (Summarize & Ask Application)',
      speaker: 'TED — Julian Treasure',
      url: 'https://www.youtube.com/watch?v=cSohjlYQI2A',
      youtubeId: 'cSohjlYQI2A',
      duration: '8 min',
      focusNote:
        'Revisit the Summarize and Ask steps as bridges into purposeful, non-rambling interview responses.',
    },
    readingGuide: {
      title: 'Structuring Verbal Thoughts on the Spot',
      readTime: '7 min read',
      summary:
        'When an admissions interviewer asks an unexpected question, rambling happens when you think out loud without a container. Learn two repeatable speaking architectures that keep answers crisp under 90 seconds.',
      sections: [
        {
          heading: '1. The PREP Framework (45–60s Opinion & Interview Answers)',
          body: 'Use PREP whenever you need to take a clear stance, defend a choice, or answer "Why this major / Why this university?"',
          frameworkLabel: 'PREP Architecture',
          frameworkItems: [
            {
              term: 'P — Point',
              detail: 'State your direct thesis in one clear headline sentence. Never bury your conclusion.',
            },
            {
              term: 'R — Reason',
              detail: 'Give the core "why" behind your point in 1–2 logical sentences.',
            },
            {
              term: 'E — Example',
              detail: 'Anchor the reason with one concrete, specific micro-story, project, or metric.',
            },
            {
              term: 'P — Point (Restated)',
              detail: 'Close cleanly by tying your example back to your headline so the listener knows you are done.',
            },
          ],
        },
        {
          heading: '2. What – So What – Now What (60–90s Reflection Arc)',
          body: 'Use this 3-part reflection arc for behavioral prompts ("Tell me about a challenge or leadership moment"):',
          frameworkLabel: 'Reflection Arc',
          frameworkItems: [
            {
              term: 'What (20% of time)',
              detail: 'Set the scene in 2 sentences max—avoid long chronological backstory.',
            },
            {
              term: 'So What (45% of time)',
              detail: 'Explain the insight, trade-off, or personal realization you gained.',
            },
            {
              term: 'Now What (35% of time)',
              detail: 'Show how that insight changes your actions, goals, or future contribution on campus.',
            },
          ],
        },
        {
          heading: '3. Eliminating the "Ramble Spiral"',
          body: 'Two rules protect time discipline: (1) Decide your ending sentence before you start speaking, and (2) Stop talking the moment you finish your closing Point instead of adding "so yeah, that\'s basically it."',
        },
      ],
    },
    practicalExercise: {
      title: 'The Mock Alumni Interview Drill',
      scenario:
        'You are in a 15-minute university alumni interview and must answer two classic prompts under 90 seconds each without rambling: Prompt A (Opinion/Fit via PREP) and Prompt B (Challenge/Growth via What–So What–Now What).',
      selfCheckCriteria: [
        'Direct Opening (no throat-clearing or "That\'s a great question" filler)',
        'Concrete Example (specific project, moment, or measurable outcome included)',
        'Time Discipline (<60s PREP, <90s Reflection)',
      ],
      fields: [
        {
          key: 'promptAPoint',
          label: 'Prompt A — 1-Sentence Point',
          placeholder: 'e.g., I want to study Environmental Engineering because I want to redesign urban stormwater systems.',
          type: 'text',
        },
        {
          key: 'promptAExample',
          label: 'Prompt A — Concrete Example (Reason + Specific Evidence)',
          placeholder: 'Summarize the specific example or project that proves your Point in 45–60 seconds.',
          type: 'textarea',
        },
        {
          key: 'promptBWhat',
          label: 'Prompt B — What Happened (2 sentences max)',
          placeholder: 'Describe the situation or setback in at most two crisp sentences.',
          type: 'textarea',
        },
        {
          key: 'promptBSoNow',
          label: 'Prompt B — So What & Now What',
          placeholder: 'Explain what you learned and how it shapes what you will do next.',
          type: 'textarea',
        },
        {
          key: 'selfCritique',
          label: 'Self-Critique (Pacing, Clarity & Timing)',
          placeholder: 'Time your spoken delivery. Where did you hesitate or add unnecessary backstory?',
          type: 'textarea',
        },
      ],
    },
  },
  {
    weekNumber: 3,
    title: 'Audience-Centered Academic & Outreach Writing',
    lecture: {
      title: 'The Secret to Business Writing: Crash Course Business - Soft Skills #3',
      speaker: 'CrashCourse',
      url: 'https://thecrashcourse.com/courses/the-secret-to-business-writing-crash-course-business-soft-skills-3/',
      duration: '10 min',
      focusNote:
        'Notice how clarity, brevity, and knowing your reader determine whether busy professors or admissions officers actually reply.',
    },
    readingGuide: {
      title: 'Audience-Centered Academic & Outreach Writing',
      readTime: '7 min read',
      summary:
        'Busy professors, internship mentors, and admissions counselors scan emails in 8 seconds. Writing for your reader—not for yourself—dramatically raises response rates.',
      sections: [
        {
          heading: '1. The 3-Question Audience Filter',
          body: 'Before drafting any academic or outreach email, answer three questions from the reader\'s point of view:',
          bullets: [
            'Who is reading this, and what is their current time pressure?',
            'What specific decision or action am I asking them to make?',
            'Why should they care right now (what connects my background to their work)?',
          ],
        },
        {
          heading: '2. BLUF: Bottom Line Up Front',
          body: 'Academic outreach fails when students spend two paragraphs introducing their life story before stating why they wrote. Reverse the pyramid with BLUF:',
          frameworkLabel: 'BLUF Email Architecture',
          frameworkItems: [
            {
              term: 'Specific Subject Line',
              detail: 'State role + topic + concrete ask (e.g., "High School Junior — Question on Urban Heat Paper / 15-Min Call").',
            },
            {
              term: 'BLUF Opening (Sentences 1–2)',
              detail: 'State who you are and your exact request immediately.',
            },
            {
              term: 'Credibility Bridge (2–3 Sentences)',
              detail: 'Reference one genuine connection to their work plus one brief proof point from yours.',
            },
            {
              term: 'Low-Friction Close (1 Sentence)',
              detail: 'Offer two concrete time windows or make it effortless to say yes or redirect.',
            },
          ],
        },
      ],
    },
    practicalExercise: {
      title: 'The Cold Outreach Email Makeover',
      scenario:
        'You want to request a 15-minute informational call or summer shadowing opportunity with a university professor or industry mentor. First write an unedited long draft, then transform it using BLUF.',
      selfCheckCriteria: [
        'Specific Subject Line (not "Hello" or "Quick Question")',
        'BLUF Opening (core ask appears within the first 2 sentences)',
        'Under 120 Words in final Draft 2 email body',
      ],
      fields: [
        {
          key: 'draft1',
          label: 'Draft 1 (Unedited, 180–220 words)',
          placeholder: 'Write your natural, unedited first attempt before applying BLUF.',
          type: 'textarea',
          showWordCount: true,
          hint: 'Target: 180–220 words',
        },
        {
          key: 'draft2Subject',
          label: 'Draft 2 Subject Line',
          placeholder: 'Write a concise, specific subject line.',
          type: 'text',
        },
        {
          key: 'draft2Body',
          label: 'Draft 2 BLUF Email (<120 words)',
          placeholder: 'Rewrite using BLUF opening, tailored relevance, and a low-friction close.',
          type: 'textarea',
          showWordCount: true,
          hint: 'Target: Strictly under 120 words',
        },
        {
          key: 'threeEdits',
          label: '3 Specific Edits Made & Why',
          placeholder: '1) Cut... because...\n2) Moved... to the opening because...\n3) Replaced... with...',
          type: 'textarea',
        },
      ],
    },
  },
  {
    weekNumber: 4,
    title: 'Tone, Persuasion, and Digital Etiquette',
    lecture: {
      title: 'The Secret to Business Writing (Tone & Etiquette Application)',
      speaker: 'CrashCourse',
      url: 'https://thecrashcourse.com/courses/the-secret-to-business-writing-crash-course-business-soft-skills-3/',
      duration: '10 min',
      focusNote:
        'Focus on how register, empathy, and precision prevent misunderstandings when communicating under deadline pressure.',
    },
    readingGuide: {
      title: 'Tone, Persuasion, and Digital Etiquette',
      readTime: '6 min read',
      summary:
        'Digital text strips away facial expression and vocal warmth. Knowing how to calibrate register—and resolve tension without blame—separates mature leaders from defensive writers.',
      sections: [
        {
          heading: '1. Calibrating Register: Formal vs. Semi-Formal vs. Chat',
          body: 'Choose your register based on relationship hierarchy and stakes:',
          frameworkLabel: 'Three Registers',
          frameworkItems: [
            {
              term: 'Formal',
              detail: 'For instructors, admissions offices, and external mentors. Complete sentences, clear greeting/sign-off, zero slang or emoji.',
            },
            {
              term: 'Semi-Formal',
              detail: 'For peers, project collaborators, and club teams. Warm, concise, solution-oriented, respectful of boundaries.',
            },
            {
              term: 'Chat',
              detail: 'For quick logistics among close teammates. Keep actionable details explicit so nothing gets lost.',
            },
          ],
        },
        {
          heading: '2. Fixing Common Tone Traps & The 60-Second Pre-Send Audit',
          body: 'Passive-aggressive phrasing ("As I already mentioned...", "Per my last email...") damages trust instantly. Run a 60-second audit before hitting Send:',
          bullets: [
            'Blame Check: Replace "You forgot to..." with "Our milestone is currently missing X; here is how we can close it by [time]."',
            'Explicit Dates & Times: Never write "soon" or "this week"—specify day, date, and timezone.',
            'Read-Aloud Test: Read the draft out loud once. If any sentence sounds sharp or ambiguous, soften the framing while keeping the deadline firm.',
          ],
        },
      ],
    },
    practicalExercise: {
      title: 'High-Stakes Tone Calibration Makeover',
      scenario:
        'A teammate missed an internal deadline, delaying your group submission by 2 days. Write two calibrated messages: a formal accountability update to your instructor and a constructive semi-formal message to your teammate.',
      selfCheckCriteria: [
        'Zero Blame-Shifting (takes shared ownership and focuses on resolution)',
        'Appropriate Register (Formal for Instructor, Semi-Formal for Teammate)',
        'Explicit Dates/Times stated in both messages',
      ],
      fields: [
        {
          key: 'instructorEmail',
          label: 'Email to Instructor (90–120 words, formal BLUF)',
          placeholder: 'Write the formal BLUF update to your instructor with revised submission date and ownership.',
          type: 'textarea',
          showWordCount: true,
          hint: 'Target: 90–120 words',
        },
        {
          key: 'teammateMessage',
          label: 'Message to Teammate (60–80 words, semi-formal)',
          placeholder: 'Write a calm, constructive message aligning on exact handoff steps and timing.',
          type: 'textarea',
          showWordCount: true,
          hint: 'Target: 60–80 words',
        },
        {
          key: 'preSendAudit',
          label: 'Pre-Send Audit Reflection',
          placeholder: 'What phrasing did you adjust during your 60-second audit to remove defensiveness or ambiguity?',
          type: 'textarea',
        },
      ],
    },
  },
  {
    weekNumber: 5,
    title: 'Overcoming Stage Fright & Vocal Control',
    lecture: {
      title: 'How to Speak With Confidence: Crash Course Business - Soft Skills #4',
      speaker: 'CrashCourse',
      url: 'https://www.youtube.com/watch?v=sjdxUiAJ0UQ',
      youtubeId: 'sjdxUiAJ0UQ',
      duration: '10 min',
      focusNote:
        'Observe physical grounding, breathing mechanics, and why deliberate silence beats filler words.',
    },
    readingGuide: {
      title: 'Overcoming Stage Fright & Vocal Control',
      readTime: '7 min read',
      summary:
        'Stage fright is a physiological adrenaline spike—not a character flaw. By regulating breath, posture, and vocal cadence, you convert nervous energy into grounded authority.',
      sections: [
        {
          heading: '1. Physiological Reset: Box Breathing & Grounding Posture',
          body: 'Two minutes before speaking, calm your nervous system mechanically:',
          bullets: [
            '4-4-4-4 Box Breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 cycles to lower heart rate.',
            'Grounding Posture: Stand or sit with shoulder blades relaxed down, feet shoulder-width apart, and chin parallel to the floor.',
            '2-Second Pause Rule: When you finish a key point—or lose your train of thought—hold clean silence for up to 2 seconds. To the audience, silence reads as poise, never panic.',
          ],
        },
        {
          heading: '2. S.U.C.C.E.S. Preparation Filter & Vocal Delivery Toolkit',
          body: 'Keep your message memorable using S.U.C.C.E.S. (Simple, Unexpected, Concrete, Credible, Emotional, Stories), then deliver it with intentional vocal control:',
          frameworkLabel: 'Vocal Delivery Toolkit',
          frameworkItems: [
            {
              term: 'Pace',
              detail: 'Aim for ~130–150 words per minute. Slow down slightly on thesis statements and numbers.',
            },
            {
              term: 'Filler Words',
              detail: 'Replace "um", "uh", "like", and "basically" with closed-mouth pauses.',
            },
            {
              term: 'Volume & Inflection',
              detail: 'Project to the back row (or across the room) and avoid upspeak—let statements land downward.',
            },
          ],
        },
      ],
    },
    practicalExercise: {
      title: 'The 60-Second Impromptu & Filler-Word Drill',
      scenario:
        'Record three 60-second impromptu talks on everyday topics (two takes each). Count your filler words in Take 1, do a 2-minute box-breathing reset, and replace filler words with 1–2 second composed silence in Take 2.',
      selfCheckCriteria: [
        'Pre-Talk Reset completed (2 min 4-4-4-4 box breathing)',
        'Filler-Word Reduction achieved (≥50% drop from Take 1 to Take 2)',
        'Vocal Pacing maintained without rushing endings',
      ],
      fields: [
        {
          key: 'topic1',
          label: 'Topic 1 & Filler Count (Take 1 vs. Take 2)',
          placeholder: 'Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...',
          type: 'text',
        },
        {
          key: 'topic2',
          label: 'Topic 2 & Filler Count (Take 1 vs. Take 2)',
          placeholder: 'Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...',
          type: 'text',
        },
        {
          key: 'topic3',
          label: 'Topic 3 & Filler Count (Take 1 vs. Take 2)',
          placeholder: 'Topic: ... | Take 1 fillers: ... | Take 2 fillers: ...',
          type: 'text',
        },
        {
          key: 'pauseReflection',
          label: 'Reflection on 2-Second Pauses',
          placeholder: 'How did substituting 1–2s silence for filler words feel, and how did your pacing change?',
          type: 'textarea',
        },
      ],
    },
  },
  {
    weekNumber: 6,
    title: 'Delivering a Core-Idea Presentation',
    lecture: {
      title: "TED's secret to great public speaking",
      speaker: 'TED — Chris Anderson',
      url: 'https://www.youtube.com/watch?v=-FOCpMAww28',
      youtubeId: '-FOCpMAww28',
      duration: '8 min',
      focusNote:
        'Learn how Chris Anderson defines a single "throughline" idea worth sharing and builds every slide and story around it.',
    },
    readingGuide: {
      title: 'Crafting & Delivering a Core-Idea Presentation',
      readTime: '7 min read',
      summary:
        'Great presentations do not cram an entire resume into 3 minutes—they plant one unforgettable idea in the listener\'s mind using vivid analogies, minimalist slides, and disciplined pacing.',
      sections: [
        {
          heading: '1. The 1-Sentence Throughline & Minimalist Slides',
          body: 'Every compelling talk is built on a single organizing spine:',
          bullets: [
            '1-Sentence Throughline: Summarize your entire presentation in one clear claim of ≤20 words. If a story or slide doesn\'t serve that sentence, cut it.',
            'Analogies & Concrete Imagery: Bridge unfamiliar technical topics to everyday intuition with a crisp comparison.',
            '15-Second Hook: Open with a surprising fact, vivid micro-scene, or provocative question—never "Hi, today I\'m going to talk about..."',
            'Minimalist Slides (10–15 Words Max): Slides are visual anchors, not teleprompters. Use max 10–15 words or one clean chart/image per slide.',
          ],
        },
        {
          heading: '2. The 3-Minute Talk Blueprint',
          body: 'Structure short admissions pitches, scholarship panels, or leadership talks along these exact timestamps:',
          frameworkLabel: '3-Minute Blueprint',
          frameworkItems: [
            {
              term: '0:00 – 0:25 | Hook',
              detail: 'Capture attention in 15–25 seconds and state your 1-sentence throughline.',
            },
            {
              term: '0:25 – 2:20 | Core Idea + Story',
              detail: 'Develop one vivid story, analogy, or evidence arc proving why the idea matters.',
            },
            {
              term: '2:20 – 3:00 | Close',
              detail: 'Deliver a memorable takeaway and clear call-to-action or future impact statement.',
            },
          ],
        },
      ],
    },
    practicalExercise: {
      title: "The 3-Minute Admissions 'Passion Project' Pitch",
      scenario:
        'Pitch a personal project or leadership initiative to a scholarship or club panel in 2:45–3:15 using only a 3-bullet cue card and zero memorized script.',
      selfCheckCriteria: [
        'Strong Hook delivered within 0:00–0:25',
        'Single Core Idea sustained without drifting into unrelated resume items',
        'Presence & Eye Contact maintained with zero script-reading',
      ],
      fields: [
        {
          key: 'throughline',
          label: 'Your 1-Sentence Throughline',
          placeholder: 'Write the single core idea your entire 3-minute pitch builds around.',
          type: 'text',
        },
        {
          key: 'cueCard',
          label: 'Your 3-Bullet Cue Card',
          placeholder: '• Hook (0:00–0:25): ...\n• Core Story/Evidence (0:25–2:20): ...\n• Close (2:20–3:00): ...',
          type: 'textarea',
        },
        {
          key: 'videoLengthAndScores',
          label: 'Video Length & Self-Score (1–5 on Hook, Clarity, Pacing, Posture)',
          placeholder: 'Duration: e.g., 2:58 | Hook: /5 | Clarity: /5 | Pacing: /5 | Posture: /5',
          type: 'text',
        },
        {
          key: 'secondTakeImprovement',
          label: 'One Thing to Improve in a Second Take',
          placeholder: 'Identify the single highest-impact refinement for your next rehearsal.',
          type: 'textarea',
        },
      ],
    },
  },
];

export const SUBJECT_1_FINAL_TEST: {
  timeLimitMinutes: number;
  passingThreshold: number;
  mcqQuestions: LaunchpadMCQ[];
  situationalQuestions: LaunchpadSituationalPrompt[];
} = {
  timeLimitMinutes: 20,
  passingThreshold: 75,
  mcqQuestions: [
    {
      id: 'q1',
      weekRef: 1,
      question: 'In Julian Treasure\'s RASA active listening framework, what does the "S" stand for?',
      options: [
        'Speak firmly when your turn arrives',
        'Summarize what you heard to confirm alignment',
        'Simplify your own talking points',
        'Silence your personal opinions permanently',
      ],
      correctIndex: 1,
      explanation: 'RASA stands for Receive, Appreciate, Summarize, and Ask.',
    },
    {
      id: 'q2',
      weekRef: 1,
      question: 'During a virtual alumni interview, what is the best habit immediately after the interviewer finishes a question?',
      options: [
        'Begin speaking instantly so there is zero silence',
        'Ask them to repeat the question while you formulate a story',
        'Take a calm 1-second buffer to process key words before answering',
        'Look down at your written script for 10 seconds',
      ],
      correctIndex: 2,
      explanation: 'A 1-second buffer prevents interruptions and projects composed presence.',
    },
    {
      id: 'q3',
      weekRef: 2,
      question: 'In the PREP speaking structure, what should your very first sentence do?',
      options: [
        'Give chronological background context from 9th grade',
        'State your direct Point / thesis clearly',
        'Thank the interviewer for asking such an insightful question',
        'List three unrelated extracurricular awards',
      ],
      correctIndex: 1,
      explanation: 'PREP begins directly with your Point (thesis), followed by Reason, Example, and Point.',
    },
    {
      id: 'q4',
      weekRef: 2,
      question: 'For a 60–90 second behavioral reflection using "What – So What – Now What", where should the largest share of speaking time go?',
      options: [
        'Describing every chronological detail of What happened',
        'Listing teammates\' names and schedules',
        'The "So What" insight and "Now What" future application',
        'Repeating your opening disclaimer',
      ],
      correctIndex: 2,
      explanation: 'Keep "What" to ~2 sentences max so ~80% of time highlights insight (So What) and forward impact (Now What).',
    },
    {
      id: 'q5',
      weekRef: 3,
      question: 'What does BLUF stand for in effective outreach writing?',
      options: [
        'Build Longer Useful Footnotes',
        'Bottom Line Up Front',
        'Brief Letter Under Five-hundred words',
        'Bold Language Usually Fails',
      ],
      correctIndex: 1,
      explanation: 'BLUF places your core ask or conclusion in the opening 1–2 sentences.',
    },
    {
      id: 'q6',
      weekRef: 3,
      question: 'Which cold outreach subject line best follows Week 3 best practices?',
      options: [
        'Hello!',
        'Quick Question',
        'High School Senior — Question on Microplastic Filtration Paper / 15-Min Call',
        'Urgent Please Read Immediately',
      ],
      correctIndex: 2,
      explanation: 'A strong subject line specifies sender context, topic relevance, and the exact request.',
    },
    {
      id: 'q7',
      weekRef: 3,
      question: 'What is the ideal target word limit for a cold outreach email to a busy professor or mentor?',
      options: [
        'Under 120 words',
        '300–400 words with full resume attached',
        'At least 500 words explaining your life story',
        '15 words with no greeting',
      ],
      correctIndex: 0,
      explanation: 'Concise BLUF outreach emails under 120 words respect the reader\'s time and earn higher reply rates.',
    },
    {
      id: 'q8',
      weekRef: 4,
      question: 'A teammate missed an internal deadline and delayed your group project. Which phrasing passes the Pre-Send Audit?',
      options: [
        '"As I already reminded you twice, you made us late."',
        '"I need you to fix your mistake immediately."',
        '"Our final section is still open; can we sync at 5:00 PM today so we submit by Thursday 6:00 PM?"',
        '"We\'ll submit sometime soon whenever you get around to it."',
      ],
      correctIndex: 2,
      explanation: 'Zero blame-shifting, constructive tone, and explicit dates/times pass the Pre-Send Audit.',
    },
    {
      id: 'q9',
      weekRef: 4,
      question: 'Which communication register is appropriate when emailing a university admissions office or course instructor?',
      options: [
        'Chat register with casual abbreviations',
        'Formal register with complete sentences and clear greeting/sign-off',
        'Voice-note shorthand',
        'Sarcastic humor to stand out',
      ],
      correctIndex: 1,
      explanation: 'External officials and instructors require a formal register.',
    },
    {
      id: 'q10',
      weekRef: 5,
      question: 'How should you replace filler words ("um", "like", "uh") during an impromptu talk?',
      options: [
        'Speak twice as fast so fillers aren\'t noticeable',
        'Use a 1–2 second closed-mouth composed pause',
        'Say "basically" instead of "um"',
        'Apologize aloud whenever you pause',
      ],
      correctIndex: 1,
      explanation: 'A 1–2 second composed pause projects confidence and eliminates verbal clutter.',
    },
    {
      id: 'q11',
      weekRef: 5,
      question: 'What is the timing cadence for the pre-talk Box Breathing reset?',
      options: [
        '10s inhale, 2s exhale',
        '4s inhale, 4s hold, 4s exhale, 4s hold',
        'Rapid shallow breaths for 30 seconds',
        'Hold breath for 20 seconds before speaking',
      ],
      correctIndex: 1,
      explanation: '4-4-4-4 Box Breathing regulates heart rate and nerves before speaking.',
    },
    {
      id: 'q12',
      weekRef: 6,
      question: 'According to Chris Anderson\'s TED framework, what is a presentation\'s "throughline"?',
      options: [
        'The decorative transition animation between slides',
        'The single connecting core idea that every story and example serves',
        'A word-for-word memorized script',
        'The Q&A period at the end of a talk',
      ],
      correctIndex: 1,
      explanation: 'A throughline is the single 1-sentence core idea unifying the entire presentation.',
    },
    {
      id: 'q13',
      weekRef: 6,
      question: 'What is the recommended maximum text density on minimalist presentation slides?',
      options: [
        '10–15 words max per slide',
        '150 words so the audience can read ahead',
        'Full paragraphs copied from your essay',
        'At least 6 bullet points of 20 words each',
      ],
      correctIndex: 0,
      explanation: 'Slides act as visual anchors (10–15 words max), never teleprompters.',
    },
    {
      id: 'q14',
      weekRef: 6,
      question: 'In the 3-Minute Talk Blueprint, what happens between 0:00 and 0:25?',
      options: [
        'Full Q&A and citations',
        'Hook + clear introduction of your core idea',
        'Reading your resume timeline',
        'Closing summary',
      ],
      correctIndex: 1,
      explanation: '0:00–0:25 delivers your 15-second hook and sets up the core idea.',
    },
  ],
  situationalQuestions: [
    {
      id: 'sit1',
      title: 'Situational Response 1 — BLUF Outreach Rewrite',
      scenario:
        'You want to ask Dr. Meera Patel (a Biomedical AI researcher) for a 15-minute informational chat after reading her paper on low-cost retinal screening.',
      prompt:
        'Write a complete outreach email (Subject + Body, under 120 words total) applying the BLUF framework.',
      minWords: 35,
      rubricKeywords: ['subject', '15', 'minute', 'retinal', 'research', 'call', 'chat', 'thank', 'schedule'],
      rubricGuidance:
        'Include a specific Subject line, state your ask in the first 2 sentences, reference her retinal screening paper, and close with a specific low-friction time option.',
    },
    {
      id: 'sit2',
      title: 'Situational Response 2 — PREP Interview Answer',
      scenario:
        'An alumni interviewer asks: "Which high school project are you proudest of, and why?"',
      prompt:
        'Write a crisp 45–60 second spoken response script (50–110 words) structured strictly with PREP (Point, Reason, Example, Point).',
      minWords: 40,
      rubricKeywords: ['because', 'for example', 'built', 'created', 'led', 'learned', 'impact', 'result'],
      rubricGuidance:
        'Open directly with a 1-sentence Point, explain the Reason, give a concrete Example with an outcome, and end by restating your Point.',
    },
  ],
};

export function buildDefaultLaunchpadSubjects(): LaunchpadSubject[] {
  return LAUNCHPAD_SUBJECTS.map((s) => ({
    ...s,
    iconKey: s.iconKey || s.id,
    passingThreshold: s.passingThreshold ?? 75,
    certificateTitle: s.certificateTitle || `Launchpad Certified — ${s.title}`,
    isArchived: false,
  }));
}

export function buildDefaultLaunchpadChapters(): LaunchpadWeekModule[] {
  return SUBJECT_1_WEEKS.map((w) => ({
    ...w,
    id: `comm-public-speaking__w${w.weekNumber}`,
    subjectId: 'comm-public-speaking',
    learningObjectives: w.learningObjectives || [w.readingGuide.summary],
    practicalExercise: {
      ...w.practicalExercise,
      allowFileUpload: w.practicalExercise.allowFileUpload ?? true,
    },
  }));
}

export function buildDefaultCertQuestions(): LaunchpadCertQuestionRecord[] {
  const mcqs: LaunchpadCertQuestionRecord[] = SUBJECT_1_FINAL_TEST.mcqQuestions.map((q, idx) => ({
    id: `comm-public-speaking__${q.id}`,
    subjectId: 'comm-public-speaking',
    questionType: 'mcq',
    sortOrder: idx + 1,
    payload: { ...q, subjectId: 'comm-public-speaking', sortOrder: idx + 1 },
  }));
  const sit: LaunchpadCertQuestionRecord[] = SUBJECT_1_FINAL_TEST.situationalQuestions.map((q, idx) => ({
    id: `comm-public-speaking__${q.id}`,
    subjectId: 'comm-public-speaking',
    questionType: 'situational',
    sortOrder: mcqs.length + idx + 1,
    payload: { ...q, subjectId: 'comm-public-speaking', sortOrder: mcqs.length + idx + 1 },
  }));
  return [...mcqs, ...sit];
}

