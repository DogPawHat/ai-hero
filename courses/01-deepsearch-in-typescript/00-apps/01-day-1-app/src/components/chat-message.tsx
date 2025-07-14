import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

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

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

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
          {/* Encourage users to hover for more info about MessagePart */}
          <div className="mb-2 text-xs text-gray-500">
            Hover over a message part to see all the possible types it can be.
          </div>
          {parts?.map((part, i) => {
            if (part.type === "text") {
              return (
                <div key={i} title="TextUIPart">
                  <Markdown>{part.text}</Markdown>
                </div>
              );
            }
            if (part.type === "tool-invocation") {
              // Show tool call info (basic)
              const { toolInvocation } = part;
              return (
                <div
                  key={i}
                  className="my-2 rounded bg-gray-700 p-2"
                  title="ToolInvocationUIPart"
                >
                  <div className="font-mono text-xs text-blue-300">
                    <strong>Tool Call:</strong> {toolInvocation.toolName}
                  </div>
                  <div className="font-mono text-xs text-gray-300">
                    <pre className="overflow-x-auto">
                      {JSON.stringify(toolInvocation, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            }
            // You can add more part types here as needed
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
