import { query, usePostgres } from "../db/pool.js";
import type { AuthenticatedUser } from "../middleware/authMiddleware.js";
import { canExposeResults, resolveElectionPhase } from "../utils/electionState.js";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "election";
  createdAt: string;
  electionId?: string;
}

export async function listNotificationsForUser(user?: AuthenticatedUser): Promise<NotificationItem[]> {
  if (user?.role !== "voter" || !user.electionId || !user.nationalId || !usePostgres) {
    return [];
  }

  const voterResult = await query<{
    voter_id: string;
    full_name: string;
    has_voted: boolean;
    verified_face: boolean;
    voter_status: string;
    updated_at: string;
    election_id: string;
    election_title: string;
    election_status: string;
    start_at: string;
    end_at: string;
    allow_results_visibility_before_close: boolean;
  }>(
    `SELECT v.id AS voter_id,
            v.full_name,
            v.has_voted,
            v.verified_face,
            v.status AS voter_status,
            v.updated_at,
            e.id AS election_id,
            e.title AS election_title,
            e.status AS election_status,
            e.start_at,
            e.end_at,
            e.allow_results_visibility_before_close
     FROM voters v
     JOIN elections e ON e.id = v.election_id
     WHERE v.election_id = $1
       AND v.national_id = $2
     LIMIT 1`,
    [user.electionId, user.nationalId]
  );

  const voter = voterResult.rows[0];
  if (!voter) {
    return [];
  }

  const auditResult = await query<{ action_type: string; created_at: string }>(
    `SELECT action_type, created_at
     FROM audit_logs
     WHERE actor_type = 'voter'
       AND actor_id = $1
       AND action_type IN ('vote_cast', 'token_issued')
     ORDER BY created_at DESC`,
    [voter.voter_id]
  );

  const latestVoteCast = auditResult.rows.find((item) => item.action_type === "vote_cast");
  const latestTokenIssue = auditResult.rows.find((item) => item.action_type === "token_issued");

  const notifications: NotificationItem[] = [];
  const electionPhase = resolveElectionPhase({
    status: voter.election_status,
    startAt: voter.start_at,
    endAt: voter.end_at,
    allowResultsVisibilityBeforeClose: voter.allow_results_visibility_before_close
  });

  if (electionPhase === "upcoming") {
    notifications.push({
      id: `${voter.election_id}:scheduled`,
      title: "انتخاب مجدول",
      message: `تمت جدولة انتخاب "${voter.election_title}" وسيبدأ قريبًا.`,
      type: "info",
      createdAt: voter.start_at,
      electionId: voter.election_id
    });
  }

  if (electionPhase === "active" && !voter.has_voted) {
    notifications.push({
      id: `${voter.election_id}:active`,
      title: "باب التصويت مفتوح",
      message: `يمكنك الآن التصويت في "${voter.election_title}".`,
      type: "election",
      createdAt: voter.start_at,
      electionId: voter.election_id
    });
  }

  if (voter.verified_face || latestTokenIssue) {
    notifications.push({
      id: `${voter.election_id}:verified`,
      title: "تم التحقق من الهوية",
      message: "أصبحت مؤهلًا لإتمام التصويت بعد نجاح التحقق من الهوية.",
      type: "success",
      createdAt: latestTokenIssue?.created_at || voter.updated_at,
      electionId: voter.election_id
    });
  }

  if (voter.has_voted || latestVoteCast) {
    notifications.push({
      id: `${voter.election_id}:vote_cast`,
      title: "تم تسجيل صوتك",
      message: `تم حفظ تصويتك في "${voter.election_title}" بنجاح.`,
      type: "success",
      createdAt: latestVoteCast?.created_at || voter.updated_at,
      electionId: voter.election_id
    });
  }

  if (
    canExposeResults({
      status: voter.election_status,
      startAt: voter.start_at,
      endAt: voter.end_at,
      allowResultsVisibilityBeforeClose: voter.allow_results_visibility_before_close
    })
  ) {
    notifications.push({
      id: `${voter.election_id}:results`,
      title: "النتائج متاحة",
      message: `يمكنك الآن الاطلاع على نتائج "${voter.election_title}".`,
      type: "info",
      createdAt: voter.end_at,
      electionId: voter.election_id
    });
  }

  return notifications.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}
