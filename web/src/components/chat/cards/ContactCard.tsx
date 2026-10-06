import { useNavigate } from "react-router";
import type { ContactPayload } from "../../../types/chat";
import { User, MessageSquare } from "lucide-react";

interface ContactCardProps {
  contact: ContactPayload;
}

export function ContactCard({ contact }: ContactCardProps) {
  const navigate = useNavigate();

  const handleOpenChat = () => {
    navigate(`/direct-messages?userId=${contact.userId}`);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur transition-all hover:border-border">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary mb-3">
        <User className="h-3.5 w-3.5" />
        <span>Campus Contact</span>
      </div>

      <div className="flex items-center gap-3.5">
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt={contact.fullName}
            className="h-12 w-12 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg border border-primary/20">
            {contact.fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {contact.fullName}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {contact.major || "Student"} {contact.year ? `• Year ${contact.year}` : ""}
          </p>
          {contact.rollNumber && (
            <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
              ID: {contact.rollNumber}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {contact.mutualCirclesCount !== undefined
            ? `${contact.mutualCirclesCount} mutual circle${contact.mutualCirclesCount === 1 ? "" : "s"}`
            : "Campus peer"}
        </span>

        <button
          type="button"
          onClick={handleOpenChat}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Message</span>
        </button>
      </div>
    </div>
  );
}
