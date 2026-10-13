/**
 * Shared Radix dialog shell sizing for large candidate forms (Call Notes extract review, etc.).
 * Create/Edit Candidate uses {@link CANDIDATE_CREATION_DIALOG_SHELL_CLASS} (wider xl+ for tab strip).
 */
const CANDIDATE_FORM_DIALOG_SHELL_BASE =
  "max-h-[95vh] flex flex-col gap-0 p-0 [&>button]:cursor-pointer"

export const CANDIDATE_FORM_DIALOG_SHELL_CLASS =
  `sm:max-w-[750px] lg:max-w-[850px] xl:max-w-[950px] ${CANDIDATE_FORM_DIALOG_SHELL_BASE}`

/** Wider at xl+ so section tabs fit without horizontal scroll (full labels from xl in dialog). */
export const CANDIDATE_CREATION_DIALOG_SHELL_CLASS =
  `sm:max-w-[750px] lg:max-w-[850px] xl:max-w-[min(1280px,95vw)] ${CANDIDATE_FORM_DIALOG_SHELL_BASE}`

export const CANDIDATE_FORM_DIALOG_HEADER_CLASS =
  "px-6 pt-6 pb-4 border-b border-border space-y-3"

export const CANDIDATE_FORM_DIALOG_FOOTER_CLASS =
  "px-6 py-4 border-t border-border gap-2"
