export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/** The latest time a person sent a product to be considered for the catalogue. */
export type Submission = {
  status: SubmissionStatus;
  /** Why it wasn't added, written by whoever reviewed it. */
  reviewNote: string | null;
};

/** Whether a product added manually can be sent now: never sent, or sent and not added. */
export const canSend = (submission: Submission | null) =>
  submission === null || submission.status === 'rejected';
