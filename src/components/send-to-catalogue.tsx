import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Notice, Section, TextField } from '@/components/ui';
import { useSendToCatalogue } from '@/data/mutations';
import { useSubmission } from '@/data/queries';
import { canSend } from '@/domain/submissions';
import { submissionNoteSchema } from '@/domain/validation';
import { toAppError } from '@/lib/errors';
import { space } from '@/theme/tokens';

/**
 * Lets a person share a product they added manually. Nothing leaves their library until they
 * do this, so the form says exactly who sees what before they send it (D22).
 */
export function SendToCatalogue({ personalProductId }: { personalProductId: string }) {
  const submission = useSubmission(personalProductId);
  const send = useSendToCatalogue(personalProductId);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();

  // This is an extra, so a failed lookup leaves the page as it was.
  if (submission.isPending || submission.isError) return null;
  const latest = submission.data;

  const submit = () => {
    const parsed = submissionNoteSchema.safeParse(note);
    if (!parsed.success) return setNoteError(parsed.error.issues[0]?.message);
    setNoteError(undefined);
    send.mutate({ note: parsed.data }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Section label="Catalogue">
      {latest?.status === 'pending' ? (
        <AppText variant="bodySoft">Waiting for review. It stays in your library either way.</AppText>
      ) : null}
      {latest?.status === 'approved' ? (
        <AppText variant="bodySoft">Added to the catalogue, so others can find it too. Your entry stays as it is.</AppText>
      ) : null}
      {latest?.status === 'rejected' ? (
        <AppText variant="bodySoft">
          {latest.reviewNote ? `Not added to the catalogue: ${latest.reviewNote}` : 'Not added to the catalogue.'}
        </AppText>
      ) : null}

      {canSend(latest) && !open ? (
        <>
          {latest === null ? (
            <AppText variant="bodySoft">Think others would want this? Send it to be added to the catalogue.</AppText>
          ) : null}
          <Button
            label={latest === null ? 'Send to catalogue' : 'Send again'}
            variant="secondary"
            onPress={() => setOpen(true)}
          />
        </>
      ) : null}

      {canSend(latest) && open ? (
        <View style={{ gap: space.md }}>
          <AppText variant="bodySoft">
            We’ll review its brand, name, shade or size and your photo, along with your email. Your notes and rating stay
            private.
          </AppText>
          <TextField
            label="Anything to add?"
            placeholder="Where you found it"
            value={note}
            onChangeText={setNote}
            error={noteError}
            multiline
            maxLength={500}
          />
          {send.isError ? <Notice>{toAppError(send.error).message}</Notice> : null}
          <Button label="Send" onPress={submit} loading={send.isPending} />
          <Button label="Cancel" variant="plain" onPress={() => setOpen(false)} disabled={send.isPending} />
        </View>
      ) : null}
    </Section>
  );
}
