"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { usePackageStore } from "@/lib/store/package";
import {
  PERSONALITY_PROFILES,
  usePersonalityStore,
  type PersonalityType,
} from "@/lib/store/personality";
import type { Offer } from "@/lib/api/contracts";

interface PersonalityTestCardProps {
  offers: Offer[];
  onApplyResult?: () => void;
}

interface QuizOption {
  id: string;
  label: string;
  caption?: string;
  imageUrl: string;
  scores: Partial<Record<PersonalityType, number>>;
}

interface QuizQuestion {
  hasCaptions: boolean;
  options: [QuizOption, QuizOption];
}

const QUESTIONS: QuizQuestion[] = [
  {
    hasCaptions: true,
    options: [
      {
        id: "sunrise-hike",
        label: "Mountain air",
        caption: "Boots on, calendar off.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-sunrise-hike/700/700",
        scores: { adventurous: 3, growth: 1 },
      },
      {
        id: "long-table",
        label: "Shared dinner",
        caption: "The table gets louder in the best way.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-long-table/700/700",
        scores: { social: 3, adventurous: 1 },
      },
    ],
  },
  {
    hasCaptions: false,
    options: [
      {
        id: "quiet-bookshop",
        label: "Bookshop",
        imageUrl: "https://picsum.photos/seed/perx-quiz-bookshop/700/700",
        scores: { introverted: 3, growth: 1 },
      },
      {
        id: "language-class",
        label: "Classroom",
        imageUrl: "https://picsum.photos/seed/perx-quiz-language-class/700/700",
        scores: { growth: 3, social: 1 },
      },
    ],
  },
  {
    hasCaptions: true,
    options: [
      {
        id: "coast-road",
        label: "Coast road",
        caption: "New view, new snack, questionable playlist.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-coast-road/700/700",
        scores: { adventurous: 3, social: 1 },
      },
      {
        id: "spa-reset",
        label: "Steam room",
        caption: "Low volume, high reset.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-steam-room/700/700",
        scores: { introverted: 2, growth: 1 },
      },
    ],
  },
  {
    hasCaptions: false,
    options: [
      {
        id: "coworking",
        label: "Coworking",
        imageUrl: "https://picsum.photos/seed/perx-quiz-coworking/700/700",
        scores: { social: 2, growth: 1 },
      },
      {
        id: "notebook",
        label: "Notebook",
        imageUrl: "https://picsum.photos/seed/perx-quiz-notebook-stack/700/700",
        scores: { growth: 3, introverted: 1 },
      },
    ],
  },
  {
    hasCaptions: true,
    options: [
      {
        id: "cinema-night",
        label: "Cinema night",
        caption: "Big screen, popcorn math, zero emails.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-cinema-night/700/700",
        scores: { social: 2, introverted: 1 },
      },
      {
        id: "health-check",
        label: "Health reset",
        caption: "Future-you likes this practical plot twist.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-health-check/700/700",
        scores: { growth: 2, introverted: 1 },
      },
    ],
  },
  {
    hasCaptions: false,
    options: [
      {
        id: "festival-lights",
        label: "Festival lights",
        imageUrl: "https://picsum.photos/seed/perx-quiz-festival-lights/700/700",
        scores: { social: 3, adventurous: 1 },
      },
      {
        id: "early-train",
        label: "Early train",
        imageUrl: "https://picsum.photos/seed/perx-quiz-early-train/700/700",
        scores: { adventurous: 3, growth: 1 },
      },
    ],
  },
  {
    hasCaptions: true,
    options: [
      {
        id: "grocery-basket",
        label: "Good groceries",
        caption: "Comfort, cooked properly.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-groceries/700/700",
        scores: { introverted: 2, growth: 1 },
      },
      {
        id: "ride-credit",
        label: "Ride credit",
        caption: "Less friction between plans.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-ride-credit/700/700",
        scores: { social: 2, adventurous: 1 },
      },
    ],
  },
  {
    hasCaptions: false,
    options: [
      {
        id: "massage-room",
        label: "Massage",
        imageUrl: "https://picsum.photos/seed/perx-quiz-massage-room/700/700",
        scores: { introverted: 3 },
      },
      {
        id: "cooking-table",
        label: "Lunch",
        imageUrl: "https://picsum.photos/seed/perx-quiz-cooking-table/700/700",
        scores: { social: 2, adventurous: 1 },
      },
    ],
  },
  {
    hasCaptions: true,
    options: [
      {
        id: "new-skill",
        label: "New skill",
        caption: "Something that compounds after the perk is gone.",
        imageUrl: "https://picsum.photos/seed/perx-quiz-new-skill/700/700",
        scores: { growth: 3 },
      },
      {
        id: "new-place",
        label: "New place",
        caption: "A better answer to 'what did you do?'",
        imageUrl: "https://picsum.photos/seed/perx-quiz-new-place/700/700",
        scores: { adventurous: 3 },
      },
    ],
  },
  {
    hasCaptions: false,
    options: [
      {
        id: "quiet-window",
        label: "Quiet window",
        imageUrl: "https://picsum.photos/seed/perx-quiz-quiet-window/700/700",
        scores: { introverted: 3, growth: 1 },
      },
      {
        id: "group-toast",
        label: "Group toast",
        imageUrl: "https://picsum.photos/seed/perx-quiz-group-toast/700/700",
        scores: { social: 3 },
      },
    ],
  },
];

const PROFILE_ORDER: PersonalityType[] = ["adventurous", "social", "introverted", "growth"];

const PROFILE_DETAILS: Record<PersonalityType, { intro: string; why: string[]; doodle: string }> = {
  adventurous: {
    intro: "You are happiest when a perk opens a door, changes the scenery, or gives the week a story worth retelling.",
    why: ["you choose motion over routine", "you like rewards with a little discovery", "you turn benefits into experiences"],
    doodle: "M4 17c5-8 10-11 16-13M6 16l3 3 2-5 4 2 3-6",
  },
  social: {
    intro: "You are a people-powered perk person. The best reward is easier to enjoy when it comes with a table, a plan, or a reason to gather.",
    why: ["you pick shared moments", "you value convenience around plans", "you make benefits feel communal"],
    doodle: "M5 15c2-4 5-4 7 0M12 15c2-4 5-4 7 0M8 8h.1M16 8h.1M9 12c2 2 4 2 6 0",
  },
  introverted: {
    intro: "You have a strong reset instinct. Your ideal perks create quiet, comfort, and enough space to feel like yourself again.",
    why: ["you choose calmer environments", "you prefer low-friction restoration", "you value perks that protect your energy"],
    doodle: "M5 6h14v10H5zM8 9h8M8 12h5M6 19c4-2 8-2 12 0",
  },
  growth: {
    intro: "You like a benefit with momentum. Courses, practical upgrades, and wellness habits all look good when they make tomorrow easier.",
    why: ["you pick perks with lasting value", "you like learning loops", "you balance care with self-improvement"],
    doodle: "M5 17c5-1 8-5 9-12M14 5v6h5M7 10l4 4 7-8",
  },
};

function getResult(answers: QuizOption[]): PersonalityType {
  const totals: Record<PersonalityType, number> = {
    adventurous: 0,
    social: 0,
    introverted: 0,
    growth: 0,
  };

  for (const answer of answers) {
    for (const type of PROFILE_ORDER) {
      totals[type] += answer.scores[type] ?? 0;
    }
  }

  return PROFILE_ORDER.reduce((winner, type) =>
    totals[type] > totals[winner] ? type : winner
  );
}

function Doodle({ type }: { type: PersonalityType }) {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="rgba(99,91,255,0.08)" />
      <path
        d={PROFILE_DETAILS[type].doodle}
        stroke="#010110"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkDoodle() {
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true">
      <path d="M31 31c16-18 48-12 52 14 4 27-26 43-48 31" stroke="#010110" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 74c8 11 23 18 41 11" stroke="#635bff" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 50h16M33 42v16M78 25l4 8 8 4-8 4-4 8-4-8-8-4 8-4z" stroke="#010110" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PersonalityTestCard({ offers, onApplyResult }: PersonalityTestCardProps) {
  const savedResult = usePersonalityStore((s) => s.result);
  const saveResult = usePersonalityStore((s) => s.saveResult);
  const clearResult = usePersonalityStore((s) => s.clearResult);
  const addLine = usePackageStore((s) => s.addLine);
  const packageLines = usePackageStore((s) => s.lines);

  const [expanded, setExpanded] = React.useState(Boolean(savedResult));
  const [started, setStarted] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<QuizOption[]>([]);
  const [revealOpen, setRevealOpen] = React.useState(false);
  const [instructionsOpen, setInstructionsOpen] = React.useState(false);

  const currentQuestion = QUESTIONS[step];
  const completed = Boolean(savedResult) && !started;
  const addedOfferIds = React.useMemo(
    () => new Set(packageLines.map((line) => line.offerId)),
    [packageLines]
  );
  const recommendedOffers = React.useMemo(() => {
    if (!savedResult) return [];
    return offers.filter((offer) => savedResult.recommendedCategories.includes(offer.category));
  }, [offers, savedResult]);

  const handleStart = React.useCallback(() => {
    setExpanded(true);
    setRevealOpen(false);
    setInstructionsOpen(true);
  }, []);

  const handleBeginQuiz = React.useCallback(() => {
    setStarted(true);
    setInstructionsOpen(false);
    setStep(0);
    setAnswers([]);
  }, []);

  const handleAnswer = React.useCallback((option: QuizOption) => {
    const nextAnswers = [...answers, option];
    if (step < QUESTIONS.length - 1) {
      setAnswers(nextAnswers);
      setStep((s) => s + 1);
      return;
    }

    const type = getResult(nextAnswers);
    const profile = PERSONALITY_PROFILES[type];
    saveResult({
      type,
      ...profile,
      completedAt: new Date().toISOString(),
    });
    setStarted(false);
    setAnswers([]);
    setStep(0);
    setRevealOpen(false);
    setInstructionsOpen(false);
    onApplyResult?.();
  }, [answers, onApplyResult, saveResult, step]);

  const handleRetake = React.useCallback(() => {
    clearResult();
    handleStart();
  }, [clearResult, handleStart]);

  return (
    <section
      aria-label="Picture personality test"
      style={{
        width: "100%",
        maxWidth: "100%",
        border: "1px solid rgba(1,1,16,0.12)",
        borderRadius: "8px",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        transition: "max-width 160ms ease",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          minHeight: expanded ? "auto" : "320px",
          padding: "22px",
          border: 0,
          backgroundColor: "#ffffff",
          color: "#010110",
          cursor: "pointer",
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: expanded ? "minmax(0, 1fr) 112px" : "1fr",
          gap: "18px",
          alignItems: "center",
        }}
      >
        <span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#73737c",
              marginBottom: "8px",
            }}
          >
            AI taste matcher
          </span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-display), Georgia, serif",
              fontVariationSettings: "'wght' 450, 'opsz' 28",
              fontSize: "26px",
              lineHeight: 1.12,
              letterSpacing: "-0.52px",
            }}
          >
            Let the perk oracle inspect your vibe.
          </span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "14px",
              lineHeight: 1.5,
              letterSpacing: "-0.28px",
              color: "#73737c",
              marginTop: "10px",
            }}
          >
            Pick between images and the AI system will assess your personality, then suggest services that match you best.
          </span>
        </span>
        <span style={{ justifySelf: expanded ? "end" : "start" }}>
          <SparkDoodle />
        </span>
      </button>

      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(1,1,16,0.08)",
            padding: "22px",
          }}
        >
          {!started && !completed && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
                gap: "24px",
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: "14px" }}>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "15px",
                    lineHeight: 1.65,
                    color: "#73737c",
                    margin: 0,
                    maxWidth: "690px",
                  }}
                >
                  Ten tiny image battles. Two choices each. The AI system reads the trail of what you pick, turns it into a personality profile, and then surfaces benefits that fit your habits, energy, and favorite kind of reward.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.55,
                    color: "#73737c",
                    margin: 0,
                    maxWidth: "640px",
                  }}
                >
                  It is part matcher, part fortune cookie, part very opinionated benefits assistant.
                </p>
                <div>
                  <Button variant="primary" onClick={handleStart}>
                    Start the vibe scan
                  </Button>
                </div>
              </div>
              <div
                aria-hidden="true"
                style={{
                  border: "1px solid rgba(1,1,16,0.12)",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  transform: "rotate(-1deg)",
                }}
              >
                {["map", "coffee", "book", "ticket"].map((seed) => (
                  <img
                    key={seed}
                    src={`https://picsum.photos/seed/perx-intro-${seed}/260/260`}
                    alt=""
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "8px" }}
                  />
                ))}
              </div>
            </div>
          )}

          {started && currentQuestion && (
            <div style={{ display: "grid", gap: "18px" }}>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#73737c",
                    margin: "0 0 8px",
                  }}
                >
                  {`Screen ${step + 1} of ${QUESTIONS.length}`}
                </p>
                <div
                  aria-hidden="true"
                  style={{
                    width: "100%",
                    height: "6px",
                    borderRadius: "100px",
                    backgroundColor: "rgba(1,1,16,0.08)",
                    overflow: "hidden",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      width: `${((step + 1) / QUESTIONS.length) * 100}%`,
                      height: "100%",
                      borderRadius: "100px",
                      backgroundColor: "#010110",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    style={{
                      border: "1px solid rgba(1,1,16,0.12)",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      overflow: "hidden",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={option.imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 11",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    {currentQuestion.hasCaptions && (
                      <span
                        style={{
                          display: "block",
                          padding: "14px 16px 16px",
                          minHeight: "82px",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-inter), sans-serif",
                            fontWeight: 700,
                            fontSize: "14px",
                            color: "#010110",
                            marginBottom: "4px",
                          }}
                        >
                          {option.label}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontFamily: "var(--font-inter), sans-serif",
                            fontSize: "13px",
                            lineHeight: 1.4,
                            color: "#73737c",
                          }}
                        >
                          {option.caption}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {completed && savedResult && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "96px minmax(0, 1fr) auto",
                gap: "18px",
                alignItems: "center",
              }}
            >
              <Doodle type={savedResult.type} />
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#73737c",
                    margin: "0 0 8px",
                  }}
                >
                  Analysis complete
                </p>
                <div
                  style={{
                    filter: revealOpen ? "none" : "blur(7px)",
                    userSelect: revealOpen ? "auto" : "none",
                    transition: "filter 160ms ease",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--font-display), Georgia, serif",
                      fontVariationSettings: "'wght' 450, 'opsz' 28",
                      fontSize: "28px",
                      lineHeight: 1.12,
                      letterSpacing: "-0.56px",
                      color: "#010110",
                      margin: "0 0 8px",
                    }}
                  >
                    {savedResult.title}
                  </h2>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "14px",
                      lineHeight: 1.55,
                      color: "#73737c",
                      margin: 0,
                      maxWidth: "680px",
                    }}
                  >
                    {PROFILE_DETAILS[savedResult.type].intro}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button variant="primary" onClick={() => setRevealOpen(true)}>
                  Reveal my matches
                </Button>
                <Button variant="ghost" onClick={handleRetake}>
                  Retake
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {instructionsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Personality test instructions"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            backgroundColor: "rgba(1,1,16,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setInstructionsOpen(false)}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(1,1,16,0.12)",
              padding: "28px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
              <SparkDoodle />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontVariationSettings: "'wght' 450, 'opsz' 32",
                fontSize: "32px",
                lineHeight: 1.1,
                letterSpacing: "-0.64px",
                color: "#010110",
                margin: "0 0 12px",
                textAlign: "center",
              }}
            >
              Go with the vibe.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "15px",
                lineHeight: 1.65,
                color: "#73737c",
                margin: "0 0 18px",
                textAlign: "center",
              }}
            >
              Choose what you feel in the moment. Do not overthink it. Some screens will give you little captions under the images, and some will stay caption-free so your instinct can do the talking.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={handleBeginQuiz}>
                Take the test
              </Button>
              <Button variant="ghost" onClick={() => setInstructionsOpen(false)}>
                Not yet
              </Button>
            </div>
          </div>
        </div>
      )}

      {revealOpen && savedResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Personality results and recommended perks"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            backgroundColor: "rgba(1,1,16,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setRevealOpen(false)}
        >
          <div
            style={{
              width: "min(920px, 100%)",
              maxHeight: "min(760px, calc(100vh - 48px))",
              overflowY: "auto",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(1,1,16,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid rgba(1,1,16,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "start" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <Doodle type={savedResult.type} />
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontWeight: 700,
                        fontSize: "11px",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "#73737c",
                        margin: "0 0 8px",
                      }}
                    >
                      Congratulations, your match is
                    </p>
                    <h2
                      style={{
                        fontFamily: "var(--font-display), Georgia, serif",
                        fontVariationSettings: "'wght' 450, 'opsz' 34",
                        fontSize: "34px",
                        lineHeight: 1.08,
                        letterSpacing: "-0.68px",
                        color: "#010110",
                        margin: 0,
                      }}
                    >
                      {savedResult.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRevealOpen(false)}
                  aria-label="Close results"
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "100px",
                    border: "1px solid rgba(1,1,16,0.15)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-inter), sans-serif",
                    color: "#010110",
                  }}
                >
                  x
                </button>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "15px",
                  lineHeight: 1.65,
                  color: "#73737c",
                  margin: "18px 0 0",
                  maxWidth: "760px",
                }}
              >
                {PROFILE_DETAILS[savedResult.type].intro} These benefits match you best because {PROFILE_DETAILS[savedResult.type].why.join(", ")}.
              </p>
            </div>

            <div style={{ padding: "24px" }}>
              <h3
                style={{
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontVariationSettings: "'wght' 450, 'opsz' 24",
                  fontSize: "24px",
                  lineHeight: 1.16,
                  letterSpacing: "-0.48px",
                  color: "#010110",
                  margin: "0 0 16px",
                }}
              >
                Benefits that fit your result
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
                  gap: "14px",
                }}
              >
                {recommendedOffers.map((offer) => {
                  const alreadyAdded = addedOfferIds.has(offer.id);
                  return (
                    <article
                      key={offer.id}
                      style={{
                        border: "1px solid rgba(1,1,16,0.12)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <img
                        src={offer.imageUrl}
                        alt=""
                        style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }}
                      />
                      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                        <p
                          style={{
                            fontFamily: "var(--font-inter), sans-serif",
                            fontWeight: 700,
                            fontSize: "10px",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: "#73737c",
                            margin: 0,
                          }}
                        >
                          {offer.provider.name}
                        </p>
                        <h4
                          style={{
                            fontFamily: "var(--font-display), Georgia, serif",
                            fontVariationSettings: "'wght' 450, 'opsz' 18",
                            fontSize: "19px",
                            lineHeight: 1.16,
                            letterSpacing: "-0.38px",
                            color: "#010110",
                            margin: 0,
                          }}
                        >
                          {offer.title}
                        </h4>
                        <p
                          style={{
                            fontFamily: "var(--font-inter), sans-serif",
                            fontSize: "13px",
                            lineHeight: 1.45,
                            color: "#73737c",
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {offer.description}
                        </p>
                        <div style={{ flex: 1, minHeight: "8px" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontFamily: "var(--font-inter), sans-serif",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "#010110",
                            }}
                          >
                            {formatMoney(offer.priceALL, "ALL")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={alreadyAdded}
                            onClick={() => addLine(offer)}
                            style={{ minWidth: "92px" }}
                          >
                            {alreadyAdded ? "In package" : "Add"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {recommendedOffers.length === 0 && (
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    color: "#73737c",
                    margin: "16px 0 0",
                  }}
                >
                  Recommendations are still loading. Close this window and reveal again in a moment.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
