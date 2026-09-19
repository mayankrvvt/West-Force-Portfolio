import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import "../../styles/chatbot.css";

/*
|--------------------------------------------------------------------------
| Welcome message
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This message is displayed to the user but is NOT sent to Gemini as
| conversation history.
|
*/

const WELCOME_MESSAGE = {
  role: "model",
  text:
    "Hi! I’m the WestForce AI Assistant. I can help with WestForce services, Canadian resumes, ATS preparation, jobs, interviews, and career questions. How can I help?",
};

/*
|--------------------------------------------------------------------------
| Generic local responses
|--------------------------------------------------------------------------
|
| These common questions are answered instantly.
| They do NOT consume Gemini requests.
|
| More specific questions automatically go to Gemini.
|
*/

const LOCAL_RESPONSES = [
  {
    test: /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening)\b/i,

    response:
      "Hello! 👋 I’m WestForce AI. I can help you with WestForce services, Canadian resumes, ATS preparation, jobs, interviews, and general career questions.",
  },

  {
    test: /^(who are you|what are you|what is westforce ai|tell me about yourself)\??$/i,

    response:
      "I’m WestForce AI, the career assistant for the WestForce platform. I can help you understand WestForce features and services, improve your resume, prepare for ATS screening, explore Canadian career opportunities, prepare for interviews, and answer general career questions.",
  },

  {
    test:
      /^(what can you do|how can you help|what do you help with|help me|what can i ask you)\??$/i,

    response:
      "I can help with:\n\n• Canadian-style resume preparation\n• ATS optimization\n• Resume improvement\n• Job-application guidance\n• Interview preparation\n• Canadian career questions\n• WestForce portfolio features\n• Professional portfolio preparation\n• General RCIP employment-support information\n• Career planning and job-search guidance\n\nFor more specific questions, I can use Gemini to provide a more detailed response.",
  },

  {
    test:
      /^(what is westforce|tell me about westforce|what does westforce do|what is westforce portfolio)\??$/i,

    response:
      "WestForce is a career and professional portfolio platform designed to help candidates present their professional profile, create and improve resumes, prepare for job applications, discover opportunities, prepare for interviews, and organize professional information in one place.",
  },

  {
    test:
      /^(what is an ats|what does ats mean|what is ats|ats meaning)\??$/i,

    response:
      "ATS stands for Applicant Tracking System. Many employers use ATS software to scan, organize, and filter job applications. An ATS-friendly resume generally uses clear headings, relevant job-specific keywords, simple formatting, readable sections, and content that accurately reflects your experience.",
  },

  {
    test:
      /^(what is a resume|what is cv|what is a cv|what is resume)\??$/i,

    response:
      "A resume is a concise professional document that presents your skills, education, experience, projects, achievements, and other relevant qualifications to an employer. For most applications, your resume should be tailored to the specific job rather than using exactly the same version for every position.",
  },

  {
    test:
      /^(why do i need a resume|why is a resume important|why should i make a resume)\??$/i,

    response:
      "Your resume gives an employer a quick overview of your qualifications and helps them decide whether your profile matches a role. A strong resume should clearly communicate your relevant skills, experience, projects, achievements, and education.",
  },

  {
    test:
      /^(what is a portfolio|why do i need a portfolio|why should i make a portfolio|what is professional portfolio)\??$/i,

    response:
      "A professional portfolio gives employers a structured view of your profile, experience, education, skills, projects, resume, certificates, and other relevant professional information. WestForce provides a shareable portfolio format for presenting this information professionally.",
  },

  {
    test:
      /^(what is ats optimization|how does ats work|how can ats help)\??$/i,

    response:
      "ATS optimization means structuring your resume so that applicant-tracking software can read and interpret it correctly. Common practices include using standard section headings, relevant keywords from the job description, readable formatting, measurable achievements, and avoiding unnecessary graphics or complicated layouts.",
  },

  {
    test:
      /^(what services does westforce offer|what services does westforce provide|westforce services)\??$/i,

    response:
      "WestForce can help candidates with professional portfolio creation, resume preparation and enhancement, ATS-focused resume guidance, job discovery, job-application preparation, interview preparation, professional document organization, and career-related guidance.",
  },

  {
    test:
      /^(thanks|thank you|thanks a lot|thx|thankyou|appreciate it)([.! ]*)$/i,

    response:
      "You’re welcome! 😊 If you have another resume, career, interview, job-search, or WestForce question, just ask me.",
  },

  {
    test:
      /^(bye|goodbye|see you|see ya|talk to you later)([.! ]*)$/i,

    response:
      "Goodbye! 👋 Whenever you need help with your career, resume, interviews, or WestForce, I’ll be here.",
  },
];

/*
|--------------------------------------------------------------------------
| Quick suggestions
|--------------------------------------------------------------------------
|
| These appear after every assistant answer.
|
*/

const SUGGESTIONS = [
  "What services does WestForce offer?",
  "How can you improve my Canadian resume?",
  "How does WestForce help with RCIP jobs?",
  "How do I prepare for a Canadian interview?",
];

/*
|--------------------------------------------------------------------------
| Local response helper
|--------------------------------------------------------------------------
*/

function getLocalResponse(message) {
  const normalized = String(message || "").trim();

  if (!normalized) {
    return null;
  }

  const match = LOCAL_RESPONSES.find((item) =>
    item.test.test(normalized)
  );

  return match?.response || null;
}

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function WestForceChatbot() {
  const [open, setOpen] = useState(false);

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([
    WELCOME_MESSAGE,
  ]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const inputRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Auto scroll
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  /*
  |--------------------------------------------------------------------------
  | Focus input when chatbot opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Send message
  |--------------------------------------------------------------------------
  */

  async function sendMessage(messageOverride = null) {
    const message = String(
      messageOverride ?? input
    ).trim();

    if (!message || loading) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Reset input
    |--------------------------------------------------------------------------
    */

    setInput("");

    setError("");

    /*
    |--------------------------------------------------------------------------
    | Add user message
    |--------------------------------------------------------------------------
    */

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: message,
      },
    ]);

    /*
    |--------------------------------------------------------------------------
    | Check local generic responses
    |--------------------------------------------------------------------------
    */

    const localResponse = getLocalResponse(message);

    if (localResponse) {
      setLoading(true);

      /*
      |--------------------------------------------------------------------------
      | Small delay so local responses still feel like an assistant response.
      |--------------------------------------------------------------------------
      */

      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            role: "model",
            text: localResponse,
          },
        ]);

        setLoading(false);
      }, 250);

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Gemini request
    |--------------------------------------------------------------------------
    */

    setLoading(true);

    try {
      /*
      |--------------------------------------------------------------------------
      | Build Gemini conversation history.
      |--------------------------------------------------------------------------
      |
      | The first message is our artificial welcome message.
      | It MUST NOT be sent to Gemini.
      |
      */

      const history = messages
        .filter((item, index) => index > 0)
        .slice(-12)
        .map((item) => ({
          role: item.role,
          text: item.text,
        }));

      /*
      |--------------------------------------------------------------------------
      | Send request
      |--------------------------------------------------------------------------
      */

      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message,
          history,
        }),
      });

      /*
      |--------------------------------------------------------------------------
      | Parse response safely
      |--------------------------------------------------------------------------
      */

      const result = await response
        .json()
        .catch(() => ({}));

      /*
      |--------------------------------------------------------------------------
      | Handle backend errors
      |--------------------------------------------------------------------------
      */

      if (!response.ok) {
        throw new Error(
          result.message ||
            `WestForce AI request failed (${response.status}).`
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Add Gemini response
      |--------------------------------------------------------------------------
      */

      setMessages((current) => [
        ...current,
        {
          role: "model",
          text:
            result.message ||
            "I couldn't generate a response right now.",
        },
      ]);
    } catch (chatError) {
      console.error(
        "WestForce chatbot error:",
        chatError
      );

      setError(
        chatError.message ||
          "The AI assistant is temporarily unavailable. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Form submit
  |--------------------------------------------------------------------------
  */

  function handleSubmit(event) {
    event.preventDefault();

    sendMessage();
  }

  /*
  |--------------------------------------------------------------------------
  | Keyboard handling
  |--------------------------------------------------------------------------
  */

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Clear conversation
  |--------------------------------------------------------------------------
  */

  function clearChat() {
    setMessages([
      WELCOME_MESSAGE,
    ]);

    setInput("");

    setError("");

    setLoading(false);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="westforce-chatbot">
      {open && (
        <section
          className="westforce-chatbot-panel"
          aria-label="WestForce AI Assistant"
        >
          {/*
          |--------------------------------------------------------------------------
          | Header
          |--------------------------------------------------------------------------
          */}

          <header className="westforce-chatbot-header">
            <div className="westforce-chatbot-brand">
              <div className="westforce-chatbot-avatar">
                <Bot size={20} />
              </div>

              <div>
                <strong>
                  WestForce AI
                </strong>

                <span>
                  <i />
                  Career Assistant
                </span>
              </div>
            </div>

            <div className="westforce-chatbot-header-actions">
              <button
                type="button"
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear chat"
              >
                <ChevronDown size={18} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chatbot"
                title="Close chatbot"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/*
          |--------------------------------------------------------------------------
          | Chat body
          |--------------------------------------------------------------------------
          */}

          <div className="westforce-chatbot-body">
            {/*
            |--------------------------------------------------------------------------
            | Intro
            |--------------------------------------------------------------------------
            */}

            <div className="westforce-chatbot-intro">
              <Sparkles size={16} />

              <span>
                Ask about WestForce or your Canadian career.
              </span>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Messages
            |--------------------------------------------------------------------------
            */}

            <div className="westforce-chatbot-messages">
              {messages.map(
                (message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`westforce-chatbot-message ${
                      message.role === "user"
                        ? "user"
                        : "assistant"
                    }`}
                  >
                    {message.role === "model" && (
                      <div className="westforce-chatbot-message-avatar">
                        <Bot size={13} />
                      </div>
                    )}

                    <div className="westforce-chatbot-bubble">
                      {message.text}
                    </div>
                  </div>
                )
              )}

              {/*
              |--------------------------------------------------------------------------
              | Typing indicator
              |--------------------------------------------------------------------------
              */}

              {loading && (
                <div className="westforce-chatbot-message assistant">
                  <div className="westforce-chatbot-message-avatar">
                    <Bot size={13} />
                  </div>

                  <div className="westforce-chatbot-bubble westforce-chatbot-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Quick suggestions
            |--------------------------------------------------------------------------
            |
            | IMPORTANT:
            | These are intentionally shown after EVERY assistant response.
            |
            */}

            {!loading &&
              messages.length > 0 &&
              messages[
                messages.length - 1
              ]?.role === "model" && (
                <div className="westforce-chatbot-suggestions">
                  <div className="westforce-chatbot-suggestions-label">
                    You can also ask
                  </div>

                  <div className="westforce-chatbot-suggestions-list">
                    {SUGGESTIONS.map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() =>
                            sendMessage(
                              suggestion
                            )
                          }
                          disabled={loading}
                        >
                          {suggestion}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

            {/*
            |--------------------------------------------------------------------------
            | Error
            |--------------------------------------------------------------------------
            */}

            {error && (
              <div
                className="westforce-chatbot-error"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>

          {/*
          |--------------------------------------------------------------------------
          | Input
          |--------------------------------------------------------------------------
          */}

          <form
            className="westforce-chatbot-input-area"
            onSubmit={handleSubmit}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value.slice(
                    0,
                    2000
                  )
                )
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask WestForce AI..."
              rows={1}
              maxLength={2000}
              aria-label="Message WestForce AI"
            />

            <button
              type="submit"
              disabled={
                !input.trim() ||
                loading
              }
              aria-label="Send message"
              title="Send message"
            >
              <Send size={17} />
            </button>
          </form>

          {/*
          |--------------------------------------------------------------------------
          | Disclaimer
          |--------------------------------------------------------------------------
          */}

          <div className="westforce-chatbot-disclaimer">
            AI responses may be imperfect. Immigration/legal requirements
            should be verified with official sources or a qualified professional.
          </div>
        </section>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Floating launcher
      |--------------------------------------------------------------------------
      */}

      <button
        type="button"
        className={`westforce-chatbot-launcher ${
          open ? "open" : ""
        }`}
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-label={
          open
            ? "Close WestForce AI Assistant"
            : "Open WestForce AI Assistant"
        }
        aria-expanded={open}
      >
        {open ? (
          <X size={23} />
        ) : (
          <MessageCircle size={24} />
        )}

        {!open && (
          <span className="westforce-chatbot-launcher-pulse" />
        )}
      </button>
    </div>
  );
}