// Communication Layer — conversation threading.
//
// Real threading, not subject-matching: an inbound reply is attached to the SAME conversation as
// the message it answers, found via RFC headers (In-Reply-To / References) against the
// rfc_message_id we stored on our outbound (and prior inbound) messages. Only if no header link
// exists do we open a new conversation (anchored by the inbound Message-ID as thread_key). A
// weak subject/sender fallback is deliberately NOT used to auto-merge — it would cross wires.

// Resolve or create the conversation for an inbound message. Runs inside a caller transaction.
export async function resolveConversationTx(client, {
  rfcMessageId, inReplyTo, references, mailboxId, isPrivacy, contactId, organizationId, subject,
}) {
  const q = (t, p) => client.query(t, p);
  const candidates = [inReplyTo, ...(references || [])].filter(Boolean);
  if (candidates.length) {
    const hit = await q(
      `select conversation_id from message where rfc_message_id = any($1::text[])
       order by created_at desc limit 1`, [candidates]);
    if (hit.rows[0]) {
      // Re-open a closed thread on a new reply; keep linkage as-is.
      await q(`update conversation set status = case when status='CLOSED' then 'OPEN'::conv_status else status end,
               last_message_at = now(), updated_at = now() where id = $1`, [hit.rows[0].conversation_id]);
      return { id: hit.rows[0].conversation_id, created: false };
    }
  }
  // No header link → new conversation, anchored by the inbound Message-ID.
  const ins = await q(
    `insert into conversation(organization_id, contact_id, mailbox_id, is_privacy, subject,
        status, thread_key, match_confidence, last_message_at)
     values ($1,$2,$3,$4,$5,'NEW',$6,$7, now()) returning id`,
    [organizationId || null, contactId || null, mailboxId || null, !!isPrivacy, subject || null,
     rfcMessageId || null, contactId ? 'linked' : 'unlinked']);
  return { id: ins.rows[0].id, created: true };
}

// The References chain to send on an outbound reply: prior chain + the message being answered.
export function buildReferences(priorReferences, inReplyToMessageId) {
  const chain = [...(priorReferences || [])];
  if (inReplyToMessageId && !chain.includes(inReplyToMessageId)) chain.push(inReplyToMessageId);
  return chain;
}
