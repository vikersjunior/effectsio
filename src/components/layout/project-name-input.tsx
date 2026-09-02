import * as React from "react";
import { useStudioStore } from "../../context/studio-context";

export function ProjectNameInput(): React.JSX.Element {
  const { projectName, setProjectName } = useStudioStore();
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState(projectName);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    const trimmed = tempName.trim();
    if (trimmed) {
      setProjectName(trimmed);
    } else {
      setTempName(projectName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        aria-label="Project Name"
        className="h-6 px-1.5 py-0 text-sm font-semibold tracking-tight bg-[color:var(--background)] border border-[color:var(--primary)] rounded text-[color:var(--foreground)] outline-none ring-1 ring-[color:var(--primary)] max-w-[170px] select-text"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      title="Click to rename project"
      aria-label={`Project Name: ${projectName}`}
      className="text-sm font-semibold tracking-tight text-[color:var(--foreground)] truncate max-w-[170px] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] px-1.5 py-0.5 -mx-1.5 rounded cursor-pointer transition-colors"
    >
      {projectName}
    </div>
  );
}
