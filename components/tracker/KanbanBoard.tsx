"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ExternalLink, MapPin, IndianRupee, Loader2, Trash2, PartyPopper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Application, ApplicationStatus } from "@/types";
import { toast } from "sonner";

const STATUS_COLUMNS: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: "saved",     label: "Saved",     color: "#6366f1" },
  { key: "applied",   label: "Applied",   color: "#0d9488" },
  { key: "viewed",    label: "Viewed",    color: "#f59e0b" },
  { key: "interview", label: "Interview", color: "#2dd4bf" },
  { key: "offer",     label: "Offer",     color: "#10b981" },
  { key: "rejected",  label: "Rejected",  color: "#f43f5e" },
];

function parseLPA(str: string | null | undefined): number | null {
  if (!str) return null;
  const clean = str.replace(/,/g, "").toLowerCase();
  const match = clean.match(/[\d.]+/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  if (isNaN(n) || n === 0) return null;
  const isMonthly = /\/mo|per\s*mo|per\s*month|monthly|p\.?m\.?/i.test(clean);
  if (isMonthly) {
    if (/k/i.test(clean)) return (n * 1000 * 12) / 100000;
    if (/l(?!pa)/i.test(clean)) return n * 12;
    return (n * 12) / 100000;
  }
  return n;
}

function HikeBadge({
  salary,
  currentCompensation,
  isExact,
}: {
  salary: string | null | undefined;
  currentCompensation: string | null;
  isExact: boolean;
}) {
  const current = parseLPA(currentCompensation);
  const offer   = parseLPA(salary);
  if (!current || !offer) return null;

  const pct     = Math.round(((offer - current) / current) * 100);
  const isHike  = pct > 0;
  const isSame  = pct === 0;
  const color   = isSame ? "#f59e0b" : isHike ? "#10b981" : "#f43f5e";
  const Icon    = isSame ? Minus : isHike ? TrendingUp : TrendingDown;
  const mainLabel = isSame
    ? "Same pay"
    : `${isHike ? "+" : ""}${pct}%${isExact ? (isHike ? " hike" : " cut") : " est."}`;
  const subLabel  = isExact ? "vs current" : "predicted";

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg whitespace-nowrap"
      style={{ background: `${color}12`, border: `1px solid ${color}30` }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className="text-xs font-semibold" style={{ color }}>{mainLabel}</span>
      <span className="text-xs" style={{ color: `${color}88` }}>{subLabel}</span>
    </div>
  );
}

function AcceptOfferPanel({
  onAccept,
  onCancel,
}: {
  onAccept: (updateEmployment: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border p-3 space-y-2"
      style={{ background: "#f0fdf4", borderColor: "#86efac" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <PartyPopper className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
        <p className="text-xs font-semibold text-emerald-700">Accept this offer?</p>
      </div>
      <p className="text-xs text-gray-500">
        Archives your current search. View it anytime under <strong className="text-gray-700">Past Searches</strong>.
      </p>
      <div className="space-y-1.5 pt-1">
        <button
          onClick={() => onAccept(true)}
          className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white text-left bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          ✓ Accept &amp; update my Employment profile
        </button>
        <button
          onClick={() => onAccept(false)}
          className="w-full px-3 py-1.5 rounded-lg text-xs text-left bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Just archive — update profile later
        </button>
        <button onClick={onCancel} className="w-full text-xs py-1 text-gray-400 hover:text-gray-600 transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

interface KanbanCardProps {
  app: Application;
  dragging: boolean;
  currentCompensation: string | null;
  readOnly: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onAcceptOffer: (appId: string, updateEmployment: boolean) => void;
}

function KanbanCard({ app, dragging, currentCompensation, readOnly, onStatusChange, onDelete, onAcceptOffer }: KanbanCardProps) {
  const [expanded, setExpanded]   = useState(false);
  const [notes, setNotes]         = useState(app.notes || "");
  const [saving, setSaving]       = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const storedSalary = app.job?.salary || "";
  const storedIsRange = storedSalary.includes("–") || storedSalary.includes("-");
  const [exactSalary, setExactSalary] = useState(storedIsRange ? "" : storedSalary);

  const isOffer = app.status === "offer";

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: app.id,
          notes,
          ...(isOffer && exactSalary ? { salary: exactSalary } : {}),
        }),
      });
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const badgeSalary = isOffer ? (exactSalary || app.job?.salary) : app.job?.salary;

  return (
    <div
      className="p-4 rounded-xl border cursor-pointer transition-all"
      style={{
        background: readOnly ? "#f9fafb" : "#ffffff",
        borderColor: dragging ? "#0d9488" : "#e5e7eb",
        boxShadow: dragging
          ? "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        opacity: readOnly ? 0.75 : 1,
      }}
      onClick={() => !showAccept && setExpanded(!expanded)}
    >
      <p className="font-semibold text-sm leading-snug text-gray-900">
        {app.job?.title || "Unknown Role"}
      </p>
      <p className="text-xs mt-1 text-gray-500 font-medium">
        {app.job?.company || "Unknown Company"}
      </p>

      <div className="mt-2.5 space-y-1.5">
        {app.job?.location && (
          <p className="text-xs flex items-center gap-1.5 text-gray-400">
            <MapPin className="w-3 h-3 shrink-0" />{app.job.location}
          </p>
        )}
        {app.job?.salary && (
          <p className="text-xs flex items-center gap-1.5 font-medium" style={{ color: "#0d9488" }}>
            <IndianRupee className="w-3 h-3 shrink-0" />{isOffer && exactSalary && exactSalary !== app.job.salary ? exactSalary : app.job.salary}
          </p>
        )}
      </div>

      {currentCompensation && badgeSalary && (
        <div className="mt-2.5">
          <HikeBadge
            salary={badgeSalary}
            currentCompensation={currentCompensation}
            isExact={isOffer && exactSalary.trim() !== ""}
          />
        </div>
      )}

      {expanded && !readOnly && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-3 space-y-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {isOffer && (
            <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: "#f0fdf4", border: "1px solid #86efac44" }}>
              <label className="text-xs font-medium text-emerald-700">
                Exact offer salary
              </label>
              <input
                value={exactSalary}
                onChange={(e) => setExactSalary(e.target.value)}
                placeholder="e.g. 24 LPA"
                className="w-full text-xs rounded-lg border px-2.5 py-1.5 bg-white border-gray-200 text-gray-900 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            {STATUS_COLUMNS.map((col) => (
              <button
                key={col.key}
                onClick={() => onStatusChange(app.id, col.key)}
                className="py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  background: app.status === col.key ? `${col.color}15` : "#f9fafb",
                  color: app.status === col.key ? col.color : "#6b7280",
                  border: `1px solid ${app.status === col.key ? col.color + "66" : "#e5e7eb"}`,
                }}
              >
                {col.label}
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={2}
            className="w-full text-xs rounded-lg border px-2 py-1.5 resize-none bg-white border-gray-200 text-gray-900 outline-none"
          />

          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
            </button>

            {app.job?.sourceUrl && (
              <a
                href={app.job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />Open
              </a>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {isOffer && !showAccept && (
                <button
                  onClick={() => setShowAccept(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                  style={{ background: "#10b98115", color: "#10b981", border: "1px solid #10b98144" }}
                >
                  <PartyPopper className="w-3 h-3" />Accept
                </button>
              )}
              <button
                onClick={() => onDelete(app.id)}
                className="p-1 rounded text-rose-300 hover:text-rose-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showAccept && (
              <AcceptOfferPanel
                onAccept={(updateEmployment) => {
                  setShowAccept(false);
                  setExpanded(false);
                  onAcceptOffer(app.id, updateEmployment);
                }}
                onCancel={() => setShowAccept(false)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  applications: Application[];
  currentCompensation: string | null;
  readOnly: boolean;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onAcceptOffer: (appId: string, updateEmployment: boolean) => void;
}

export function KanbanBoard({ applications, currentCompensation, readOnly, onStatusChange, onDelete, onAcceptOffer }: KanbanBoardProps) {
  const onDragEnd = (result: DropResult) => {
    if (readOnly) return;
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as ApplicationStatus;
    const app = applications.find((a) => a.id === draggableId);
    if (!app || app.status === newStatus) return;
    onStatusChange(draggableId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3">
        {STATUS_COLUMNS.map((col) => {
          const colApps = applications.filter((a) => a.status === col.key);
          return (
            <div key={col.key} className="flex-1 min-w-[160px]">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${col.color}22`, color: col.color }}>
                  {colApps.length}
                </span>
              </div>

              <Droppable droppableId={col.key} isDropDisabled={readOnly}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-[120px] rounded-xl p-2 transition-colors"
                    style={{ background: snapshot.isDraggingOver ? "#f0faf9" : "#f3f4f6" }}
                  >
                    {colApps.map((app, index) => (
                      <Draggable key={app.id} draggableId={app.id} index={index} isDragDisabled={readOnly}>
                        {(dragProvided, dragSnapshot) => (
                          <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps}>
                            <KanbanCard
                              app={app}
                              dragging={dragSnapshot.isDragging}
                              currentCompensation={currentCompensation}
                              readOnly={readOnly}
                              onStatusChange={onStatusChange}
                              onDelete={onDelete}
                              onAcceptOffer={onAcceptOffer}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colApps.length === 0 && !snapshot.isDraggingOver && (
                      <div className="h-10 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-400">Empty</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
