import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const ToolCall = (props: {
  part: Extract<MessagePart, { type: "tool-invocation" }>;
  isOpen: boolean;
  toggleOpen: (idx: number) => void;
}) => {
  const { toolInvocation } = props.part;
  const isOpen = props.isOpen;
  return (
    <div className="my-2 rounded bg-gray-700 p-2" title="ToolInvocationUIPart">
      <button
        type="button"
        className="flex items-center gap-1 font-mono text-xs text-blue-300 hover:underline focus:outline-none"
        onClick={() => props.toggleOpen(props.part.toolInvocation.toolCallId)}
      >
        {isOpen ? (
          <ChevronDown className="inline size-4" />
        ) : (
          <ChevronRight className="inline size-4" />
        )}
        <strong>Tool Call:</strong> {toolInvocation.toolName}
        {isOpen && toolInvocation.state === "result" && (
          <div>
            <span className="text-sm font-medium text-gray-400">Result:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-2 text-sm">
              {JSON.stringify(toolInvocation.result, null, 2)}
            </pre>
          </div>
        )}
      </button>
    </div>
  );
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";
  // State for collapsing tool call details per part index
  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({});

  const toggleOpen = (idx: number) => {
    setOpenIndexes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        <div className="prose prose-invert max-w-none">
          {parts?.map((part, i) => {
            if (part.type === "text") {
              return (
                <div key={i} title="TextUIPart">
                  <Markdown>{part.text}</Markdown>
                </div>
              );
            }
            if (part.type === "tool-invocation") {
              return (
                <ToolCall
                  key={part.toolInvocation.toolCallId}
                  part={part}
                  isOpen={!!openIndexes[i]}
                  toggleOpen={() => toggleOpen(i)}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
