import type { ComponentProps } from "react";

/**
 * Wraps fenced code blocks in resource articles with a styled container.
 * Used as the `pre` component in MDX so all ``` code blocks get consistent styling.
 */
export function CodeBlockContainer({
  children,
  className,
  ...props
}: ComponentProps<"pre">) {
  return (
    <div className="article-code-container" data-code-block>
      <pre className={className} {...props}>
        {children}
      </pre>
    </div>
  );
}
