"use client";

import {
  AlertCircle,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MessageCircle,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  TrendingUp,
  User,
  Mail,
  Hash,
  Settings,
  Moon,
  Lock,
  X,
} from "lucide-react";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest } from "@/lib/api";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import StatCard from "@/components/dashboard/StatCard";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";


/* ============================================================
   TYPES
============================================================ */

interface OverviewData {
  total_issues: number;
  open_issues: number;
  in_progress_issues: number;
  resolved_issues: number;
  closed_issues: number;
  high_severity: number;
  critical_severity: number;
  average_resolution_days: number;
  top_company: string | null;
  top_category: string | null;
}

interface ResolutionStats {
  total_complaints: number;
  resolved_complaints: number;
  open_complaints: number;
  resolution_rate: number;
  average_predicted_resolution_days: number;
}

interface MonthlyTrend {
  year: number;
  month: number;
  count: number;
}

interface Issue {
  id: number;
  title: string;
  description?: string;
  company: string;
  category: string | null;
  status: string;
  severity: string | null;
  estimated_resolution_days: number | null;
  support_count: number;
  comment_count: number;
  trending_score: number;
  duplicate_score?: number;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
}
interface SearchIssue {
  id: number;
  title: string;
  description?: string;
  company?: string;
  category?: string | null;
  status?: string;
  severity?: string | null;
  created_at?: string;
}


interface NotificationItem {
  id: number;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  issue_id?: number;
}

interface CompanyResponseItem {
  company: string;
  response: string;
  created_at?: string;
}

interface CommentItem {
  id: number;
  content: string;
  issue_id?: number;
  user_id?: number;
  user_name?: string;
  name?: string;
  username?: string;
  email?: string;
  parent_id?: number | null;
  created_at?: string;

  replies?: CommentItem[];
}

interface ProfileData {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
}

type DashboardView =
  | "overview"
  | "community"
  | "issues"
  | "notifications"
  | "support";

type CommunitySort =
  | "trending"
  | "latest"
  | "supported";


/* ============================================================
   DEFAULTS
============================================================ */

const EMPTY_OVERVIEW: OverviewData = {
  total_issues: 0,
  open_issues: 0,
  in_progress_issues: 0,
  resolved_issues: 0,
  closed_issues: 0,
  high_severity: 0,
  critical_severity: 0,
  average_resolution_days: 0,
  top_company: null,
  top_category: null,
};

const EMPTY_RESOLUTION: ResolutionStats = {
  total_complaints: 0,
  resolved_complaints: 0,
  open_complaints: 0,
  resolution_rate: 0,
  average_predicted_resolution_days: 0,
};


/* ============================================================
   HELPERS
============================================================ */

function getStatusClass(status: string) {
  switch (status) {
    case "Resolved":
      return "bg-emerald-50 text-emerald-600";

    case "In Progress":
      return "bg-amber-50 text-amber-600";

    case "Closed":
      return "bg-zinc-200 text-zinc-600";

    default:
      return "bg-zinc-100 text-zinc-600";
  }
}


function formatDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}


function normalizeIssue(item: any): Issue {
  return {
    id: Number(item?.id ?? 0),

    title:
      item?.title ??
      "Untitled issue",

    description:
      item?.description ??
      "",

    company:
      item?.company ??
      item?.company_name ??
      "Unknown company",

    category:
      item?.category ??
      null,

    status:
      item?.status ??
      "Open",

    severity:
      item?.severity ??
      null,

    estimated_resolution_days:
      item?.estimated_resolution_days ??
      null,

    support_count: Number(
      item?.support_count ??
        item?.supports ??
        0
    ),

    comment_count: Number(
      item?.comment_count ??
        item?.comments ??
        0
    ),

    trending_score: Number(
      item?.trending_score ??
        0
    ),

    duplicate_score:
      item?.duplicate_score,

    image_url:
      item?.image_url ??
      null,

    created_at:
      item?.created_at,

    updated_at:
      item?.updated_at,

    user_id:
      item?.user_id,
  };
}


function extractIssues(response: any): Issue[] {
  const raw =
    response?.issues ??
    response?.data?.issues ??
    response?.data ??
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(
    normalizeIssue
  );
}


/* ============================================================
   COMMENT NORMALIZATION
============================================================ */

function normalizeComment(
  item: any,
  fallbackParentId?: number
): CommentItem {
  return {
    id: Number(
      item?.id ?? 0
    ),

    content:
      item?.content ??
      "",

    issue_id:
      item?.issue_id,

    user_id:
      item?.user_id,

    user_name:
      item?.user_name ??
      item?.name ??
      item?.username ??
      item?.user?.name ??
      item?.user?.username ??
      item?.email ??
      "User",

    name:
      item?.name,

    username:
      item?.username,

    email:
      item?.email,

    parent_id:
      item?.parent_id ??
      fallbackParentId ??
      null,

    created_at:
      item?.created_at,

    replies:
      Array.isArray(item?.replies)
        ? item.replies.map(
            (reply: any) =>
              normalizeComment(
                reply,
                Number(
                  item?.id
                )
              )
          )
        : [],
  };
}


/*
 * Backend format:
 *
 * [
 *   {
 *     id: 1,
 *     content: "Main comment",
 *     user_name: "Rahul",
 *     replies: [
 *       {
 *         id: 2,
 *         content: "Reply",
 *         user_name: "Amit",
 *         parent_id: 1
 *       }
 *     ]
 *   }
 * ]
 *
 * Keep this nested structure.
 */
function extractComments(
  response: any
): CommentItem[] {
  const raw =
    response?.data ??
    response?.comments ??
    response?.data?.comments ??
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object"
    )
    .map(
      (item) =>
        normalizeComment(
          item
        )
    );
}


function getCommentAuthor(
  comment: CommentItem
) {
  return (
    comment.user_name ??
    comment.name ??
    comment.username ??
    comment.email ??
    (
      comment.user_id
        ? `User ${comment.user_id}`
        : "User"
    )
  );
}


function getInitial(
  value: string
) {
  return (
    value
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "U"
  );
}


function extractProfile(
  response: any
): ProfileData {
  const user =
    response?.user ??
    response?.profile ??
    response?.data?.user ??
    response?.data?.profile ??
    response?.data ??
    response;

  return {
    id:
      typeof user?.id ===
      "number"
        ? user.id
        : undefined,

    name:
      user?.name ??
      user?.full_name ??
      user?.username ??
      "",

    email:
      user?.email ??
      "",

    role:
      user?.role ??
      "Consumer",
  };
}


/* ============================================================
   INFO CARD
============================================================ */

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[16px] bg-[#F8F8F9] p-4">

      <div className="flex items-center gap-2">

        <span className="text-[#9CA3AF]">
          {icon}
        </span>

        <p className="text-xs text-[#9CA3AF]">
          {label}
        </p>

      </div>

      <p className="mt-2 break-words text-sm font-semibold text-[#111827]">
        {value}
      </p>

    </div>
  );
}


/* ============================================================
   COMPANY RESPONSE CARD
============================================================ */

function CompanyResponseCard({
  responses,
  loading,
  error,
}: {
  responses: CompanyResponseItem[];
  loading: boolean;
  error: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

      <div className="flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
          <Sparkles size={20} />
        </div>

        <div>

          <h2 className="text-[16px] font-semibold text-[#111827]">
            Official Company Response
          </h2>

          <p className="mt-1 text-sm text-[#9CA3AF]">
            Responses posted by the company are shown here.
          </p>

        </div>

      </div>


      {error && (
        <div className="mt-5 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}


      {loading ? (

        <div className="mt-5 space-y-3">

          {[1, 2].map(
            (item) => (
              <div
                key={item}
                className="rounded-[18px] bg-[#F8F8F9] p-5"
              >

                <div className="h-4 w-1/4 animate-pulse rounded bg-[#E8E8EA]" />

                <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#F0F0F2]" />

                <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[#F0F0F2]" />

              </div>
            )
          )}

        </div>

      ) : responses.length === 0 ? (

        <div className="mt-5 rounded-[18px] bg-[#F8F8F9] p-6 text-center text-sm text-[#9CA3AF]">
          No official company response yet.
        </div>

      ) : (

        <div className="mt-5 space-y-3">

          {responses.map(
            (
              response,
              index
            ) => (

              <div
                key={`${response.company}-${response.created_at ?? index}`}
                className="rounded-[18px] border border-[#EEEEF0] bg-[#FAFAFA] p-5"
              >

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
                      {getInitial(
                        response.company ||
                          "Company"
                      )}
                    </div>

                    <span className="text-sm font-semibold text-[#111827]">
                      {
                        response.company
                      }
                    </span>

                  </div>

                  {response.created_at && (
                    <span className="text-[11px] text-[#B0B3B8]">
                      {formatDate(
                        response.created_at
                      )}
                    </span>
                  )}

                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">
                  {
                    response.response
                  }
                </p>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}


/* ============================================================
   COMMUNITY DISCUSSION
============================================================ */

function CommunityDiscussion({
  comments,
  loading,
  error,
  commentText,
  setCommentText,
  submitComment,
  commentSubmitting,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  submitReply,
  replySubmitting,
  expandedReplies,
  setExpandedReplies,
}: {
  comments: CommentItem[];

  loading: boolean;
  error: string;

  commentText: string;
  setCommentText: (
    value: string
  ) => void;

  submitComment: () => void;
  commentSubmitting: boolean;

  replyingTo: number | null;
  setReplyingTo: (
    value: number | null
  ) => void;

  replyText: string;
  setReplyText: (
    value: string
  ) => void;

  submitReply: (
    parentId: number
  ) => void;

  replySubmitting: boolean;

  expandedReplies: Record<
    number,
    boolean
  >;

  setExpandedReplies: React.Dispatch<
    React.SetStateAction<
      Record<number, boolean>
    >
  >;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

      {/* HEADER */}

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
          <MessageCircle
            size={20}
          />
        </div>

        <div>

          <h2 className="text-[16px] font-semibold text-[#111827]">
            Community Discussion
          </h2>

          <p className="mt-1 text-sm text-[#9CA3AF]">
            Share your experience and reply to other consumers.
          </p>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* WRITE COMMENT */}

      <div className="mt-6 rounded-[18px] border border-[#EEEEF0] bg-[#FAFAFA] p-4">

        <textarea
          value={
            commentText
          }
          onChange={(event) =>
            setCommentText(
              event.target.value
            )
          }
          rows={4}
          placeholder="Write a comment about this issue..."
          className="w-full resize-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
        />

        <div className="mt-3 flex justify-end">

          <button
            type="button"
            onClick={
              submitComment
            }
            disabled={
              commentSubmitting ||
              !commentText.trim()
            }
            className="flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-50"
          >

            {commentSubmitting ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Send size={15} />
            )}

            Post Comment

          </button>

        </div>

      </div>


      {/* COMMENT LIST */}

      <div className="mt-6">

        {loading ? (

          <div className="space-y-4">

            {[1, 2, 3].map(
              (item) => (

                <div
                  key={item}
                  className="rounded-[18px] bg-[#F8F8F9] p-5"
                >

                  <div className="h-4 w-1/4 animate-pulse rounded bg-[#E8E8EA]" />

                  <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#F0F0F2]" />

                  <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[#F0F0F2]" />

                </div>

              )
            )}

          </div>

        ) : comments.length === 0 ? (

          <div className="rounded-[18px] bg-[#F8F8F9] p-8 text-center">

            <MessageCircle
              size={24}
              className="mx-auto text-[#B8BABF]"
            />

            <p className="mt-4 text-sm font-medium text-[#374151]">
              No comments yet
            </p>

            <p className="mt-1 text-xs text-[#9CA3AF]">
              Be the first person to start the discussion.
            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {comments.map(
              (comment) => {

                const author =
                  getCommentAuthor(
                    comment
                  );

                const replies =
                  comment.replies ??
                  [];

                const repliesExpanded =
                  Boolean(
                    expandedReplies[
                      comment.id
                    ]
                  );

                const isReplying =
                  replyingTo ===
                  comment.id;

                return (
                  <div
                    key={
                      comment.id
                    }
                    className="rounded-[18px] border border-[#EEEEF0] bg-white p-5"
                  >

                    {/* COMMENT AUTHOR */}

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9EAEC] text-xs font-semibold text-[#4B5563]">
                        {getInitial(
                          author
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="text-sm font-semibold text-[#111827]">
                          {
                            author
                          }
                        </p>

                        {comment.created_at && (
                          <p className="mt-0.5 text-[11px] text-[#B0B3B8]">
                            {formatDate(
                              comment.created_at
                            )}
                          </p>
                        )}

                      </div>

                    </div>


                    {/* COMMENT BODY */}

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">
                      {
                        comment.content
                      }
                    </p>


                    {/* ACTIONS */}

                    <div className="mt-4 flex flex-wrap items-center gap-4">

                      {/* REPLY */}

                      <button
                        type="button"
                        onClick={() => {

                          setReplyingTo(
                            isReplying
                              ? null
                              : comment.id
                          );

                          setReplyText(
                            ""
                          );

                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] transition hover:text-[#111827]"
                      >

                        <MessageCircle
                          size={14}
                        />

                        Reply

                      </button>


                      {/* SHOW REPLIES */}

                      {replies.length >
                        0 && (

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedReplies(
                              (
                                current
                              ) => ({
                                ...current,
                                [comment.id]:
                                  !current[
                                    comment.id
                                  ],
                              })
                            )
                          }
                          className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] transition hover:text-[#111827]"
                        >

                          <ChevronDown
                            size={14}
                            className={
                              repliesExpanded
                                ? "rotate-180 transition-transform"
                                : "transition-transform"
                            }
                          />

                          {repliesExpanded
                            ? "Hide replies"
                            : `${replies.length} ${
                                replies.length ===
                                1
                                  ? "reply"
                                  : "replies"
                              }`}

                        </button>

                      )}

                    </div>


                    {/* REPLY BOX */}

                    {isReplying && (

                      <div className="mt-4 rounded-[16px] bg-[#F8F8F9] p-4">

                        <div className="flex items-start gap-3">

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#6B7280]">
                            U
                          </div>

                          <textarea
                            value={
                              replyText
                            }
                            onChange={(event) =>
                              setReplyText(
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Reply to this comment..."
                            className="min-w-0 flex-1 resize-none bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                          />

                        </div>


                        <div className="mt-3 flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() => {

                              setReplyingTo(
                                null
                              );

                              setReplyText(
                                ""
                              );

                            }}
                            className="rounded-full border border-[#E7E7EA] bg-white px-4 py-2 text-xs font-medium text-[#6B7280] transition hover:bg-[#F5F5F7]"
                          >
                            Cancel
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              submitReply(
                                comment.id
                              )
                            }
                            disabled={
                              replySubmitting ||
                              !replyText.trim()
                            }
                            className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {replySubmitting ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Send
                                size={13}
                              />
                            )}

                            Reply

                          </button>

                        </div>

                      </div>

                    )}


                    {/* REPLIES */}

                    {repliesExpanded &&
                      replies.length >
                        0 && (

                      <div className="mt-5 space-y-3 border-l-2 border-[#EEEEF0] pl-5">

                        {replies.map(
                          (
                            reply
                          ) => {

                            const replyAuthor =
                              getCommentAuthor(
                                reply
                              );

                            return (
                              <div
                                key={
                                  reply.id
                                }
                                className="rounded-[16px] bg-[#F8F8F9] p-4"
                              >

                                <div className="flex items-start gap-3">

                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#4B5563]">
                                    {getInitial(
                                      replyAuthor
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

                                      <p className="text-xs font-semibold text-[#111827]">
                                        {
                                          replyAuthor
                                        }
                                      </p>

                                      {reply.created_at && (
                                        <p className="text-[10px] text-[#B0B3B8]">
                                          {formatDate(
                                            reply.created_at
                                          )}
                                        </p>
                                      )}

                                    </div>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">
                                      {
                                        reply.content
                                      }
                                    </p>

                                  </div>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    )}

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}


/* ============================================================
   ISSUE DETAILS
============================================================ */

function IssueDetails({
  issue,
  fromCommunity,
  comments,
  commentsLoading,
  commentsError,
  commentText,
  setCommentText,
  submitComment,
  commentSubmitting,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  submitReply,
  replySubmitting,
  expandedReplies,
  setExpandedReplies,
  companyResponses,
  responsesLoading,
  responsesError,
  supportCount,
  supportLoading,
  supportError,
  hasSupported,
  supportIssue,
  statusUpdating,
  updateIssueStatus,
}: {
  issue: Issue;
  fromCommunity: boolean;

  comments: CommentItem[];
  commentsLoading: boolean;
  commentsError: string;

  commentText: string;
  setCommentText: (
    value: string
  ) => void;

  submitComment: () => void;
  commentSubmitting: boolean;

  replyingTo: number | null;
  setReplyingTo: (
    value: number | null
  ) => void;

  replyText: string;
  setReplyText: (
    value: string
  ) => void;

  submitReply: (
    parentId: number
  ) => void;

  replySubmitting: boolean;

  expandedReplies: Record<
    number,
    boolean
  >;

  setExpandedReplies: React.Dispatch<
    React.SetStateAction<
      Record<number, boolean>
    >
  >;

  companyResponses: CompanyResponseItem[];
  responsesLoading: boolean;
  responsesError: string;

  supportCount: number;
  supportLoading: boolean;
  supportError: string;
  hasSupported: boolean;
  supportIssue: () => void;

  statusUpdating: boolean;
  updateIssueStatus: (
    status: string
  ) => void;
}) {
  const rootCommentCount =
    comments.length;

  return (
    <div className="space-y-6">

      {/* ======================================================
          ISSUE CARD
      ====================================================== */}

      <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          <div className="min-w-0">

            <p className="text-xs font-medium text-[#9CA3AF]">
              Issue #{issue.id}
            </p>

            <h1 className="mt-2 text-[25px] font-semibold tracking-[-0.02em] text-[#111827]">
              {issue.title}
            </h1>

            <p className="mt-2 text-sm text-[#6B7280]">
              {issue.company}

              {issue.category
                ? ` Â· ${issue.category}`
                : ""}
            </p>

          </div>


          <span
            className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
              issue.status
            )}`}
          >
            {issue.status}
          </span>

        </div>


        {/* STATS */}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">

          <InfoCard
            label="Severity"
            value={
              issue.severity ||
              "â€”"
            }
            icon={
              <ShieldAlert
                size={14}
              />
            }
          />

          <InfoCard
            label="Category"
            value={
              issue.category ||
              "â€”"
            }
            icon={
              <Tag size={14} />
            }
          />

          <InfoCard
            label="Supports"
            value={String(
              supportCount
            )}
            icon={
              <ThumbsUp size={14} />
            }
          />

          <InfoCard
            label="Comments"
            value={String(
              rootCommentCount
            )}
            icon={
              <MessageCircle
                size={14}
              />
            }
          />

        </div>


        {/* DESCRIPTION */}

        <div className="mt-6 border-t border-[#EEEEF0] pt-6">

          <h2 className="text-sm font-semibold text-[#111827]">
            Issue Description
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#6B7280]">
            {issue.description ||
              "No description available."}
          </p>

        </div>


        {/* IMAGE */}

        {issue.image_url && (
          <div className="mt-6 border-t border-[#EEEEF0] pt-6">

            <h2 className="text-sm font-semibold text-[#111827]">
              Supporting Evidence
            </h2>

            <img
              src={
                issue.image_url
              }
              alt="Issue evidence"
              className="mt-4 max-h-[380px] w-auto rounded-[16px] border border-[#E7E7EA] object-contain"
            />

          </div>
        )}

      </div>


      {/* ======================================================
          COMPANY RESPONSE
      ====================================================== */}

      <CompanyResponseCard
        responses={
          companyResponses
        }
        loading={
          responsesLoading
        }
        error={
          responsesError
        }
      />


      {/* ======================================================
          SUPPORT
      ====================================================== */}

      <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
              <ThumbsUp size={20} />
            </div>

            <div>

              <h2 className="text-[16px] font-semibold text-[#111827]">
                Community Support
              </h2>

              <p className="mt-1 text-sm text-[#9CA3AF]">
                Support this issue if you are facing the same problem.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={
              supportIssue
            }
            disabled={
              supportLoading
            }
            className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              hasSupported
                ? "bg-emerald-50 text-emerald-600"
                : "bg-[#111111] text-white hover:bg-[#242424]"
            }`}
          >

            {supportLoading ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : hasSupported ? (
              <Check size={15} />
            ) : (
              <ThumbsUp
                size={15}
              />
            )}

            {hasSupported
              ? "Supported"
              : "Support Issue"}

          </button>

        </div>


        <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-5">

          <p className="text-2xl font-semibold text-[#111827]">
            {
              supportCount
            }
          </p>

          <p className="mt-1 text-xs text-[#9CA3AF]">
            people support this issue
          </p>

        </div>


        {supportError && (
          <p className="mt-3 text-sm text-red-600">
            {supportError}
          </p>
        )}

      </div>


      {/* ======================================================
          DISCUSSION
      ====================================================== */}

      <CommunityDiscussion
        comments={
          comments
        }
        loading={
          commentsLoading
        }
        error={
          commentsError
        }
        commentText={
          commentText
        }
        setCommentText={
          setCommentText
        }
        submitComment={
          submitComment
        }
        commentSubmitting={
          commentSubmitting
        }
        replyingTo={
          replyingTo
        }
        setReplyingTo={
          setReplyingTo
        }
        replyText={
          replyText
        }
        setReplyText={
          setReplyText
        }
        submitReply={
          submitReply
        }
        replySubmitting={
          replySubmitting
        }
        expandedReplies={
          expandedReplies
        }
        setExpandedReplies={
          setExpandedReplies
        }
      />


      {/* ======================================================
          STATUS
      ====================================================== */}

      {!fromCommunity && (

        <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
              <Shield size={18} />
            </div>

            <div>

              <h2 className="text-[15px] font-semibold text-[#111827]">
                Update Status
              </h2>

              <p className="mt-1 text-xs text-[#9CA3AF]">
                Keep your issue progress up to date.
              </p>

            </div>

          </div>


          <div className="mt-5 flex flex-wrap gap-2">

            {[
              "Open",
              "In Progress",
              "Resolved",
              "Closed",
            ].map(
              (status) => (

                <button
                  key={
                    status
                  }
                  type="button"
                  disabled={
                    statusUpdating ||
                    issue.status ===
                      status
                  }
                  onClick={() =>
                    updateIssueStatus(
                      status
                    )
                  }
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition ${
                    issue.status ===
                    status
                      ? "bg-[#111111] text-white"
                      : "border border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {status}
                </button>

              )
            )}

          </div>


          {statusUpdating && (

            <div className="mt-4 flex items-center gap-2 text-xs text-[#9CA3AF]">

              <Loader2
                size={14}
                className="animate-spin"
              />

              Updating issue status...

            </div>

          )}

        </div>

      )}

    </div>
  );
}


/* ============================================================
   PROFILE + SETTINGS MODAL
============================================================ */

function ProfileSettingsModal({
  profile,
  openProfile,
  openSettings,
  onClose,
}: {
  profile: ProfileData | null;
  openProfile: boolean;
  openSettings: boolean;
  onClose: () => void;
}) {
  const visible = openProfile || openSettings;

  useEffect(() => {
    if (!visible) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const displayName = profile?.name?.trim() || "User";
  const displayEmail = profile?.email?.trim() || "Not available";
  const displayRole = profile?.role?.trim() || "Consumer";
  const initial = getInitial(displayName);
  const showingSettings = openSettings && !openProfile;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto overflow-hidden rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between border-b border-[#EEEEF0] px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
              {showingSettings ? <Settings size={19} /> : <User size={19} />}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                {showingSettings ? "Settings" : "Profile"}
              </h2>
              <p className="mt-0.5 text-xs text-[#9CA3AF]">
                {showingSettings
                  ? "Manage your dashboard preferences."
                  : "Your ConsumerConnect account details."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#9CA3AF] transition hover:bg-[#F5F5F7] hover:text-[#111827]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {showingSettings ? (
          <div className="p-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Settings size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Dashboard preferences</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Manage the way your ConsumerConnect dashboard behaves.</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Notifications</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Show issue, support and discussion activity.</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">Enabled</span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Search size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Global search</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Search issues directly from the dashboard topbar.</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Moon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Appearance</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Dashboard appearance preference.</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#F5F5F7] px-3 py-1 text-[10px] font-semibold text-[#6B7280]">Light</span>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F5F5F7] text-[#6B7280]">
                    <Lock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Account security</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Authenticated access is required for your account.</p>
                  </div>
                </div>
                <ShieldCheck size={18} className="text-emerald-500" />
              </div>
            </div>

            <div className="mt-6 rounded-[18px] bg-[#F8F8F9] p-5">
              <p className="text-xs font-semibold text-[#374151]">ConsumerConnect settings</p>
              <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                Additional preference controls can be added here without changing your issue or account data.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-7">
            <div className="flex flex-col items-center rounded-[22px] bg-[#F8F8F9] px-6 py-8 text-center">
              <div className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-[#E7E8EA] text-2xl font-semibold text-[#4B5563]">
                {initial}
              </div>
              <h3 className="mt-4 text-[20px] font-semibold text-[#111827]">{displayName}</h3>
              <p className="mt-1 text-sm text-[#9CA3AF]">{displayEmail}</p>
              <span className="mt-3 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm">
                {displayRole}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#9CA3AF]" />
                  <p className="text-xs text-[#9CA3AF]">Name</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{displayName}</p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Mail size={15} className="text-[#9CA3AF]" />
                  <p className="text-xs text-[#9CA3AF]">Email</p>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-[#111827]">{displayEmail}</p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[#9CA3AF]" />
                  <p className="text-xs text-[#9CA3AF]">Account type</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{displayRole}</p>
              </div>

              <div className="rounded-[18px] border border-[#E7E7EA] p-5">
                <div className="flex items-center gap-2">
                  <Hash size={15} className="text-[#9CA3AF]" />
                  <p className="text-xs text-[#9CA3AF]">User ID</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#111827]">{profile?.id ?? "â€”"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-[#F8F8F9] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="mt-0.5 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-[#374151]">Account information</p>
                  <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                    Your profile information is loaded from the authenticated ConsumerConnect account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   MAIN PAGE
============================================================ */

export default function Home() {

  /* ==========================================================
     VIEW
  ========================================================== */

  const [
    activeView,
    setActiveView,
  ] = useState<DashboardView>(
    "overview"
  );


  /* ==========================================================
     DASHBOARD
  ========================================================== */

  const [
    overview,
    setOverview,
  ] = useState<OverviewData>(
    EMPTY_OVERVIEW
  );

  const [
    resolutionStats,
    setResolutionStats,
  ] = useState<ResolutionStats>(
    EMPTY_RESOLUTION
  );

  const [
    monthlyTrends,
    setMonthlyTrends,
  ] = useState<MonthlyTrend[]>(
    []
  );

  const [
    dashboardLoading,
    setDashboardLoading,
  ] = useState(true);

  const [
    dashboardError,
    setDashboardError,
  ] = useState("");


  /* ==========================================================
     MY ISSUES
  ========================================================== */

  const [
    myIssues,
    setMyIssues,
  ] = useState<Issue[]>(
    []
  );

  const [
    issuesLoading,
    setIssuesLoading,
  ] = useState(false);

  const [
    issuesError,
    setIssuesError,
  ] = useState("");

  const [
    issueSearch,
    setIssueSearch,
  ] = useState("");

  const [
    issueStatusFilter,
    setIssueStatusFilter,
  ] = useState("All");


  /* ==========================================================
     COMMUNITY
  ========================================================== */

  const [
    communityIssues,
    setCommunityIssues,
  ] = useState<Issue[]>(
    []
  );

  const [
    communityLoading,
    setCommunityLoading,
  ] = useState(false);

  const [
    communityError,
    setCommunityError,
  ] = useState("");

  const [
    communitySearch,
    setCommunitySearch,
  ] = useState("");

  const [
    communitySort,
    setCommunitySort,
  ] = useState<CommunitySort>(
    "trending"
  );


  /* ==========================================================
     SELECTED ISSUE
  ========================================================== */

  const [
    selectedIssue,
    setSelectedIssue,
  ] = useState<Issue | null>(
    null
  );

  const [
    selectedFromCommunity,
    setSelectedFromCommunity,
  ] = useState(false);

  const [
    selectedIssueError,
    setSelectedIssueError,
  ] = useState("");


  /* ==========================================================
     COMPANY RESPONSE
  ========================================================== */

  const [
    companyResponses,
    setCompanyResponses,
  ] = useState<
    CompanyResponseItem[]
  >([]);

  const [
    responsesLoading,
    setResponsesLoading,
  ] = useState(false);

  const [
    responsesError,
    setResponsesError,
  ] = useState("");


  /* ==========================================================
     COMMENTS
  ========================================================== */

  const [
    comments,
    setComments,
  ] = useState<
    CommentItem[]
  >([]);

  const [
    commentsLoading,
    setCommentsLoading,
  ] = useState(false);

  const [
    commentsError,
    setCommentsError,
  ] = useState("");

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    commentSubmitting,
    setCommentSubmitting,
  ] = useState(false);

  const [
    replyingTo,
    setReplyingTo,
  ] = useState<number | null>(
    null
  );

  const [
    replyText,
    setReplyText,
  ] = useState("");

  const [
    replySubmitting,
    setReplySubmitting,
  ] = useState(false);

  const [
    expandedReplies,
    setExpandedReplies,
  ] = useState<
    Record<number, boolean>
  >({});


  /* ==========================================================
     SUPPORT
  ========================================================== */

  const [
    supportCount,
    setSupportCount,
  ] = useState(0);

  const [
    supportLoading,
    setSupportLoading,
  ] = useState(false);

  const [
    supportError,
    setSupportError,
  ] = useState("");

  const [
    hasSupported,
    setHasSupported,
  ] = useState(false);


  /* ==========================================================
     STATUS
  ========================================================== */

  const [
    statusUpdating,
    setStatusUpdating,
  ] = useState(false);


  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationItem[]
  >([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    notificationsError,
    setNotificationsError,
  ] = useState("");

  const [
    notificationActionLoading,
    setNotificationActionLoading,
  ] = useState(false);


  /* ==========================================================
     PROFILE
  ========================================================== */

  const [
    profile,
    setProfile,
  ] = useState<ProfileData | null>(
    null
  );

  const [
    profileModalOpen,
    setProfileModalOpen,
  ] = useState(false);

  const [
    settingsModalOpen,
    setSettingsModalOpen,
  ] = useState(false);


  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  useEffect(() => {

    async function loadDashboard() {

      try {

        setDashboardLoading(
          true
        );

        setDashboardError(
          ""
        );

        const [
          overviewResponse,
          resolutionResponse,
          trendsResponse,
        ] = await Promise.all([
          apiRequest(
            "/api/dashboard/overview"
          ),

          apiRequest(
            "/api/dashboard/resolution-statistics"
          ),

          apiRequest(
            "/api/dashboard/monthly-trends"
          ),
        ]);

        setOverview(
          overviewResponse?.data ??
            overviewResponse ??
            EMPTY_OVERVIEW
        );

        setResolutionStats(
          resolutionResponse?.data ??
            resolutionResponse ??
            EMPTY_RESOLUTION
        );

        setMonthlyTrends(
          trendsResponse?.data ??
            trendsResponse ??
            []
        );

      } catch (error) {

        console.error(
          "Dashboard loading error:",
          error
        );

        setDashboardError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data."
        );

      } finally {

        setDashboardLoading(
          false
        );

      }

    }

    loadDashboard();

  }, []);


  /* ==========================================================
     LOAD PROFILE
  ========================================================== */

  useEffect(() => {

    async function loadProfile() {

      try {

        const response =
          await apiRequest(
            "/api/auth/profile"
          );

        setProfile(
          extractProfile(
            response
          )
        );

      } catch (error) {

        console.error(
          "Profile loading error:",
          error
        );

      }

    }

    loadProfile();

  }, []);


  /* ==========================================================
     LOAD MY ISSUES
  ========================================================== */

  useEffect(() => {

    if (
      activeView !==
      "issues"
    ) {
      return;
    }

    if (selectedIssue) {
      return;
    }

    async function loadMyIssues() {

      try {

        setIssuesLoading(
          true
        );

        setIssuesError(
          ""
        );

        const response =
          await apiRequest(
            "/api/issues/mine?limit=50&sort=latest"
          );

        setMyIssues(
          extractIssues(
            response
          )
        );

      } catch (error) {

        console.error(
          "My Issues loading error:",
          error
        );

        setIssuesError(
          error instanceof Error
            ? error.message
            : "Unable to load your issues."
        );

      } finally {

        setIssuesLoading(
          false
        );

      }

    }

    loadMyIssues();

  }, [
    activeView,
    selectedIssue,
  ]);


  /* ==========================================================
     LOAD COMMUNITY
  ========================================================== */

  useEffect(() => {

    if (
      activeView !==
      "community"
    ) {
      return;
    }

    if (selectedIssue) {
      return;
    }

    async function loadCommunity() {

      try {

        setCommunityLoading(
          true
        );

        setCommunityError(
          ""
        );

        const serverSort =
          communitySort ===
          "supported"
            ? "latest"
            : communitySort;

        const response =
          await apiRequest(
            `/api/issues?limit=100&sort=${serverSort}`
          );

        let issues =
          extractIssues(
            response
          );


        /*
         * Fetch the current comment and support
         * numbers for each community issue.
         *
         * This prevents stale values from the Issue
         * model from appearing in the feed.
         */
        issues =
          await Promise.all(
            issues.map(
              async (
                issue
              ) => {

                try {

                  const [
                    commentsResponse,
                    supportResponse,
                  ] =
                    await Promise.all([
                      apiRequest(
                        `/api/comments/issue/${issue.id}`
                      ),

                      apiRequest(
                        `/api/supports/${issue.id}`
                      ),
                    ]);

                  const rootComments =
                    Array.isArray(
                      commentsResponse?.data
                    )
                      ? commentsResponse.data
                      : [];

                  return {
                    ...issue,

                    comment_count:
                      rootComments.length,

                    support_count:
                      Number(
                        supportResponse?.support_count ??
                          0
                      ),
                  };

                } catch (error) {

                  console.error(
                    `Community metadata error for issue ${issue.id}:`,
                    error
                  );

                  return issue;

                }

              }
            )
          );


        if (
          communitySort ===
          "supported"
        ) {

          issues.sort(
            (
              first,
              second
            ) =>
              second.support_count -
              first.support_count
          );

        }

        setCommunityIssues(
          issues
        );

      } catch (error) {

        console.error(
          "Community loading error:",
          error
        );

        setCommunityError(
          error instanceof Error
            ? error.message
            : "Unable to load community issues."
        );

        setCommunityIssues(
          []
        );

      } finally {

        setCommunityLoading(
          false
        );

      }

    }

    loadCommunity();

  }, [
    activeView,
    communitySort,
    selectedIssue,
  ]);


  /* ==========================================================
     LOAD NOTIFICATIONS

     Notifications are loaded when the dashboard opens rather
     than only when the Notifications view is selected. This
     allows the topbar bell and unread badge to show activity
     immediately. The list is refreshed every 15 seconds so
     new notifications can appear without opening the panel.
  ========================================================== */

  useEffect(() => {

    let cancelled = false;

    async function loadNotifications(
      showLoading = false
    ) {

      try {

        if (showLoading) {
          setNotificationsLoading(
            true
          );
        }

        setNotificationsError(
          ""
        );

        const response =
          await apiRequest(
            "/api/notifications"
          );

        const data =
          response?.notifications ??
          response?.data ??
          [];

        if (cancelled) {
          return;
        }

        setNotifications(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (error) {

        if (cancelled) {
          return;
        }

        console.error(
          "Notifications loading error:",
          error
        );

        setNotificationsError(
          error instanceof Error
            ? error.message
            : "Unable to load notifications."
        );

      } finally {

        if (!cancelled && showLoading) {
          setNotificationsLoading(
            false
          );
        }

      }

    }

    // Load immediately when the dashboard opens.
    loadNotifications(true);

    // Refresh immediately when the user changes dashboard sections.
    loadNotifications(false);

    // Keep the topbar bell current while the dashboard is open.
    const intervalId =
      window.setInterval(() => {
        loadNotifications(false);
      }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(
        intervalId
      );
    };

  }, [
    activeView,
  ]);

  /* ==========================================================
     LOAD SELECTED ISSUE DATA
  ========================================================== */

  async function loadIssueData(
    issueId: number
  ) {

    setResponsesLoading(
      true
    );

    setCommentsLoading(
      true
    );

    setSupportLoading(
      true
    );

    setResponsesError(
      ""
    );

    setCommentsError(
      ""
    );

    setSupportError(
      ""
    );


    await Promise.all([

      /* COMPANY RESPONSE */

      (async () => {

        try {

          const response =
            await apiRequest(
              `/api/company/responses/${issueId}`
            );

          const data =
            response?.responses ??
            response?.data ??
            [];

          setCompanyResponses(
            Array.isArray(data)
              ? data
              : []
          );

        } catch (error) {

          console.error(
            "Company response loading error:",
            error
          );

          setCompanyResponses(
            []
          );

          setResponsesError(
            error instanceof Error
              ? error.message
              : "Unable to load company responses."
          );

        } finally {

          setResponsesLoading(
            false
          );

        }

      })(),


      /* COMMENTS */

      (async () => {

        try {

          const response =
            await apiRequest(
              `/api/comments/issue/${issueId}`
            );

          const freshComments =
            extractComments(
              response
            );

          setComments(
            freshComments
          );

          /*
           * Do not automatically expand replies.
           */
          setExpandedReplies(
            {}
          );

        } catch (error) {

          console.error(
            "Comments loading error:",
            error
          );

          setComments(
            []
          );

          setCommentsError(
            error instanceof Error
              ? error.message
              : "Unable to load comments."
          );

        } finally {

          setCommentsLoading(
            false
          );

        }

      })(),


      /* SUPPORT */

      (async () => {

        try {

          const response =
            await apiRequest(
              `/api/supports/${issueId}`
            );

          const count =
            Number(
              response?.support_count ??
                0
            );

          setSupportCount(
            Number.isFinite(
              count
            )
              ? count
              : 0
          );

          setHasSupported(
            response?.supported ===
              true
          );

        } catch (error) {

          console.error(
            "Support loading error:",
            error
          );

          setSupportError(
            error instanceof Error
              ? error.message
              : "Unable to load support information."
          );

        } finally {

          setSupportLoading(
            false
          );

        }

      })(),

    ]);

  }


 /* ==========================================================
   OPEN ISSUE
========================================================== */

async function openIssue(
  issue: Issue,
  fromCommunity: boolean
) {

  setSelectedIssue(
    issue
  );

  setSelectedFromCommunity(
    fromCommunity
  );

  setSelectedIssueError(
    ""
  );

  setCompanyResponses(
    []
  );

  setComments(
    []
  );

  setSupportCount(
    0
  );

  setHasSupported(
    false
  );

  setCommentText(
    ""
  );

  setReplyText(
    ""
  );

  setReplyingTo(
    null
  );

  setExpandedReplies(
    {}
  );

  try {

    const response =
      await apiRequest(
        `/api/issues/${issue.id}`
      );

    const rawIssue =
      response?.data ??
      response?.issue ??
      issue;

    setSelectedIssue(
      normalizeIssue(
        rawIssue
      )
    );

    await loadIssueData(
      issue.id
    );

  } catch (error) {

    console.error(
      "Issue detail loading error:",
      error
    );

    setSelectedIssueError(
      error instanceof Error
        ? error.message
        : "Unable to load issue details."
    );

  }

}

  /* ==========================================================
     OPEN ISSUE FROM CREATE-ISSUE DUPLICATE REDIRECT
  ========================================================== */

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedIssueId =
      localStorage.getItem(
        "cc_open_issue_id"
      );

    const params =
      new URLSearchParams(
        window.location.search
      );

    const queryIssueId =
      params.get(
        "openIssueId"
      );

    const rawIssueId =
      queryIssueId ||
      storedIssueId;

    if (!rawIssueId) {
      return;
    }

    const issueId = Number(
      rawIssueId
    );

    if (
      !Number.isFinite(issueId) ||
      issueId <= 0
    ) {
      localStorage.removeItem(
        "cc_open_issue_id"
      );
      return;
    }

    localStorage.removeItem(
      "cc_open_issue_id"
    );

    async function openPendingIssue() {
      try {
        const response =
          await apiRequest(
            `/api/issues/${issueId}`
          );

        const rawIssue =
          response?.data ??
          response?.issue;

        if (!rawIssue) {
          throw new Error(
            "Unable to load the existing issue."
          );
        }

        const normalizedIssue =
          normalizeIssue(
            rawIssue
          );

        setActiveView(
          "issues"
        );

        await openIssue(
          normalizedIssue,
          false
        );

        /*
         * Remove the query parameter after it has been consumed.
         * This prevents the same issue from reopening after a refresh.
         */
        const cleanUrl =
          window.location.pathname;

        window.history.replaceState(
          {},
          document.title,
          cleanUrl
        );

      } catch (error) {
        console.error(
          "Pending issue opening error:",
          error
        );

        setSelectedIssueError(
          error instanceof Error
            ? error.message
            : "Unable to open the existing issue."
        );

        setActiveView(
          "issues"
        );
      }
    }

    openPendingIssue();
  }, []);


  /* ==========================================================
     REFRESH COMMENTS
  ========================================================== */

  async function refreshComments() {

    if (!selectedIssue) {
      return;
    }

    try {

      setCommentsLoading(
        true
      );

      setCommentsError(
        ""
      );

      const response =
        await apiRequest(
          `/api/comments/issue/${selectedIssue.id}`
        );

      const freshComments =
        extractComments(
          response
        );

      setComments(
        freshComments
      );

      /*
       * Keep the current expanded state where possible,
       * but never automatically expand a new thread.
       */
      setExpandedReplies(
        (current) => {

          const next: Record<
            number,
            boolean
          > = {};

          for (
            const comment of freshComments
          ) {

            if (
              current[
                comment.id
              ]
            ) {

              next[
                comment.id
              ] = true;

            }

          }

          return next;

        }
      );


      setSelectedIssue(
        (current) =>
          current
            ? {
                ...current,
                comment_count:
                  freshComments.length,
              }
            : current
      );


      setCommunityIssues(
        (current) =>
          current.map(
            (issue) =>
              issue.id ===
              selectedIssue.id
                ? {
                    ...issue,
                    comment_count:
                      freshComments.length,
                  }
                : issue
          )
      );


      setMyIssues(
        (current) =>
          current.map(
            (issue) =>
              issue.id ===
              selectedIssue.id
                ? {
                    ...issue,
                    comment_count:
                      freshComments.length,
                  }
                : issue
          )
      );

    } catch (error) {

      console.error(
        "Comment refresh error:",
        error
      );

      setCommentsError(
        error instanceof Error
          ? error.message
          : "Unable to refresh comments."
      );

    } finally {

      setCommentsLoading(
        false
      );

    }

  }


  /* ==========================================================
     CREATE COMMENT
  ========================================================== */

  async function submitComment() {

    if (
      !selectedIssue ||
      !commentText.trim()
    ) {
      return;
    }

    try {

      setCommentSubmitting(
        true
      );

      setCommentsError(
        ""
      );

      await apiRequest(
        "/api/comments",
        {
          method: "POST",

          body: JSON.stringify({
            issue_id:
              selectedIssue.id,

            content:
              commentText.trim(),
          }),
        }
      );

      setCommentText(
        ""
      );

      await refreshComments();

    } catch (error) {

      console.error(
        "Comment creation error:",
        error
      );

      setCommentsError(
        error instanceof Error
          ? error.message
          : "Unable to post your comment."
      );

    } finally {

      setCommentSubmitting(
        false
      );

    }

  }


  /* ==========================================================
     CREATE REPLY
  ========================================================== */

  async function submitReply(
    parentId: number
  ) {

    if (
      !selectedIssue ||
      !replyText.trim()
    ) {
      return;
    }

    try {

      setReplySubmitting(
        true
      );

      setCommentsError(
        ""
      );

      await apiRequest(
        "/api/comments/reply",
        {
          method: "POST",

          body: JSON.stringify({
            issue_id:
              selectedIssue.id,

            content:
              replyText.trim(),

            parent_id:
              parentId,
          }),
        }
      );

      setReplyText(
        ""
      );

      setReplyingTo(
        null
      );


      /*
       * Automatically open the parent comment's
       * replies after the user posts a reply.
       */
      setExpandedReplies(
        (current) => ({
          ...current,
          [parentId]: true,
        })
      );


      await refreshComments();

    } catch (error) {

      console.error(
        "Reply creation error:",
        error
      );

      setCommentsError(
        error instanceof Error
          ? error.message
          : "Unable to post your reply."
      );

    } finally {

      setReplySubmitting(
        false
      );

    }

  }


  /* ==========================================================
     SUPPORT
  ========================================================== */

  async function supportIssue() {

    if (!selectedIssue) {
      return;
    }

    try {

      setSupportLoading(
        true
      );

      setSupportError(
        ""
      );

      const response =
        await apiRequest(
          `/api/supports/${selectedIssue.id}`,
          {
            method: "POST",
          }
        );

      const newCount =
        Number(
          response?.support_count ??
            0
        );

      setSupportCount(
        Number.isFinite(
          newCount
        )
          ? newCount
          : supportCount
      );

      setHasSupported(
        response?.supported ===
          true
      );

      setSelectedIssue(
        (current) =>
          current
            ? {
                ...current,
                support_count:
                  Number.isFinite(
                    newCount
                  )
                    ? newCount
                    : current.support_count,
              }
            : current
      );

      setCommunityIssues(
        (current) =>
          current.map(
            (issue) =>
              issue.id ===
              selectedIssue.id
                ? {
                    ...issue,
                    support_count:
                      Number.isFinite(
                        newCount
                      )
                        ? newCount
                        : issue.support_count,
                  }
                : issue
          )
      );

    } catch (error) {

      console.error(
        "Support error:",
        error
      );

      setSupportError(
        error instanceof Error
          ? error.message
          : "Unable to update support."
      );

    } finally {

      setSupportLoading(
        false
      );

    }

  }


  /* ==========================================================
     UPDATE STATUS
  ========================================================== */

  async function updateIssueStatus(
    status: string
  ) {

    if (!selectedIssue) {
      return;
    }

    try {

      setStatusUpdating(
        true
      );

      setSelectedIssueError(
        ""
      );

      const response =
        await apiRequest(
          `/api/issues/${selectedIssue.id}/status`,
          {
            method: "PATCH",

            body: JSON.stringify({
              status,
            }),
          }
        );

      const updated =
        response?.issue ??
        response?.data ??
        {};

      const updatedStatus =
        updated?.status ??
        status;

      setSelectedIssue(
        (current) =>
          current
            ? {
                ...current,
                status:
                  updatedStatus,
              }
            : current
      );

      setMyIssues(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              selectedIssue.id
                ? {
                    ...item,
                    status:
                      updatedStatus,
                  }
                : item
          )
      );

      try {

        const [
          overviewResponse,
          resolutionResponse,
        ] = await Promise.all([
          apiRequest(
            "/api/dashboard/overview"
          ),

          apiRequest(
            "/api/dashboard/resolution-statistics"
          ),
        ]);

        setOverview(
          overviewResponse?.data ??
            overviewResponse ??
            EMPTY_OVERVIEW
        );

        setResolutionStats(
          resolutionResponse?.data ??
            resolutionResponse ??
            EMPTY_RESOLUTION
        );

      } catch {
        /*
         * Dashboard refresh failure should not
         * invalidate a successful status change.
         */
      }

    } catch (error) {

      console.error(
        "Issue status update error:",
        error
      );

      setSelectedIssueError(
        error instanceof Error
          ? error.message
          : "Unable to update issue status."
      );

    } finally {

      setStatusUpdating(
        false
      );

    }

  }


  /* ==========================================================
     NOTIFICATION READ
  ========================================================== */

  async function markNotificationRead(
    notification: NotificationItem
  ) {

    if (
      notification.read ||
      notification.is_read
    ) {
      return;
    }

    try {

      await apiRequest(
        `/api/notifications/${notification.id}/read`,
        {
          method: "PATCH",
        }
      );

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    read: true,
                    is_read: true,
                  }
                : item
          )
      );

    } catch (error) {

      console.error(
        "Notification read error:",
        error
      );

    }

  }


  /* ==========================================================
     OPEN NOTIFICATION
  ========================================================== */

  async function openIssueFromNotification(
    notification: NotificationItem
  ) {

    try {

      await markNotificationRead(
        notification
      );

      if (
        !notification.issue_id
      ) {
        return;
      }

      const response =
        await apiRequest(
          `/api/issues/${notification.issue_id}`
        );

      const rawIssue =
        response?.data ??
        response?.issue;

      if (!rawIssue) {
        throw new Error(
          "Unable to load the related issue."
        );
      }

      setActiveView(
        "issues"
      );

      await openIssue(
        normalizeIssue(
          rawIssue
        ),
        false
      );

    } catch (error) {

      console.error(
        "Notification issue navigation error:",
        error
      );

      setSelectedIssueError(
        error instanceof Error
          ? error.message
          : "Unable to open the related issue."
      );

      setActiveView(
        "issues"
      );

    }

  }


  /* ==========================================================
     MARK ALL NOTIFICATIONS READ
  ========================================================== */

  async function markAllNotificationsRead() {

    try {

      setNotificationActionLoading(
        true
      );

      await apiRequest(
        "/api/notifications/read-all",
        {
          method: "PATCH",
        }
      );

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              read: true,
              is_read: true,
            })
          )
      );

    } catch (error) {

      console.error(
        "Mark all notifications error:",
        error
      );

    } finally {

      setNotificationActionLoading(
        false
      );

    }

  }


  function openProfileModal() {
    setSettingsModalOpen(false);
    setProfileModalOpen(true);
  }


  function openSettingsModal() {
    setProfileModalOpen(false);
    setSettingsModalOpen(true);
  }


  function closeAccountModal() {
    setProfileModalOpen(false);
    setSettingsModalOpen(false);
  }


  const [globalSearch, setGlobalSearch] =
    useState(
      ""
    );

  function handleTopbarSearchChange(value: string) {
    setGlobalSearch(
      value
    );
  }

  const [globalSearchResults, setGlobalSearchResults] =
    useState<Issue[]>([]);

  const [globalSearchLoading, setGlobalSearchLoading] =
    useState(false);

  const [globalSearchError, setGlobalSearchError] =
    useState(
      ""
    );

  useEffect(() => {
    const query = globalSearch.trim();

    if (!query) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      setGlobalSearchError(
        ""
      );
      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            setGlobalSearchLoading(
              true
            );
            setGlobalSearchError(
              ""
            );

            const response =
              await apiRequest(
                `/api/issues/search?search=${encodeURIComponent(query)}`
              );

            const results =
              Array.isArray(
                response?.issues
              )
                ? response.issues
                : Array.isArray(
                    response?.data
                  )
                  ? response.data
                  : [];

            setGlobalSearchResults(
              results
                .slice(0, 8)
                .map(
                  normalizeIssue
                )
            );
          } catch (error) {
            console.error(
              "Global search error:",
              error
            );

            setGlobalSearchResults([]);
            setGlobalSearchError(
              error instanceof Error
                ? error.message
                : "Unable to search issues."
            );
          } finally {
            setGlobalSearchLoading(
              false
            );
          }
        },
        300
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    globalSearch,
  ]);


  function handleTopbarSearchResultClick(
    issue: SearchIssue
  ) {
    setGlobalSearch(
      ""
    );
    setGlobalSearchResults(
      []
    );
    setActiveView(
      "issues"
    );
    void openIssue(
      normalizeIssue(
        issue
      ),
      false
    );
  }


  /* ==========================================================
     FILTERED MY ISSUES
  ========================================================== */

  const filteredMyIssues =
    useMemo(() => {

      const query =
        issueSearch
          .trim()
          .toLowerCase();

      return myIssues.filter(
        (issue) => {

          const searchMatch =
            !query ||
            issue.title
              .toLowerCase()
              .includes(
                query
              ) ||
            issue.company
              .toLowerCase()
              .includes(
                query
              ) ||
            (
              issue.category ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              );

          const statusMatch =
            issueStatusFilter ===
              "All" ||
            issue.status ===
              issueStatusFilter;

          return (
            searchMatch &&
            statusMatch
          );

        }
      );

    }, [
      myIssues,
      issueSearch,
      issueStatusFilter,
    ]);


  /* ==========================================================
     FILTERED COMMUNITY
  ========================================================== */

  const filteredCommunityIssues =
    useMemo(() => {

      const query =
        communitySearch
          .trim()
          .toLowerCase();

      return communityIssues.filter(
        (issue) => {

          if (!query) {
            return true;
          }

          return (
            issue.title
              .toLowerCase()
              .includes(
                query
              ) ||
            issue.company
              .toLowerCase()
              .includes(
                query
              ) ||
            (
              issue.category ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            (
              issue.description ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              )
          );

        }
      );

    }, [
      communityIssues,
      communitySearch,
    ]);


  /* ==========================================================
     DERIVED VALUES
  ========================================================== */

  const maxTrend =
    Math.max(
      ...monthlyTrends.map(
        (
          item
        ) =>
          item.count
      ),
      1
    );

  const unreadNotifications =
    notifications.filter(
      (
        notification
      ) =>
        !notification.read &&
        !notification.is_read
    ).length;


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function navigate(
    view: DashboardView
  ) {

    setActiveView(
      view
    );

    setSelectedIssue(
      null
    );

    setSelectedFromCommunity(
      false
    );

    setSelectedIssueError(
      ""
    );

    setComments(
      []
    );

    setCompanyResponses(
      []
    );

    setReplyingTo(
      null
    );

    setReplyText(
      ""
    );

    setExpandedReplies(
      {}
    );

  }


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="min-h-screen bg-[#F5F5F7]">

      <Sidebar
        activeView={activeView}
        onViewChange={navigate}
        profile={profile}
        unreadNotificationCount={unreadNotifications}
        onProfileClick={openProfileModal}
        onSettingsClick={openSettingsModal}
      />


      <div className="ml-[294px] min-h-screen min-w-0">

        <Topbar
          searchValue={globalSearch}
          onSearchChange={handleTopbarSearchChange}
          searchPlaceholder="Search Issues..."
          searchResults={globalSearchResults}
          searchLoading={globalSearchLoading}
          searchError={globalSearchError}
          onSearchResultClick={handleTopbarSearchResultClick}
          unreadNotificationCount={unreadNotifications}
          notifications={notifications}
          onNotificationClick={openIssueFromNotification}
          profile={profile}
          onProfileClick={openProfileModal}
        />


        <section className="min-h-[calc(100vh-72px)]">


          {/* ==================================================
              OVERVIEW
          ================================================== */}

          {activeView ===
            "overview" && (

            <div className="mx-auto w-full max-w-[1600px] px-6 py-7 lg:px-8 lg:py-8">

              <div className="mb-7">

                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">
                  Dashboard
                </h1>

                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Overview of your consumer activity
                </p>

              </div>


              {dashboardError && (
                <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">

                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  {dashboardError}

                </div>
              )}


              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                  title="Total Issues"
                  value={
                    dashboardLoading
                      ? "â€”"
                      : String(
                          overview.total_issues
                        )
                  }
                  change="Live"
                  changeType="neutral"
                  icon={
                    <MessageSquareWarning
                      size={18}
                    />
                  }
                />

                <StatCard
                  title="Resolved"
                  value={
                    dashboardLoading
                      ? "â€”"
                      : String(
                          overview.resolved_issues
                        )
                  }
                  change="Live"
                  changeType="neutral"
                  icon={
                    <CheckCircle2
                      size={18}
                    />
                  }
                />

                <StatCard
                  title="Pending"
                  value={
                    dashboardLoading
                      ? "â€”"
                      : String(
                          overview.open_issues +
                            overview.in_progress_issues
                        )
                  }
                  change="Live"
                  changeType="neutral"
                  icon={
                    <Clock3 size={18} />
                  }
                />

                <StatCard
                  title="Response Rate"
                  value={
                    dashboardLoading
                      ? "â€”"
                      : `${resolutionStats.resolution_rate}%`
                  }
                  change="Live"
                  changeType="neutral"
                  icon={
                    <TrendingUp
                      size={18}
                    />
                  }
                />

              </div>


              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">

                <div className="min-h-[500px] rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
                      <BarChart3
                        size={20}
                      />
                    </div>

                    <div>

                      <h2 className="text-[16px] font-semibold text-[#111827]">
                        Issue Overview
                      </h2>

                      <p className="mt-1 text-sm text-[#9CA3AF]">
                        Monthly issue trend
                      </p>

                    </div>

                  </div>


                  <div className="mt-12">

                    <div className="flex h-[250px] items-end gap-4 border-b border-[#EEEEF0] px-1">

                      {monthlyTrends.length ===
                      0 ? (

                        <div className="flex h-full w-full items-center justify-center text-sm text-[#9CA3AF]">
                          {dashboardLoading
                            ? "Loading..."
                            : "No issue data available"}
                        </div>

                      ) : (

                        monthlyTrends.map(
                          (
                            item
                          ) => (

                            <div
                              key={`${item.year}-${item.month}`}
                              className="flex h-full flex-1 items-end"
                            >

                              <div
                                className="w-full rounded-t-[12px] bg-[#E4E5E8]"
                                style={{
                                  height: `${
                                    (
                                      item.count /
                                      maxTrend
                                    ) *
                                    100
                                  }%`,
                                }}
                              />

                            </div>

                          )
                        )

                      )}

                    </div>


                    {monthlyTrends.length >
                      0 && (

                      <div className="mt-4 flex px-1 text-xs text-[#9CA3AF]">

                        {monthlyTrends.map(
                          (
                            item
                          ) => (

                            <span
                              key={`${item.year}-${item.month}`}
                              className="flex-1 text-center"
                            >
                              {new Date(
                                item.year,
                                item.month -
                                  1
                              ).toLocaleString(
                                "en-US",
                                {
                                  month:
                                    "short",
                                }
                              )}
                            </span>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </div>


                <AIInsightCard />

              </div>


              <div className="mt-6">

                <ActivityFeed />

              </div>

            </div>

          )}


          {/* ==================================================
              COMMUNITY
          ================================================== */}

          {activeView ===
            "community" && (

            <div className="mx-auto w-full max-w-[1100px] px-6 py-7 lg:px-8 lg:py-8">

              {!selectedIssue ? (

                <>

                  <div className="mb-7">

                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                      Community
                    </p>

                    <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#111827]">
                      Consumer Community
                    </h1>

                    <p className="mt-2 max-w-[720px] text-sm leading-6 text-[#9CA3AF]">
                      Discover issues reported by other consumers, support problems you relate to, and join the discussion.
                    </p>

                  </div>


                  <div className="mb-6 rounded-[22px] border border-[#E7E7EA] bg-white p-4">

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                      <div className="relative w-full lg:max-w-[500px]">

                        <Search
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                        />

                        <input
                          value={
                            communitySearch
                          }
                          onChange={(event) =>
                            setCommunitySearch(
                              event.target.value
                            )
                          }
                          placeholder="Search community issues..."
                          className="h-11 w-full rounded-full border border-[#E7E7EA] bg-[#FAFAFA] pl-11 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#D1D5DB] focus:bg-white"
                        />

                      </div>


                      <div className="flex flex-wrap gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setCommunitySort(
                              "trending"
                            )
                          }
                          className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                            communitySort ===
                            "trending"
                              ? "bg-[#111111] text-white"
                              : "border border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9]"
                          }`}
                        >
                          Trending
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            setCommunitySort(
                              "latest"
                            )
                          }
                          className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                            communitySort ===
                            "latest"
                              ? "bg-[#111111] text-white"
                              : "border border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9]"
                          }`}
                        >
                          Latest
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            setCommunitySort(
                              "supported"
                            )
                          }
                          className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                            communitySort ===
                            "supported"
                              ? "bg-[#111111] text-white"
                              : "border border-[#E7E7EA] bg-white text-[#6B7280] hover:bg-[#F8F8F9]"
                          }`}
                        >
                          Most Supported
                        </button>

                      </div>

                    </div>

                  </div>


                  {communityError && (
                    <div className="mb-6 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {
                        communityError
                      }
                    </div>
                  )}


                  {communityLoading ? (

                    <div className="space-y-4">

                      {[1, 2, 3, 4].map(
                        (
                          item
                        ) => (

                          <div
                            key={item}
                            className="h-[190px] animate-pulse rounded-[24px] bg-white"
                          />

                        )
                      )}

                    </div>

                  ) : filteredCommunityIssues.length ===
                    0 ? (

                    <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-14 text-center">

                      <MessageSquareWarning
                        size={28}
                        className="mx-auto text-[#B8BABF]"
                      />

                      <p className="mt-4 text-sm font-semibold text-[#374151]">
                        No community issues found
                      </p>

                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        Try another search or check back later.
                      </p>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      {filteredCommunityIssues.map(
                        (
                          issue
                        ) => (

                          <button
                            key={
                              issue.id
                            }
                            type="button"
                            onClick={() =>
                              openIssue(
                                issue,
                                true
                              )
                            }
                            className="group w-full rounded-[24px] border border-[#E7E7EA] bg-white p-6 text-left transition hover:-translate-y-[1px] hover:border-[#D5D6D9] hover:shadow-[0_14px_35px_rgba(0,0,0,0.05)]"
                          >

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-full bg-[#F5F5F7] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#6B7280]">
                                {
                                  issue.company
                                }
                              </span>

                              {issue.category && (
                                <span className="rounded-full bg-[#F8F8F9] px-2.5 py-1 text-[10px] text-[#9CA3AF]">
                                  {
                                    issue.category
                                  }
                                </span>
                              )}

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] ${getStatusClass(
                                  issue.status
                                )}`}
                              >
                                {
                                  issue.status
                                }
                              </span>

                            </div>


                            <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.01em] text-[#111827]">
                              {
                                issue.title
                              }
                            </h2>


                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6B7280]">
                              {
                                issue.description ||
                                "No description provided."
                              }
                            </p>


                            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#EEEEF0] pt-5">

                              <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                                <ThumbsUp
                                  size={15}
                                />

                                {
                                  issue.support_count
                                }{" "}
                                supports
                              </span>


                              <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                                <MessageCircle
                                  size={15}
                                />

                                {
                                  issue.comment_count
                                }{" "}
                                comments
                              </span>


                              <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                                <TrendingUp
                                  size={15}
                                />

                                {Math.round(
                                  issue.trending_score ||
                                    0
                                )}{" "}
                                trending
                              </span>

                            </div>

                          </button>

                        )
                      )}

                    </div>

                  )}

                </>

              ) : (

                <>

                  <button
                    type="button"
                    onClick={() => {

                      setSelectedIssue(
                        null
                      );

                      setSelectedFromCommunity(
                        false
                      );

                      setExpandedReplies(
                        {}
                      );

                    }}
                    className="mb-7 flex items-center gap-2 text-sm text-[#6B7280] transition hover:text-[#111827]"
                  >

                    <ChevronLeft
                      size={17}
                    />

                    Back to Community

                  </button>


                  {selectedIssueError && (
                    <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">

                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      {
                        selectedIssueError
                      }

                    </div>
                  )}


                  <IssueDetails
                    issue={
                      selectedIssue
                    }
                    fromCommunity={
                      selectedFromCommunity
                    }
                    comments={
                      comments
                    }
                    commentsLoading={
                      commentsLoading
                    }
                    commentsError={
                      commentsError
                    }
                    commentText={
                      commentText
                    }
                    setCommentText={
                      setCommentText
                    }
                    submitComment={
                      submitComment
                    }
                    commentSubmitting={
                      commentSubmitting
                    }
                    replyingTo={
                      replyingTo
                    }
                    setReplyingTo={
                      setReplyingTo
                    }
                    replyText={
                      replyText
                    }
                    setReplyText={
                      setReplyText
                    }
                    submitReply={
                      submitReply
                    }
                    replySubmitting={
                      replySubmitting
                    }
                    expandedReplies={
                      expandedReplies
                    }
                    setExpandedReplies={
                      setExpandedReplies
                    }
                    companyResponses={
                      companyResponses
                    }
                    responsesLoading={
                      responsesLoading
                    }
                    responsesError={
                      responsesError
                    }
                    supportCount={
                      supportCount
                    }
                    supportLoading={
                      supportLoading
                    }
                    supportError={
                      supportError
                    }
                    hasSupported={
                      hasSupported
                    }
                    supportIssue={
                      supportIssue
                    }
                    statusUpdating={
                      statusUpdating
                    }
                    updateIssueStatus={
                      updateIssueStatus
                    }
                  />

                </>

              )}

            </div>

          )}


          {/* ==================================================
              MY ISSUES
          ================================================== */}

          {activeView ===
            "issues" && (

            <div className="mx-auto w-full max-w-[1100px] px-6 py-7 lg:px-8 lg:py-8">

              {!selectedIssue ? (

                <>

                  <div className="mb-7 flex items-end justify-between gap-6">

                    <div>

                      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">
                        My Issues
                      </h1>

                      <p className="mt-1 text-sm text-[#9CA3AF]">
                        View and manage the issues submitted from your account.
                      </p>

                    </div>

                    <div className="hidden text-right sm:block">

                      <p className="text-2xl font-semibold text-[#111827]">
                        {
                          myIssues.length
                        }
                      </p>

                      <p className="text-xs text-[#9CA3AF]">
                        Total issues
                      </p>

                    </div>

                  </div>


                  {issuesError && (
                    <div className="mb-6 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {
                        issuesError
                      }
                    </div>
                  )}


                  <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                      <div className="relative flex-1 md:max-w-[420px]">

                        <Search
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                        />

                        <input
                          value={
                            issueSearch
                          }
                          onChange={(event) =>
                            setIssueSearch(
                              event.target.value
                            )
                          }
                          placeholder="Search your issues..."
                          className="h-11 w-full rounded-full border border-[#E7E7EA] bg-[#FAFAFA] pl-11 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#D1D5DB] focus:bg-white"
                        />

                      </div>


                      <select
                        value={
                          issueStatusFilter
                        }
                        onChange={(event) =>
                          setIssueStatusFilter(
                            event.target.value
                          )
                        }
                        className="h-11 rounded-full border border-[#E7E7EA] bg-white px-4 text-sm text-[#6B7280] outline-none"
                      >

                        <option value="All">
                          All statuses
                        </option>

                        <option value="Open">
                          Open
                        </option>

                        <option value="In Progress">
                          In Progress
                        </option>

                        <option value="Resolved">
                          Resolved
                        </option>

                        <option value="Closed">
                          Closed
                        </option>

                      </select>

                    </div>


                    <div className="my-6 h-px bg-[#EEEEF0]" />


                    {issuesLoading ? (

                      <div className="space-y-4">

                        {[1, 2, 3, 4].map(
                          (
                            item
                          ) => (

                            <div
                              key={
                                item
                              }
                              className="flex items-center gap-4 rounded-[16px] bg-[#F8F8F9] p-4"
                            >

                              <div className="h-11 w-11 animate-pulse rounded-[13px] bg-[#E8E8EA]" />

                              <div className="flex-1">

                                <div className="h-4 w-1/3 animate-pulse rounded bg-[#E8E8EA]" />

                                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#F0F0F2]" />

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    ) : filteredMyIssues.length ===
                      0 ? (

                      <div className="py-14 text-center">

                        <MessageSquareWarning
                          size={24}
                          className="mx-auto text-[#B8BABF]"
                        />

                        <p className="mt-4 text-sm font-medium text-[#374151]">
                          No issues found
                        </p>

                        <p className="mt-1 text-xs text-[#9CA3AF]">
                          Try changing your search or status filter.
                        </p>

                      </div>

                    ) : (

                      <div className="divide-y divide-[#EEEEF0]">

                        {filteredMyIssues.map(
                          (
                            issue
                          ) => (

                            <button
                              key={
                                issue.id
                              }
                              type="button"
                              onClick={() =>
                                openIssue(
                                  issue,
                                  false
                                )
                              }
                              className="flex w-full items-center gap-4 py-5 text-left transition hover:bg-[#FAFAFA]"
                            >

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#F5F5F7] text-[#6B7280]">
                                <MessageSquareWarning
                                  size={18}
                                />
                              </div>


                              <div className="min-w-0 flex-1">

                                <p className="truncate text-[14px] font-medium text-[#111827]">
                                  {
                                    issue.title
                                  }
                                </p>

                                <p className="mt-1 truncate text-xs text-[#9CA3AF]">
                                  {
                                    issue.company
                                  }

                                  {issue.category
                                    ? ` Â· ${issue.category}`
                                    : ""}
                                </p>

                              </div>


                              <span className="hidden shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 sm:inline-flex">
                                {
                                  issue.severity ||
                                  "Standard"
                                }
                              </span>


                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClass(
                                  issue.status
                                )}`}
                              >
                                {
                                  issue.status
                                }
                              </span>

                            </button>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </>

              ) : (

                <>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIssue(
                        null
                      )
                    }
                    className="mb-7 flex items-center gap-2 text-sm text-[#6B7280] transition hover:text-[#111827]"
                  >

                    <ChevronLeft
                      size={17}
                    />

                    Back to My Issues

                  </button>


                  {selectedIssueError && (
                    <div className="mb-6 flex items-start gap-3 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">

                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      {
                        selectedIssueError
                      }

                    </div>
                  )}


                  <IssueDetails
                    issue={
                      selectedIssue
                    }
                    fromCommunity={
                      false
                    }
                    comments={
                      comments
                    }
                    commentsLoading={
                      commentsLoading
                    }
                    commentsError={
                      commentsError
                    }
                    commentText={
                      commentText
                    }
                    setCommentText={
                      setCommentText
                    }
                    submitComment={
                      submitComment
                    }
                    commentSubmitting={
                      commentSubmitting
                    }
                    replyingTo={
                      replyingTo
                    }
                    setReplyingTo={
                      setReplyingTo
                    }
                    replyText={
                      replyText
                    }
                    setReplyText={
                      setReplyText
                    }
                    submitReply={
                      submitReply
                    }
                    replySubmitting={
                      replySubmitting
                    }
                    expandedReplies={
                      expandedReplies
                    }
                    setExpandedReplies={
                      setExpandedReplies
                    }
                    companyResponses={
                      companyResponses
                    }
                    responsesLoading={
                      responsesLoading
                    }
                    responsesError={
                      responsesError
                    }
                    supportCount={
                      supportCount
                    }
                    supportLoading={
                      supportLoading
                    }
                    supportError={
                      supportError
                    }
                    hasSupported={
                      hasSupported
                    }
                    supportIssue={
                      supportIssue
                    }
                    statusUpdating={
                      statusUpdating
                    }
                    updateIssueStatus={
                      updateIssueStatus
                    }
                  />

                </>

              )}

            </div>

          )}


          {/* ==================================================
              NOTIFICATIONS
          ================================================== */}

          {activeView ===
            "notifications" && (

            <div className="mx-auto w-full max-w-[1000px] px-6 py-7 lg:px-8 lg:py-8">

              <div className="mb-7 flex items-end justify-between gap-5">

                <div>

                  <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">
                    Notifications
                  </h1>

                  <p className="mt-1 text-sm text-[#9CA3AF]">
                    Stay updated on your issues and account activity.
                  </p>

                </div>


                {unreadNotifications >
                  0 && (

                  <button
                    type="button"
                    disabled={
                      notificationActionLoading
                    }
                    onClick={
                      markAllNotificationsRead
                    }
                    className="flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-4 py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F8F8F9] disabled:opacity-50"
                  >

                    {notificationActionLoading ? (
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={15}
                      />
                    )}

                    Mark all as read

                  </button>

                )}

              </div>


              {notificationsError && (
                <div className="mb-6 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {
                    notificationsError
                  }
                </div>
              )}


              <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">

                {notificationsLoading ? (

                  <div className="py-12 text-center text-sm text-[#9CA3AF]">
                    Loading notifications...
                  </div>

                ) : notifications.length ===
                  0 ? (

                  <div className="py-14 text-center">

                    <Bell
                      size={24}
                      className="mx-auto text-[#B8BABF]"
                    />

                    <p className="mt-4 text-sm font-medium text-[#374151]">
                      No notifications
                    </p>

                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      You're all caught up.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-[#EEEEF0]">

                    {notifications.map(
                      (
                        notification
                      ) => {

                        const isRead =
                          Boolean(
                            notification.read ||
                              notification.is_read
                          );

                        return (

                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              openIssueFromNotification(
                                notification
                              )
                            }
                            className="flex w-full items-start gap-4 py-5 text-left transition hover:bg-[#FAFAFA] first:pt-0 last:pb-0"
                          >

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${
                                isRead
                                  ? "bg-[#F5F5F7] text-[#9CA3AF]"
                                  : "bg-[#111111] text-white"
                              }`}
                            >

                              <Bell
                                size={18}
                              />

                            </div>


                            <div className="min-w-0 flex-1">

                              <div className="flex items-center gap-2">

                                <p className="text-sm font-medium text-[#111827]">
                                  {
                                    notification.title ||
                                    notification.type ||
                                    "Notification"
                                  }
                                </p>

                                {!isRead && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                                )}

                              </div>


                              <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                                {
                                  notification.message ||
                                  "You have a new notification."
                                }
                              </p>


                              <div className="mt-2 flex flex-wrap items-center gap-3">

                                {notification.created_at && (
                                  <p className="text-[11px] text-[#B0B3B8]">
                                    {formatDate(
                                      notification.created_at
                                    )}
                                  </p>
                                )}

                                {notification.issue_id && (
                                  <span className="text-[11px] font-medium text-[#6B7280]">
                                    View issue
                                  </span>
                                )}

                              </div>

                            </div>

                          </button>

                        );

                      }
                    )}

                  </div>

                )}

              </div>

            </div>

          )}


          {/* ==================================================
              SUPPORT
          ================================================== */}

          {activeView ===
            "support" && (

            <div className="mx-auto w-full max-w-[1100px] px-6 py-7 lg:px-8 lg:py-8">

              <div className="mb-7">

                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#111827]">
                  Support
                </h1>

                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Get help with ConsumerConnect and your issues.
                </p>

              </div>


              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">


                <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
                    <LifeBuoy
                      size={20}
                    />
                  </div>

                  <h2 className="mt-5 text-[16px] font-semibold text-[#111827]">
                    Need help with an issue?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                    Open My Issues and select an issue to review its status, company response, support and community discussion.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "issues"
                      )
                    }
                    className="mt-6 flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424]"
                  >

                    View My Issues

                    <ExternalLink
                      size={15}
                    />

                  </button>

                </div>


                <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
                    <MessageSquare
                      size={20}
                    />
                  </div>

                  <h2 className="mt-5 text-[16px] font-semibold text-[#111827]">
                    Community responses
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                    Browse community issues, support problems that matter to you, and join discussions.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "community"
                      )
                    }
                    className="mt-6 flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-5 py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F8F8F9]"
                  >

                    Open Community

                    <ExternalLink
                      size={15}
                    />

                  </button>

                </div>


                <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
                    <RefreshCw
                      size={20}
                    />
                  </div>

                  <h2 className="mt-5 text-[16px] font-semibold text-[#111827]">
                    Issue status
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                    Review and update the status of your own issues from their details.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "issues"
                      )
                    }
                    className="mt-6 flex items-center gap-2 rounded-full border border-[#E7E7EA] bg-white px-5 py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#F8F8F9]"
                  >

                    Manage Issues

                    <RefreshCw
                      size={15}
                    />

                  </button>

                </div>


                <div className="rounded-[24px] border border-[#E7E7EA] bg-white p-7">

                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-[#6B7280]">
                    <Send
                      size={20}
                    />
                  </div>

                  <h2 className="mt-5 text-[16px] font-semibold text-[#111827]">
                    Create a new issue
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                    Have a new consumer problem? Submit an issue and let ConsumerConnect analyze it.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/create-issue";
                    }}
                    className="mt-6 flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#242424]"
                  >

                    Create Issue

                    <Send
                      size={15}
                    />

                  </button>

                </div>

              </div>


              <div className="mt-6 rounded-[20px] border border-[#E7E7EA] bg-white p-6">

                <div className="flex items-start gap-3">

                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-[#9CA3AF]"
                  />

                  <div>

                    <p className="text-sm font-medium text-[#374151]">
                      ConsumerConnect community
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">
                      Every issue can have an official company response plus a community discussion where consumers can support, comment and reply.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          )}

        </section>

      </div>

      <ProfileSettingsModal
        profile={profile}
        openProfile={profileModalOpen}
        openSettings={settingsModalOpen}
        onClose={closeAccountModal}
      />

    </main>
  );
}